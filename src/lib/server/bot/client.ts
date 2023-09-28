
import Discord from "discord.js";
import * as Config from "$config";

console.info("[BOT] Starting");
export const client = new Discord.Client({ intents: [] });

client.on(Discord.Events.ClientReady, async () => {
	console.log(`[BOT] Logged in as ${client.user!.tag}`);
});


function exit() {
	client.destroy();
	console.info("[BOT] Logged out");
}
process.on("exit", exit);
process.on("uncaughtException", exit);

// Under vite live reload, the Discord client doesn't get destroyed properly so
// we have to do it manually. A little horrorcode reaching into globalThis and
// sidestepping the type system but I guess this is fine since it won't happen
// in production.
if (process.env.NODE_ENV === "development") {
	if (globalThis.hasOwnProperty("client")) {
		console.info("Destroying old bot instance");
		(globalThis as any).client.destroy();
	}
	(globalThis as any).client = client;
}

await client.login(Config.discordBotToken);
