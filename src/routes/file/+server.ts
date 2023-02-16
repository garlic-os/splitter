import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import StatusCodes from "http-status-codes";
import * as Config from "$lib/server/config";
import * as DB from "$lib/server/database";
import * as bot from "$lib/server/bot";
 

export const PUT = (async ({ request }) => {
	const token = request.headers.get("authorization");
	const fileEntry = DB.getFileByToken(token);

	const formData = await request.formData();
	// const formData = await request.formData({
	// 	limits: {
	// 		fileSize: Config.fileSizeLimit,
	// 		files: 1,
	// 		fields: 0,
	// 	}
	// });
	if (!(formData.get("file") instanceof File)) {
		throw error(StatusCodes.BAD_REQUEST);
	}

	// Check if the file is valid and its upload window hasn't passed.
	if (!fileEntry || fileEntry.upload_expiry < Date.now()) {
		throw error(StatusCodes.UNAUTHORIZED);
	}

	console.log("Receiving file ID:", fileEntry.id);

	// Set the file's name in the database.
	const file = formData.get("file") as File;
	const filename = file.name.replaceAll(" ", "_");
	DB.setFileName(fileEntry.id, filename);

	// Upload the file to Discord in parts.
	let partNumber = 0;
	let bytesRead = 0;
	let chunk: Buffer | null = null;

	file.pause();  // Enables the .read() method
	file.on("readable", async () => {
		while (null !== (chunk = file.read(Config.partSize))) {
			bytesRead += chunk.byteLength;
			const url = await bot.uploadToDiscord(
				chunk,
				`${filename}.part${partNumber++}`
			);
			DB.addPart(fileEntry.id, url);
		}
	});

	file.on("end", () => {
		const pendingUpload = DB.pendingUploads.get(fileEntry.id);
		if (!pendingUpload) {
			console.warn("No pending upload found for file", fileEntry.id);
			// TODO: Delete the file entry
			throw error(StatusCodes.BAD_REQUEST);
		}

		DB.disableUpload(fileEntry.id);

		if (bytesRead > 0) {
			// Tell the bot that the upload is complete.
			pendingUpload.resolve({
				filename: filename,
				filesize: bytesRead,
			});

			// Send the client this file's download link.
			return new Response(`/file/${fileEntry.id}/${filename}`, {
				status: StatusCodes.CREATED,
			});
		} else {
			// The file was empty.
			pendingUpload.reject(new Error("File was empty"));
			throw error(StatusCodes.BAD_REQUEST);
		}
	});
}) satisfies RequestHandler;
