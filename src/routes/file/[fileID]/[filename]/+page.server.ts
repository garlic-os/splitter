import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import StatusCodes from "http-status-codes";
import * as Config from "$config";
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
	// Bypass CORS lmao
	const urls = DB.getURLs(params.fileID)
		.map(url => `${Config.corsProxyURL}/${url}`);
	if (urls.length === 0) {
		throw error(StatusCodes.NOT_FOUND, "Not found");
	}

	const metadata = DB.getMetadata(params.fileID);
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
