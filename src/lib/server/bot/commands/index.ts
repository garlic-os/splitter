import Discord from "discord.js";

// Load all the commands in the commands directory
// (making sure to skip this file itself).
// BEWARE: Bypassing the type system here.
export const commands: Discord.Collection<string, Bot.SlashCommandHandler> = new Discord.Collection();
const modules = import.meta.glob(
	["./*", "!./index"],
	{ eager: true }
) as Record<string, Bot.SlashCommandHandler>;

for (const command of Object.values(modules)) {
	commands.set(command.data.name, command);
}
