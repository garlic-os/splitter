import type { PageLoad } from "./$types";


export const load = (({ params }) => {
	return {
		token: params.token,
	};
}) satisfies PageLoad;
