
import Discord from "discord.js";
import * as Config from "../../../../config";

export const client = new Discord.Client({ intents: [] });

client.on(Discord.Events.ClientReady, async () => {
	console.log(`Bot logged in as ${client.user!.tag}`);
});

process.on("exit", () => {
	client.destroy();
});

await client.login(Config.discordBotToken);
