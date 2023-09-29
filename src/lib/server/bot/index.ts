import Discord from "discord.js";
import { client } from "./client";
import * as Config from "$config";


const channel = await client.channels.fetch(Config.discordUploadChannelID);
if (!(channel instanceof Discord.TextChannel)) {
	throw new Error("Invalid upload channel ID");
}
export const uploadChannel = channel;


// Set chunk size to the maximum file size allowed by the designated upload
// channel's premium tier.
export const chunkSize = (() => {
	switch (uploadChannel.guild.premiumTier) {
		case undefined:  // discord.js docs says this wont happen but it does
			console.warn("[BOT] uploadChannel.guild.premiumTier is missing; using default chunk size");
		case Discord.GuildPremiumTier.None:
		case Discord.GuildPremiumTier.Tier1:
			return 25 * 1024 * 1024;
		case Discord.GuildPremiumTier.Tier2:
			return 50 * 1024 * 1024;
		case Discord.GuildPremiumTier.Tier3:
			return 100 * 1024 * 1024;
	}
})();


interface UploadResult {
	messageID: string;
	urls: string[];
}
export async function uploadToDiscord(
	filePaths: string[],
	filenames: string[]
): Promise<UploadResult> {
	const attachments = [];
	for (let i = 0; i < filePaths.length; i++) {
		attachments.push(new Discord.AttachmentBuilder(filePaths[i], {
			name: filenames[i],
		}));
	}
	const sentMessage = await uploadChannel.send({ files: attachments });
	return {
		messageID: sentMessage.id,
		urls: sentMessage.attachments.map(a => a.url),
	};
}
