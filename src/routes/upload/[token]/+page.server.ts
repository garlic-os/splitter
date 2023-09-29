import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import StatusCodes from "http-status-codes";
import * as DB from "$lib/server/database";
import * as Config from "$config";


export const load = (({ params, setHeaders }) => {
	setHeaders({
		"cache-control": "max-age=60",
	});

	// Check if a file entry exists for this token, and that the file's
	// upload period has not expired.
	const fileEntry = DB.getFileByToken(params.token);
	if (!fileEntry || fileEntry.uploadExpiry < Date.now()) {
		throw error(StatusCodes.UNAUTHORIZED, "Invalid upload token");
	}
	return {
		token: params.token,
		fileSizeLimit: Config.fileSizeLimit,
	};
}) satisfies PageServerLoad;
