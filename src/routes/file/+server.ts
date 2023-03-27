import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import StatusCodes from "http-status-codes";
import * as Config from "../../../config";
import * as db from "$lib/server/database";
import * as bot from "$lib/server/bot";
import SetSizeChunkStream from "$lib/server/set-size-chunk-stream";


// Merge the stream into Config.partSize chunks and upload each to Discord.
// Data may come in chunks of any size, but we want them to be Discord's
// max file size.
async function splitAndUpload(
	stream: ReadableStream<Uint8Array>,
	filename: string,
	fileEntry: Pick<DB.FileEntry, "id" | "uploadExpiry">,
): Promise<number> {
	// Pipe the stream into a SetSizeChunkStream to size-condition its chunks.
	const chunkStream = new SetSizeChunkStream(Config.partSize);
	const makingChunks = stream.pipeTo(chunkStream.writable);

	// Get the size-conditioned chunks and upload them to Discord.
	let bytesRead = 0;
	const uploadingChunks = (async () => {
		let partNumber = 0;
		const chunkReader = chunkStream.readable.getReader();
		const uploadPromises = [];
		while (true) {
			const result = await chunkReader.read();
			if (result.done) {
				console.info(`[UPLOAD ${fileEntry.id}] Chunk uploads complete`);
				break;
			}
			bytesRead += result.value.byteLength;
			partNumber++;
			uploadPromises.push(
				(async () => {
					const { messageID, url } = await bot.uploadToDiscord(
						Buffer.from(result.value),
						`${filename}.part${partNumber}`
					);
					db.addPart(fileEntry.id, messageID, url);
				})()
			);
			console.info(`[UPLOAD ${fileEntry.id}] Part ${partNumber}: ${result.value.byteLength} bytes`);
		}
		chunkReader.releaseLock();
		await Promise.all(uploadPromises);
	})();

	// Run the two above tasks in parallel.
	// (Or as parallel as you can get in node.js but you know)
	await Promise.all([makingChunks, uploadingChunks]);
	return bytesRead;
}


function reportUploadResult(fileID: string, filename: string, bytesRead: number) {
	const pendingUpload = db.pendingUploads[fileID];
	if (!pendingUpload) {
		console.error(`[${fileID}] No pending upload found`);
		db.deleteFile(fileID);
		throw error(StatusCodes.BAD_REQUEST);
	}

	// Verify that the file was not empty.
	if (bytesRead === 0) {
		pendingUpload.reject(new Error("File is empty"));
		throw error(StatusCodes.BAD_REQUEST, "File is empty");
	}

	// Tell the bot that the upload is complete.
	pendingUpload.resolve({
		filename: filename,
		filesize: bytesRead,
	});
}


export const PUT = (async ({ request }) => {
	const token = request.headers.get("authorization");
	const filename = request.headers.get("x-filename")?.replaceAll(" ", "_");
	const contentType = request.headers.get("content-type") ?? "application/octet-stream";
	const fileEntry = db.getFileByToken(token);

	if (!fileEntry || fileEntry.uploadExpiry < Date.now()) {
		throw error(StatusCodes.UNAUTHORIZED, "Invalid upload token");
	}
	if (!filename) {
		throw error(StatusCodes.BAD_REQUEST, `No filename provided - "X-Filename" header is missing`);
	}
	if (!request.body) {
		throw error(StatusCodes.BAD_REQUEST, "No file provided");
	}

	console.info(`[UPLOAD ${fileEntry.id}] Receiving file`);

	// Enter the file metadata we'll need into the database.
	db.setMetadata(fileEntry.id, filename, contentType);

	// Upload the file to Discord in parts.
	const bytesRead = await splitAndUpload(request.body, filename, fileEntry);
	db.closeUpload(fileEntry.id);
	reportUploadResult(fileEntry.id, filename, bytesRead);

	// Send the client this file's download link.
	return new Response(`/file/${fileEntry.id}/${filename}`, {
		status: StatusCodes.CREATED,
	});
}) satisfies RequestHandler;
