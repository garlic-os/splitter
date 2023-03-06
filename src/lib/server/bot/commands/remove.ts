import Discord from "discord.js";
import * as DB from "$lib/server/database";


export const data = new Discord.SlashCommandBuilder()
	.setName("upload")
	.setDescription("Upload a file beyond the Discord file size limit.")
	.addStringOption( (option) =>
		option.setName("filename")
			.setDescription("Name of the file to delete")
			.setAutocomplete(true));


// Usage: /upload <filename>
// Uses Discord's chat command autocomplete feature to suggest filenames.
export const execute = async (interaction: Discord.ChatInputCommandInteraction): Promise<void> => {
	const fileID = interaction.options.getString("filename", true);
	const metadata = DB.getMetadata(fileID);
	if (!metadata) {
		await interaction.reply({
			content: `File \`${fileID}\` not found.`,
			ephemeral: true,
		});
		return;
	}
	if (metadata.ownerID !== interaction.user.id) {
		await interaction.reply({
			content: `You are not the owner of \`${metadata.name}\`.`,
			ephemeral: true,
		});
		return;
	}

	// Delete the file entry from the database and delete the messages on
	// Discord that contained the file's parts.
	await interaction.deferReply();
	const urls = DB.getURLs(fileID);
	const removalsInProgress = [];
	for (const url of urls) {
		const message = await interaction.channel?.messages.fetch(url);
		if (message) {
			removalsInProgress.push(message.delete());
		}
	}
	await Promise.all(removalsInProgress);
	DB.removeFile(fileID);

	await interaction.reply({
		content: `File \`${metadata.name}\` deleted.`,
		ephemeral: true,
	});
};


// https://discordjs.guide/slash-commands/autocomplete.html#sending-results
export async function autocomplete(interaction: Discord.AutocompleteInteraction) {
	const focusedValue = interaction.options.getFocused();
	const choices = DB.getFilenamesAndIDByAuthorID(
		interaction.user.id,
		focusedValue
	);
	await interaction.respond(
		choices.map(choice => ({
			name: `${choice.name} (${choice.id})`,
			value: choice.id
		})),
	);
}
