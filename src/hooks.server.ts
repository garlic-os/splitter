if (parseInt(process.env.REGISTER_COMMANDS ?? "0")) {
	await import("$lib/server/bot/register-commands");
	process.exit();
}
else {
	// Start the bot immediately; it has to be up even before the first request,
	// because it may well be the broker of the first request through a
	// /upload command.
	const { activateCommands } = await import("$lib/server/bot/activate-commands");
	activateCommands();

	// Start the CORS proxy for the GET /file/[fileID]/[filename] route.
	import("$lib/server/cors-proxy");
}

export {};
