import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import StatusCodes from "http-status-codes";
import tempy from "tempy";
import * as Config from "$config";
import * as db from "$lib/server/database";
import * as bot from "$lib/server/bot";
import StreamSlicer from "$lib/server/stream-slicer";


// @pre: filePaths.length <= 10
async function uploadParts(
	filePaths: string[],
	filename: string,
	partIndex: number,
	fileID: DB.FileEntry["id"]
): Promise<void> {
	const filenames = [];
	for (let i = 0; i < filePaths.length; i++) {
		filenames.push(`${filename}.part${partIndex + i}`);
	}
	const { messageID, urls } = await bot.uploadToDiscord(filePaths, filenames);
	db.addParts(fileID, messageID, urls);
}


/**
 * Make Config.partSize-sized chunks out of a stream and upload them to Discord.
 * Parts are uploaded 10 at a time (the number of attachments you can have
 * in one message).
 * @returns the number of bytes read from the stream.
 */
async function splitAndUpload(
	stream: ReadableStream<Uint8Array>,
	filename: string,
	fileEntry: Pick<DB.FileEntry, "id" | "uploadExpiry">,
): Promise<number> {
	// Pipe the stream into a StreamSlicer to size-condition its chunks.
	const chunkStream = new StreamSlicer(Config.partSize);
	const makingChunks = stream.pipeTo(chunkStream.writable);

	// Get the size-conditioned chunks and upload them to Discord.
	let bytesRead = 0;
	const uploadingChunks = (async () => {
		let partIndex = 0;
		const chunkReader = chunkStream.readable.getReader();
		const filePaths = [];

		let result: ReadableStreamReadResult<Uint8Array>;
		while (!(result = await chunkReader.read()).done) {
			bytesRead += result.value.byteLength;
			filePaths.push(await tempy.temporaryWrite(result.value));
			if (filePaths.length >= 10) {
				await uploadParts(filePaths, filename, partIndex, fileEntry.id);
				partIndex += filePaths.length - 1;
				filePaths.length = 0;
			}
			console.info(`[UPLOAD ${fileEntry.id}] Part ${partIndex}: ${result.value.byteLength} bytes`);
		}

		if (filePaths.length > 0) {
			await uploadParts(filePaths, filename, partIndex, fileEntry.id);
		}

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
	const contentLength = parseInt(request.headers.get("content-length") ?? "");
	const fileEntry = db.getFileByToken(token);

	if (!fileEntry || fileEntry.uploadExpiry < Date.now()) {
		throw error(StatusCodes.UNAUTHORIZED, "Invalid upload token");
	}
	if (!filename) {
		throw error(StatusCodes.BAD_REQUEST, `No filename provided - "X-Filename" header is missing`);
	}
	if (!contentLength) {
		throw error(StatusCodes.BAD_REQUEST, `No content length provided - "Content-Length" header is missing`);
	}
	if (contentLength > Config.fileSizeLimit) {
		throw error(StatusCodes.BAD_REQUEST, `File is too large - ${contentLength} bytes`);
	}
	if (!request.body) {
		throw error(StatusCodes.BAD_REQUEST, "No file provided");
	}

	console.info(`[UPLOAD ${fileEntry.id}] Receiving file: "${filename}", ${contentLength} bytes`);

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
