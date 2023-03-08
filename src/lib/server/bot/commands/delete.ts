import Discord from "discord.js";
import * as DB from "$lib/server/database";


export const data = new Discord.SlashCommandBuilder()
	.setName("delete")
	.setDescription("Delete a file that you've uploaded.")
	.addStringOption( (option) =>
		option.setName("filename")
			.setDescription("Name of the file to delete")
			.setAutocomplete(true)
			.setRequired(true)
	);


// Usage: /delete <filename>
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
	console.debug(metadata.ownerID);
	console.debug(interaction.user.id);
	if (metadata.ownerID !== interaction.user.id) {
		await interaction.reply({
			ephemeral: true,
			embeds: [
				new Discord.EmbedBuilder()
					.setTitle("Couldn't delete")
					.setDescription("You are not the owner of this file.")
					.setColor(0xB71C1C)
					.addFields([
						{ name: "Filename", value: `\`${metadata.name}\``, inline: true },
						{ name: "ID", value: `\`${fileID}\``, inline: true }
					])
			]
		});
		return;
	}

	// Delete the file entry from the database and delete the messages on
	// Discord that contained the file's parts.
	await interaction.deferReply();
	const urls = DB.getURLs(fileID);
	const removalsInProgress: Promise<any>[] = [];
	let encounteredError = false;
	for (const url of urls) {
		const messageID = url.split("/").at(-2);
		if (!messageID) {
			console.error(new Error(`Corrupt file part URL: ${url}`));
			encounteredError = true;
			continue;
		}
		const message = await interaction.channel?.messages.fetch(messageID);
		if (!message) {
			console.error(new Error(`Message ${messageID} not found`));
			encounteredError = true;
			continue;
		}
		removalsInProgress.push(message.delete());
	}

	const uploadNotificationMessageID = DB.getUploadNotificationMessageID(fileID);
	if (!uploadNotificationMessageID) {
		console.error(new Error(`Upload notification message ID not found for file ${fileID}`));
		encounteredError = true;
	} else {
		const uploadNotificationMessage = await interaction.channel?.messages.fetch(uploadNotificationMessageID);
		if (!uploadNotificationMessage) {
			console.error(new Error(`Upload notification message ${uploadNotificationMessageID} not found`));
			encounteredError = true;
		} else {
			removalsInProgress.push(uploadNotificationMessage.delete());
		}
	}

	DB.deleteFile(fileID);
	await Promise.all(removalsInProgress);

	if (encounteredError) {
		await interaction.reply({
			ephemeral: true,
			embeds: [
				new Discord.EmbedBuilder()
					.setTitle("Couldn't delete")
					.setDescription("An error occurred while deleting the file.")
					.setColor(0xB71C1C)
					.addFields([
						{ name: "Filename", value: `\`${metadata.name}\``, inline: true },
						{ name: "ID", value: `\`${fileID}\``, inline: true }
					])
			]
		});
		return;
	}

	await interaction.reply({
		ephemeral: true,
		embeds: [
			new Discord.EmbedBuilder()
				.setTitle("File deleted")
				.setDescription("The file was deleted successfully.")
				.setColor(0x43A047)
				.addFields([
					{ name: "Filename", value: `\`${metadata.name}\``, inline: true },
					{ name: "ID", value: `\`${fileID}\``, inline: true }
				])
		]
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
		choices.map( (choice) => ({
			name: `${choice.name} (${choice.id})`,
			value: choice.id
		})),
	);
}
