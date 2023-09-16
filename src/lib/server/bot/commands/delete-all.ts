import Discord from "discord.js";
import * as db from "$lib/server/database";
import { deleteFile } from "$lib/server/bot/utils/delete-file";


export const data = new Discord.SlashCommandBuilder()
	.setName("delete-all")
	.setDescription("Delete every file you've uploaded through Splitter.");


export async function execute(interaction: Discord.ChatInputCommandInteraction): Promise<void> {
	console.info(`[DELETE ALL ${interaction.user.id}] New request`);
	const row = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId("delete-all-cancel")
				.setLabel("Cancel")
				.setStyle(Discord.ButtonStyle.Secondary),
			new Discord.ButtonBuilder()
				.setCustomId("delete-all-confirm")
				.setLabel("Delete all files")
				.setStyle(Discord.ButtonStyle.Danger),
		);

	const sentMessage = await interaction.reply({
		embeds: [
			new Discord.EmbedBuilder()
				.setTitle("Delete all files")
				.setDescription("Are you sure you want to delete all of your files?\n**This action cannot be undone.**")
				.setColor(Discord.Colors.Red)
		],
		components: [row],
		ephemeral: true,
	});

	const buttonEvent = await sentMessage.awaitMessageComponent<Discord.ComponentType.Button>({
		time: 15_000,
	});

	if (buttonEvent.customId === "delete-all-cancel") {
		console.info(`[DELETE ALL ${interaction.user.id}] Canceled by user`);
		interaction.deleteReply();
		return;
	}

	await buttonEvent.deferReply();
	const files = db.getFilesByOwnerID(interaction.user.id);

	if (files.length === 0) {
		await buttonEvent.editReply("❌ You don't have any files to delete.");
		return;
	}

	const erroredFileIDs: string[] = [];

	for (const file of files) {
		const encounteredError = await deleteFile(interaction.client, file.id);
		if (encounteredError) {
			console.warn(`[DELETE ALL ${file.id}] Complete with errors`);
			erroredFileIDs.push(file.id);
		} else {
			console.info(`[DELETE ALL ${file.id}] Complete`);
		}
	}

	if (erroredFileIDs.length > 0) {
		// List the files that couldn't be deleted, up to 20,
		// then say "and X more" if there are more than 20.
		await buttonEvent.editReply({
			embeds: [
				new Discord.EmbedBuilder()
					.setTitle("Couldn't delete")
					.setDescription("An error occurred while deleting these files:")
					.setColor(Discord.Colors.Red)
					.addFields([
						{
							name: "Files",
							value: erroredFileIDs.slice(0, 20).map((id) => `\`${id}\``).join("\n") +
								(erroredFileIDs.length > 20 ? `\n...and ${erroredFileIDs.length - 20} more` : "")
						}
					])
			]
		});
		return;
	}

	await buttonEvent.editReply({
		embeds: [
			new Discord.EmbedBuilder()
				.setTitle("All files deleted")
				.setDescription(`Successfully deleted ${files.length} files.`)
				.setColor(Discord.Colors.Greyple)
		]
	});
	console.info(`[DELETE ALL ${interaction.user.id}] Confirmation sent`);
}
