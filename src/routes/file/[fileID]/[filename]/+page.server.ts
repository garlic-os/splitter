import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import StatusCodes from "http-status-codes";
import * as Config from "$lib/server/config";
import * as DB from "$lib/server/database";


export const load = (({ params }) => {
	const fileID = BigInt(params.fileID);

	// Bypass CORS lmao
	const urls = DB.getPartURLs(fileID)
		?.map(url => `//localhost:${Config.corsProxyPort}/${url}`);

	if (!urls || urls?.length === 0) {
		throw error(StatusCodes.NOT_FOUND, "Not found");
	}
	const filename = DB.getFileName(fileID);

	if (params.filename !== filename) {
		throw error(StatusCodes.NOT_FOUND, "Not found");
	}

	return { filename, urls };
}) satisfies PageServerLoad;
