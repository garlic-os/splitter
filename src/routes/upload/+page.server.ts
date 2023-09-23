import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import StatusCodes from "http-status-codes";

export const load = ((/*{ params }*/) => {
	throw error(StatusCodes.UNAUTHORIZED, "No upload token provided");
}) satisfies PageServerLoad;