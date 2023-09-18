import Discord from "discord.js";
import { FileMenu } from "$lib/server/bot/utils/file-menu";


export const data = new Discord.SlashCommandBuilder()
	.setName("files")
	.setDescription("List the files you've uploaded.");


// Paginated list of filenames and their download links
// Sortable by:
// - Name
// - Upload date
// - File extension
// - Content type
export async function execute(interaction: Discord.ChatInputCommandInteraction): Promise<void> {
	console.info(`[FILES ${interaction.id}] New request`);

	let menu: FileMenu;
	try {
		menu = new FileMenu(interaction);
	} catch (error) {
		console.info(`[FILES ${interaction.id}] No files`);
		await interaction.reply({
			content: "❌ You haven't uploaded any through Splitter files yet!",
			ephemeral: true,
		});
		return;
	}

	await menu.run();
}
