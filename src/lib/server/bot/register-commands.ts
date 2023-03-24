import * as Discord from "discord.js";
import * as Config from "../../../../config";
import { commands } from "$lib/server/bot/commands";

// Grab the SlashCommandBuilder#toJSON() output of each command for deployment.
const jsonBodies: Discord.RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
for (const command of commands.values()) {
	jsonBodies.push(
		command.data.toJSON()
	);
}

console.log(`🔃 Registering ${jsonBodies.length} slash commands...`);
const rest = new Discord.REST({ version: "10" });
rest.setToken(Config.discordBotToken);
const data = await rest.put(
	Discord.Routes.applicationCommands(Config.discordClientID),
	{ body: jsonBodies },
);

if (data instanceof Array) {
	// If the data is an array, it is an array of command objects
	// that were successfully registered.
	console.log(`✅ Successfully registered ${data.length} slash commands.`);
} else {
	// If the data is not an array, it is an error object.
	console.error(`❌ Failed to register slash commands: ${data}`);
}
