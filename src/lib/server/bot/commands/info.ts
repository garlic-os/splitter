import Discord from "discord.js";
import * as Colors from "$lib/server/bot/colors";


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
                .setDescription("Splitter is a Discord bot that allows you to split files into smaller chunks and recombine them later. It's meant to make sharing large files in Discord as seamless as possible.\n[GitHub](https://github.com/garlic-os/Splitter)")
                .setColor(Colors.blue)
                .setThumbnail(interaction.client.user.displayAvatarURL())
        ]
    });
}
