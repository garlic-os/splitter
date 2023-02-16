import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import StatusCodes from "http-status-codes";
import * as DB from "$lib/server/database";


export const load = (({ params }) => {
	// Check if a file entry exists for this token, and that the file's
	// upload period has not expired.
	const fileEntry = DB.getFileByToken(params.token);
	if (!fileEntry || fileEntry.upload_expiry < Date.now()) {
		throw error(StatusCodes.UNAUTHORIZED, "Invalid upload token");
	}
}) satisfies PageServerLoad;
