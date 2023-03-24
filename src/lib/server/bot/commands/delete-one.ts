import Discord from "discord.js";
import * as db from "$lib/server/database";
import * as colors from "$lib/server/bot/colors";
import { deleteFile } from "$lib/server/bot/commands/util/delete";


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
	await interaction.deferReply({ ephemeral: true });

	console.info(`[DELETE ${fileID}] New request`);
	const encounteredError = await deleteFile(interaction, fileID);

	if (encounteredError) {
		console.warn(`[DELETE ${fileID}] Complete with errors`);
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
