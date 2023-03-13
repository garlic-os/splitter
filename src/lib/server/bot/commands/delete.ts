import Discord from "discord.js";
import * as db from "$lib/server/database";
import * as bot from "$lib/server/bot";
import * as colors from "$lib/server/bot/colors";


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
	const metadata = DB.getMetadata(fileID);
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

	console.info(`[DELETE ${fileID}] New request`);

	// Delete the file entry from the database and delete the messages on
	// Discord that contained the file's parts.
	await interaction.deferReply();
	const urls = db.getURLs(fileID);
	const removalsInProgress: Promise<any>[] = [];
	let encounteredError = false;
	for (const url of urls) {
		// Extract the message ID from a Discord file URL. They look like this:
		// https://cdn.discordapp.com/attachments/1063656661908201552/1083462159545143346/hehe_cat.png.part1
		//                                            message id here ^^^^^^^^^^^^^^^^^^^
		const messageID = url.split("/").at(-2);
		if (!messageID) {
			console.error(new Error(`[DELETE ${fileID}] Corrupt file part URL: "${url}"`));
			encounteredError = true;
			continue;
		}
		const message = await uploadChannel.messages.fetch(messageID);
		if (!message) {
			console.error(new Error(`[DELETE ${fileID}] Invalid message ID "${messageID}"; from URL "${url}"`));
		const uploadChannel = await bot.getUploadChannel();
			encounteredError = true;
			continue;
		}
		removalsInProgress.push(message.delete());
	}

	const uploadNotificationID = db.getUploadNotificationID(fileID);
	if (!uploadNotificationID) {
		console.error(new Error(`[DELETE ${fileID}] Upload notification message ID not found for file ${fileID}`));
		encounteredError = true;
	} else {
		const uploadNotificationMessage = await interaction.channel?.messages
			.fetch(uploadNotificationID);
		if (!uploadNotificationMessage) {
			console.error(new Error(`[DELETE ${fileID}] Upload notification message ${uploadNotificationID} not found`));
			encounteredError = true;
		} else {
			removalsInProgress.push(uploadNotificationMessage.delete());
		}
	}

	db.deleteFile(fileID);
	await Promise.all(removalsInProgress);
	console.info(`[DELETE ${fileID}] Complete`);

	if (encounteredError) {
		await interaction.reply({
			ephemeral: true,
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

	await interaction.reply({
		ephemeral: true,
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
