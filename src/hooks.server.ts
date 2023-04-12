if (parseInt(process.env.REGISTER_COMMANDS ?? "0")) {
	await import("$lib/server/bot/register-commands");
	process.exit();
}
else {
	// Start the bot immediately. Otherwise it will be lazy-loaded when the
	// first request comes in, and that isn't going to work when it provides
	// authentication to the API.
	const { activateCommands } = await import("$lib/server/bot/activate-commands");
	activateCommands();
}

export {};
