import Discord from "discord.js";
import * as db from "$lib/server/database";
import { deleteFile } from "$lib/server/bot/utils/delete-file";


async function validateMetadata(
	interaction: Discord.ChatInputCommandInteraction,
	fileID: string,
	metadata: Partial<DB.FileEntry> | null
): Promise<void> {
	if (!metadata) {
		console.info(`[DELETE ${fileID}] Canceled: file not found`)
		await interaction.reply({
			content: `File \`${fileID}\` not found.`,
			ephemeral: true,
		});
		return;
	}
	if (metadata.ownerID !== interaction.user.id) {
		console.info(`[DELETE ${fileID}] Canceled: not owner`)
		await interaction.reply({
			ephemeral: true,
			embeds: [
				new Discord.EmbedBuilder()
					.setTitle("Couldn't delete")
					.setDescription("You are not the owner of this file.")
					.setColor(Discord.Colors.Red)
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


export async function execute(interaction: Discord.ChatInputCommandInteraction): Promise<void> {
	const fileID = interaction.options.getString("filename", true);
	console.info(`[DELETE ${fileID}] New request`);

	const metadata = db.getMetadata(fileID);
	await validateMetadata(interaction, fileID, metadata);

	const row = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId("delete-cancel")
				.setLabel("Cancel")
				.setStyle(Discord.ButtonStyle.Secondary),
			new Discord.ButtonBuilder()
				.setCustomId("delete-confirm")
				.setLabel("Delete")
				.setStyle(Discord.ButtonStyle.Danger),
		);

	const sentMessage = await interaction.reply({
		embeds: [
			new Discord.EmbedBuilder()
				.setTitle("Delete file")
				.setDescription("Are you sure you want to delete this file?")
				.setColor(Discord.Colors.Red)
				.addFields([
					{ name: "Filename", value: `\`${metadata!.name}\``, inline: true },
					{ name: "ID", value: `\`${fileID}\``, inline: true },
				])
		],
		components: [row],
		ephemeral: true,
	});

	const buttonEvent = await sentMessage.awaitMessageComponent<Discord.ComponentType.Button>({
		time: 15_000,
	});

	if (buttonEvent.customId === "delete-cancel") {
		console.info(`[DELETE ${fileID}] Canceled by user`);
		interaction.deleteReply();
		return;
	}

	await buttonEvent.deferReply();
	const encounteredError = await deleteFile(interaction.client, fileID);

	if (encounteredError) {
		console.warn(`[DELETE ${fileID}] Complete with errors`);
		await buttonEvent.editReply({
			embeds: [
				new Discord.EmbedBuilder()
					.setTitle("Couldn't delete")
					.setDescription("An error occurred while deleting the file.")
					.setColor(Discord.Colors.Red)
					.addFields([
						{ name: "Filename", value: `\`${metadata!.name}\``, inline: true },
						{ name: "ID", value: `\`${fileID}\``, inline: true },
					])
			]
		});
		return;
	}

	console.info(`[DELETE ${fileID}] Complete`);
	await buttonEvent.editReply({
		embeds: [
			new Discord.EmbedBuilder()
				.setTitle("File deleted")
				.setDescription("The file was deleted successfully.")
				.setColor(Discord.Colors.Greyple)
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
