import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import StatusCodes from "http-status-codes";
import * as Config from "$lib/server/config";
import * as DB from "$lib/server/database";
import * as bot from "$lib/server/bot";


async function readStream(
	reader: ReadableStreamBYOBReader,
	buffer: ArrayBuffer,
	filename: string,
	fileEntry: Pick<DB.FileEntry, "id" | "upload_expiry">,
): Promise<number> {
	let bytesReceived = 0;
	let offset = 0;
	let partNumber = 0;

	while (true) {
		const view = new Uint8Array(buffer, offset, buffer.byteLength - offset);
		const result = await reader.read(view);
		if (result.done) {
			console.debug(`readStream() complete. Total bytes: ${bytesReceived}`);
			return bytesReceived;
		}
	
		buffer = result.value.buffer;
		offset += result.value.byteLength;
		bytesReceived += result.value.byteLength;
		console.debug(`Read ${bytesReceived} bytes`);

		const url = await bot.uploadToDiscord(
			// Buffer.from(buffer, 0, offset),
			Buffer.from(buffer),
			`${filename}.part${partNumber++}`
		);
		DB.addPart(fileEntry.id, url);
	}
}
 

export const PUT = (async ({ request }) => {
	const token = request.headers.get("authorization");
	const filename = request.headers.get("x-filename")?.replaceAll(" ", "_");
	const fileEntry = DB.getFileByToken(token);

	if (!fileEntry || fileEntry.upload_expiry < Date.now()) {
		throw error(StatusCodes.UNAUTHORIZED, "Invalid upload token");
	}
	if (!filename) {
		throw error(StatusCodes.BAD_REQUEST, 'No filename provided - "X-Filename" header missing');
	}
	if (!request.body) {
		throw error(StatusCodes.BAD_REQUEST, "No file provided");
	}

	console.log("Receiving file ID:", fileEntry.id);

	// Set the file's name in the database.
	DB.setFileName(fileEntry.id, filename);

	// Upload the file to Discord in parts.
	const buffer = new ArrayBuffer(Config.partSize);
	const reader = request.body.getReader({mode: "byob"});
	const bytesRead = await readStream(reader, buffer, filename, fileEntry);

	const pendingUpload = DB.pendingUploads.get(fileEntry.id);
	if (!pendingUpload) {
		console.warn("No pending upload found for file", fileEntry.id);
		// TODO: Delete the file entry
		throw error(StatusCodes.BAD_REQUEST);
	}

	DB.disableUpload(fileEntry.id);

	if (bytesRead === 0) {
		pendingUpload.reject(new Error("File is empty"));
		throw error(StatusCodes.BAD_REQUEST, "File is empty");
	}

	// Tell the bot that the upload is complete.
	pendingUpload.resolve({
		filename: filename,
		filesize: bytesRead,
	});

	// Send the client this file's download link.
	return new Response(`/file/${fileEntry.id}/${filename}`, {
		status: StatusCodes.CREATED,
	});
}) satisfies RequestHandler;
