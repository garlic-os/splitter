import Discord from "discord.js";
import * as db from "$lib/server/database";
import * as bot from "$lib/server/bot";
import * as colors from "$lib/server/bot/colors";


async function validateMetadata(
	interaction: Discord.ChatInputCommandInteraction,
	fileID: string,
	metadata: Partial<DB.FileEntry> | null
): Promise<void> {
	if (!metadata) {
		await interaction.reply({
			content: `File \`${fileID}\` not found.`,
			ephemeral: true,
		});
		return;
	}
	if (metadata.ownerID !== interaction.user.id) {
		await interaction.reply({
			ephemeral: true,
			embeds: [
				new Discord.EmbedBuilder()
					.setTitle("Couldn't delete")
					.setDescription("You are not the owner of this file.")
					.setColor(colors.red)
					.addFields([
						{ name: "Filename", value: `\`${metadata.name}\``, inline: true },
						{ name: "ID", value: `\`${fileID}\``, inline: true }
					])
			]
		});
		return;
	}
}


export const data = new Discord.SlashCommandBuilder()
	.setName("delete")
	.setDescription("Delete a file that you've uploaded.")
	.addStringOption( (option) => option
		.setName("filename")
		.setDescription("Name of the file to delete")
		.setAutocomplete(true)
		.setRequired(true)
	);


// Usage: /delete <filename>
// Uses Discord's chat command autocomplete feature to suggest filenames.
export async function execute(interaction: Discord.ChatInputCommandInteraction): Promise<void> {
	const fileID = interaction.options.getString("filename", true);
	const metadata = db.getMetadata(fileID);
	await validateMetadata(interaction, fileID, metadata);

	console.info(`[DELETE ${fileID}] New request`);

	const removalsInProgress: Promise<any>[] = [];
	let encounteredError = false;

	const uploadNotificationID = db.getUploadNotificationID(fileID);
	if (!uploadNotificationID) {
		console.error(`[DELETE ${fileID}] Upload notification message ID not found for file ${fileID}`);
		encounteredError = true;
	} else {
		debugger;
		const channel = interaction.channel ?? interaction.user.dmChannel!;
		try {
			const uploadNotificationMessage = await channel.messages.fetch(uploadNotificationID);
			removalsInProgress.push(uploadNotificationMessage.delete());
			console.debug(`[DELETE ${fileID}] Deleting notification message ${uploadNotificationID}`);
		} catch (err) {
			console.error(`[DELETE ${fileID}] Upload notification message ${uploadNotificationID} not found; API returned error:`, err);
			encounteredError = true;
		}
	}

	// Delete the file entry from the database and delete the messages on
	// Discord that contained the file's parts.
	await interaction.deferReply({ ephemeral: true });
	const parts = db.getParts(fileID);
	for (const { url, messageID } of parts) {
		const uploadChannel = await bot.getUploadChannel();
		try {
			const message = await uploadChannel.messages.fetch(messageID);
			removalsInProgress.push(message.delete());
			console.debug(`[DELETE ${fileID}] Deleting message ${messageID}`);
		} catch (err) {
			console.error(`[DELETE ${fileID}] Invalid message ID "${messageID}" from URL "${url}"; API returned error:`, err);
			encounteredError = true;
			continue;
		}
	}

	db.deleteFile(fileID);
	await Promise.all(removalsInProgress);

	if (encounteredError) {
		console.warn(`[DELETE ${fileID} Complete with errors]`);
		await interaction.editReply({
			embeds: [
				new Discord.EmbedBuilder()
					.setTitle("Couldn't delete")
					.setDescription("An error occurred while deleting the file.")
					.setColor(colors.red)
					.addFields([
						{ name: "Filename", value: `\`${metadata!.name}\``, inline: true },
						{ name: "ID", value: `\`${fileID}\``, inline: true },
					])
			]
		});
		return;
	}

	console.info(`[DELETE ${fileID}] Complete`);
	await interaction.editReply({
		embeds: [
			new Discord.EmbedBuilder()
				.setTitle("File deleted")
				.setDescription("The file was deleted successfully.")
				.setColor(colors.green)
				.addFields([
					{ name: "Filename", value: `\`${metadata!.name}\``, inline: true },
					{ name: "ID", value: `\`${fileID}\``, inline: true },
				])
		]
	});
	console.info(`[DELETE ${fileID}] Confirmation sent`);
};


// https://discordjs.guide/slash-commands/autocomplete.html#sending-results
export async function autocomplete(interaction: Discord.AutocompleteInteraction) {
	const choices = db.getFilenamesAndIDByAuthorID(
		interaction.user.id,
		interaction.options.getFocused()
	);
	await interaction.respond(
		choices.map( (choice) => ({
			name: `${choice.name} (${choice.id})`,
			value: choice.id
		})),
	);
}
