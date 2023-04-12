import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import StatusCodes from "http-status-codes";
import * as Config from "$config";
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

		let result: ReadableStreamReadResult<Uint8Array>;
		while (!(result = await chunkReader.read()).done) {
			bytesRead += result.value.byteLength;
			partNumber++;
			const { messageID, url } = await bot.uploadToDiscord(
				Buffer.from(result.value),
				`${filename}.part${partNumber}`
			);
			db.addPart(fileEntry.id, messageID, url);

			// 1. Write buffer to temp file
			// 2. Accumulate 10 temp files
			// 3. Upload them all to Discord in one message
			//    - Change bot.uploadToDiscord to accept an array of filepaths
			// 4. Receive the 10 attachment URLs
			// 5. Add each part to the database in one query
			//    - Replace db.AddPart with db.AddParts
			console.info(`[UPLOAD ${fileEntry.id}] Part ${partNumber}: ${result.value.byteLength} bytes`);
		}
		// 1. Check for leftover accumulated temp files
		// 2. Upload them

		console.info(`[UPLOAD ${fileEntry.id}] Chunk uploads complete`);
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
