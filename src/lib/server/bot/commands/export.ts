import Discord from "discord.js";
import * as db from "$lib/server/database";


export const data = new Discord.SlashCommandBuilder()
	.setName("export")
	.setDescription("Get a digest of all your files");


export async function execute(interaction: Discord.ChatInputCommandInteraction): Promise<void> {
	const files = db.getFilesByOwnerID(interaction.user.id);
	const json = JSON.stringify(files, null, 2);
	interaction.reply({
		content: "Here is the data of all the files you've uploaded through Splitter:",
		files: [
			{
				name: `export-${interaction.user.id}.json`,
				attachment: Buffer.from(json, "utf-8"),
			}
		],
		ephemeral: true
	});
}
