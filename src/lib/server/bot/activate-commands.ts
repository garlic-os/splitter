import Discord from "discord.js";
import { commands } from "./commands";
import { client } from "./client";


// Handle slash commands, including autocomplete events.
export function activateCommands() {
	client.on(Discord.Events.InteractionCreate, async (interaction: Discord.Interaction) => {
		if (interaction.isChatInputCommand()) {
			const command = commands.get(interaction.commandName);
			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}
			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(error);
				await interaction.reply({
					content: "There was an error while executing this command!",
					ephemeral: true
				});
			}

		} else if (interaction.isAutocomplete()) {
			const command = commands.get(
				interaction.commandName
			) as Bot.AutocompleteCommandHandler | undefined;
			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}
			try {
				await command.autocomplete(interaction);
			} catch (error) {
				console.error(error);
			}
		}
	});
}
