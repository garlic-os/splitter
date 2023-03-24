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


// I LOVE HANDLING ERRORS!!! I LOVE CHECKING FOR NULL!!!
async function getNotificationMessage(
	interaction: Discord.ChatInputCommandInteraction,
	fileID: string
): Promise<Discord.Message> {
	const uploadInfo = db.getUploadInfo(fileID);
	if (!uploadInfo) {
		throw `[DELETE ${fileID}] Upload info not found for file ${fileID}`;
	}

	const { channelID, uploadNotifID } = uploadInfo;
	if (!channelID || !uploadNotifID) {
		throw `[DELETE ${fileID}] Missing upload info ${JSON.stringify(uploadInfo)}`;
	}

	const uploadNotifChannel = await interaction.client.channels.fetch(channelID);
	if (!(uploadNotifChannel instanceof Discord.TextChannel)) {
		throw `[DELETE ${fileID}] Invalid notification channel ID ${channelID}`;
	}

	console.debug(`[DELETE ${fileID}] Deleting notification message ${uploadNotifID}`);
	try {
		return await uploadNotifChannel.messages.fetch(uploadNotifID);
	} catch (err: any) {
		throw `[DELETE ${fileID}] Upload notification message ${uploadNotifID} not found; API returned error: ${err.message}`;
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

	// Delete the upload notification message.
	try {
		const message = await getNotificationMessage(interaction, fileID);
		removalsInProgress.push(message.delete());
	} catch (err) {
		console.error(err);
		encounteredError = true;
	}

	// Delete the messages on Discord that contained the file's parts.
	await interaction.deferReply({ ephemeral: true });
	const partEntries = db.getParts(fileID);
	for (const { url, messageID } of partEntries) {
		console.info(`[DELETE ${fileID}] Deleting message ${messageID}`);
		const uploadChannel = await bot.getUploadChannel();
		try {
			const message = await uploadChannel.messages.fetch(messageID);
			removalsInProgress.push(message.delete());
		} catch (err) {
			console.error(`[DELETE ${fileID}] Invalid message ID "${messageID}" from URL "${url}"; API returned error:`, err);
			encounteredError = true;
			continue;
		}
	}

	// Delete the file entry from the database.
	db.deleteFile(fileID);

	try {
		await Promise.all(removalsInProgress);
	} catch (err) {
		console.error(`[DELETE ${fileID}] Error while deleting messages:`, err);
		encounteredError = true;
	}

	if (encounteredError) {
		console.warn(`[DELETE ${fileID}] Complete with errors]`);
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
}


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
