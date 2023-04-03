import Discord from "discord.js";


export const data = new Discord.SlashCommandBuilder()
	.setName("info")
	.setDescription("What's a Splitter?");


export async function execute(interaction: Discord.ChatInputCommandInteraction): Promise<void> {
	interaction.reply({
		embeds: [
			new Discord.EmbedBuilder()
				.setTitle("Splitter")
				.setAuthor({
					name: "A garlicSoft® product",
					iconURL: "https://i.imgur.com/QQXKVSY.png",  // My Discord avatar
					url: "https://github.com/garlic-os/"
				})
				.setDescription("Splitter is a Discord bot that allows you to split files into smaller chunks, and then recombine them later. It's useful for sharing large files, or for sending files that are too large to send in a single message.\n[GitHub](https://github.com/garlic-os/Splitter)")
				.setColor(Discord.Colors.Blue)
				.setThumbnail(interaction.client.user.displayAvatarURL())
		]
	});
}
