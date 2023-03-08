import type { SlashCommandHandler } from "./types";
import * as Discord from "discord.js";
import * as Config from "../../../../config";

// Grab the SlashCommandBuilder#toJSON() output of each command for deployment.
console.debug("Importing command modules...");
const modules = import.meta.glob("./commands/*", { eager: true });
const commands: Discord.RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
for (const module of Object.values(modules)) {
	commands.push(
		// Couldn't figure out how to verify these things' types. Just going
		// to assume they have the right properties and move on
		(module as SlashCommandHandler).data.toJSON()
	);
}

console.log(`🔃 Registering ${commands.length} application (/) commands...`);
const rest = new Discord.REST({ version: "10" });
rest.setToken(Config.discordBotToken);
const data = await rest.put(
	Discord.Routes.applicationCommands(Config.discordClientID),
	{ body: commands },
);

if (data instanceof Array) {
	// If the data is an array, it is an array of command objects
	// that were successfully registered.
	console.log(`✅ Successfully registered ${data.length} application (/) commands.`);
} else {
	// If the data is not an array, it is an error object.
	console.error(`❌ Failed to register application (/) commands: ${data}`);
}
