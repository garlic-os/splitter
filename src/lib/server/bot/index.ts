import Discord from "discord.js";
import { client } from "./client";
import * as Config from "$config";


// Lazy load the upload channel.
let uploadChannel: Discord.TextChannel | null = null;
export async function getUploadChannel(): Promise<Discord.TextChannel> {
	if (!uploadChannel) {
		const channel = await client.channels.fetch(Config.discordUploadChannelID);
		if (!(channel instanceof Discord.TextChannel)) {
			throw new Error("Invalid upload channel ID");
		}
		uploadChannel = channel;
	}
	return uploadChannel;
}


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
	const uploadChannel = await getUploadChannel();
	const sentMessage = await uploadChannel.send({ files: attachments });
	return {
		messageID: sentMessage.id,
		urls: sentMessage.attachments.map(a => a.url),
	};
}
