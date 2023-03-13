import Discord from "discord.js";
import * as DB from "$lib/server/database";
import * as Bot from "$lib/server/bot";


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
					.setColor(0xB71C1C)
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
	const urls = DB.getURLs(fileID);
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
		const uploadChannel = await Bot.getUploadChannel();
		const message = await uploadChannel.messages.fetch(messageID);
		if (!message) {
			console.error(new Error(`[DELETE ${fileID}] Invalid message ID "${messageID}"; from URL "${url}"`));
			encounteredError = true;
			continue;
		}
		removalsInProgress.push(message.delete());
	}

	const uploadNotificationID = DB.getUploadNotificationID(fileID);
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

	DB.deleteFile(fileID);
	await Promise.all(removalsInProgress);
	console.info(`[DELETE ${fileID}] Complete`);

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
	console.info(`[DELETE ${fileID}] Confirmation sent`);
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