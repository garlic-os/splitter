import Discord from "discord.js";
import * as db from "$lib/server/database";
import * as colors from "$lib/server/bot/colors";
import { deleteFile } from "$lib/server/bot/commands/util/delete";


export const data = new Discord.SlashCommandBuilder()
	.setName("delete-all")
	.setDescription("Delete every file you've uploaded through Splitter.");


export async function execute(interaction: Discord.ChatInputCommandInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });

	console.info(`[DELETE ALL ${interaction.user.id}] New request`);
	const files = db.getFilesByOwnerID(interaction.user.id);

	if (files.length === 0) {
		await interaction.editReply("❌ You don't have any files to delete.");
		return;
	}

	const erroredFileIDs: string[] = [];

	for (const file of files) {
		const encounteredError = await deleteFile(interaction, file.id);
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
		await interaction.editReply({
			embeds: [
				new Discord.EmbedBuilder()
					.setTitle("Couldn't delete")
					.setDescription("An error occurred while deleting these files:")
					.setColor(colors.red)
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

	await interaction.editReply({
		embeds: [
			new Discord.EmbedBuilder()
				.setTitle("All files deleted")
				.setDescription(`Successfully deleted ${files.length} files.`)
				.setColor(colors.green)
		]
	});
	console.info(`[DELETE ALL ${interaction.user.id}] Confirmation sent`);
}
