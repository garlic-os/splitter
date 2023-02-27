import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import StatusCodes from "http-status-codes";
import * as Config from "$lib/server/config";
import * as DB from "$lib/server/database";


function getGeneralContentType(
	contentType: string
): "video" | "image" | "audio" | "text" | "other" {
	const type = contentType.split("/")[0];
	switch (type) {
		case "video":
		case "image":
		case "audio":
		case "text":
			return type;
		default:
			return "other";
	}
}


export const load = (({ params }) => {
	const fileID = BigInt(params.fileID);

	// Bypass CORS lmao
	const urls = DB.getPartURLs(fileID)
		?.map(url => `${Config.corsProxyURL}/${url}`);
	if (!urls || urls?.length === 0) {
		throw error(StatusCodes.NOT_FOUND, "Not found");
	}

	const metadata = DB.getMetadata(fileID);
	if (!metadata || params.filename !== metadata.name) {
		throw error(StatusCodes.NOT_FOUND, "Not found");
	}
	return {
		filename: metadata.name,
		contentType: metadata.contentType,
		type: getGeneralContentType(metadata.contentType),
		urls: urls
	};
}) satisfies PageServerLoad;
