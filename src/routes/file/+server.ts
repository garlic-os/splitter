import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import StatusCodes from "http-status-codes";
import * as Config from "$config";
import * as db from "$lib/server/database";
import ChunkUploader from "$lib/server/chunk-uploader";


function reportUploadResult(
	fileID: string,
	filename: string,
	bytesRead: number
): void {
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
	const filename = decodeURIComponent(request.headers.get("x-filename") ?? "").replaceAll(" ", "_");
	const contentType = request.headers.get("content-type") ?? "application/octet-stream";
	const contentLength = parseInt(request.headers.get("content-length") ?? "");
	const fileEntry = db.getFileByToken(token);

	if (!fileEntry || fileEntry.uploadExpiry < Date.now()) {
		throw error(StatusCodes.UNAUTHORIZED, "Invalid upload token");
	}
	if (!filename) {
		throw error(StatusCodes.BAD_REQUEST, `No filename provided - "X-Filename" header is missing`);
	}
	if (isNaN(contentLength)) {
		throw error(StatusCodes.LENGTH_REQUIRED, `No content length provided - "Content-Length" header is missing`);
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

	// Upload the file to Discord in chunks.
	const uploader = new ChunkUploader(request.body, filename, fileEntry.id);
	const bytesRead = await uploader.run();
	db.closeUpload(fileEntry.id);
	reportUploadResult(fileEntry.id, filename, bytesRead);

	// Send the client this file's download link.
	return new Response(`/file/${fileEntry.id}/${filename}`, {
		status: StatusCodes.CREATED,
	});
}) satisfies RequestHandler;
