import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import StatusCodes from "http-status-codes";
import * as Config from "$lib/server/config";
import * as DB from "$lib/server/database";
import * as bot from "$lib/server/bot";


/**
 * Splits or merge the incoming stream into chunks of the given size.
 */
class SetSizeChunkStream extends TransformStream<Uint8Array, Uint8Array> {
	private buffer: Uint8Array;
	private offset: number;

	constructor(size: number) {
		super({
			transform: (chunk, controller) => {
				// Copy the chunk into the buffer.
				this.buffer.set(chunk, this.offset);
				this.offset += chunk.byteLength;

				// If the buffer is full, send it to the next stream.
				if (this.offset === size) {
					controller.enqueue(this.buffer);
					this.buffer = new Uint8Array(size);
					this.offset = 0;
				}
			},
			flush: (controller) => {
				// Send the remaining data to the next stream.
				if (this.offset > 0) {
					controller.enqueue(this.buffer.subarray(0, this.offset));
				}
			},
		});

		this.buffer = new Uint8Array(size);
		this.offset = 0;
	}
}


// Merge the stream into Config.partSize chunks and upload each to Discord.
// Data may come in chunks of any size, but we want them to be Discord's
// max file size.
async function splitAndUpload(
	stream: ReadableStream<Uint8Array>,
	filename: string,
	fileEntry: Pick<DB.FileEntry, "id" | "uploadExpiry">,
): Promise<number> {
	console.debug("Reading stream...");
	const originalReader = stream.getReader();
	const chunkStream = new SetSizeChunkStream(Config.partSize);
	const chunkWriter = chunkStream.writable.getWriter();
	const chunkReader = chunkStream.readable.getReader();
	let bytesRead = 0;

	// Pipe each chunk to the SetSizeChunkStream.
	const makingChunks = (async () => {
		while (true) {
			const result = await originalReader.read();
			if (result.done) {
				console.debug("Chunk conditioning complete");
				break;
			}
			await chunkWriter.write(result.value);
		}
		chunkWriter.close();
	})();

	// Upload the size-conditioned chunks to Discord.
	const uploadingChunks = (async () => {
		let partNumber = 0;
		const uploadPromises = [];
		while (true) {
			const result = await chunkReader.read();
			if (result.done) {
				console.debug("Chunk uploads complete");
				break;
			}
			bytesRead += result.value.byteLength;
			partNumber++;
			uploadPromises.push(
				bot.uploadToDiscord(
					Buffer.from(result.value),
					`${filename}.part${partNumber}`
				)
			);
		}
		chunkReader.releaseLock();
		const urls = await Promise.all(uploadPromises);
		DB.setPartURLs(fileEntry.id, urls);
	})();

	await Promise.all([makingChunks, uploadingChunks]);
	originalReader.releaseLock();
	return bytesRead;
}


function reportUploadResult(fileID: bigint, filename: string, bytesRead: number) {
	const pendingUpload = DB.pendingUploads.get(fileID);
	if (!pendingUpload) {
		console.warn("No pending upload found for file", fileID);
		// TODO: Delete the file entry
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
	const fileEntry = DB.getFileByToken(token);

	if (!fileEntry || fileEntry.uploadExpiry < Date.now()) {
		throw error(StatusCodes.UNAUTHORIZED, "Invalid upload token");
	}
	if (!filename) {
		throw error(StatusCodes.BAD_REQUEST, 'No filename provided - "X-Filename" header is missing');
	}
	if (!request.body) {
		throw error(StatusCodes.BAD_REQUEST, "No file provided");
	}

	console.log("Receiving file ID:", fileEntry.id);

	// Enter the file metadata we'll need into the database.
	DB.setMetadata(fileEntry.id, filename, contentType);

	// Upload the file to Discord in parts.
	const bytesRead = await splitAndUpload(request.body, filename, fileEntry);
	DB.disableUpload(fileEntry.id);

	reportUploadResult(fileEntry.id, filename, bytesRead);

	// Send the client this file's download link.
	return new Response(`/file/${fileEntry.id}/${filename}`, {
		status: StatusCodes.CREATED,
	});
}) satisfies RequestHandler;
