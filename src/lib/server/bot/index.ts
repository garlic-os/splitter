import Discord from "discord.js";
import { client } from "./client";
import * as Config from "../../../../config";


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
	url: string;
}
export async function uploadToDiscord(buffer: Buffer, filename: string): Promise<UploadResult> {
	const attachment = new Discord.AttachmentBuilder(buffer, {
		name: filename,
	});
	const uploadChannel = await getUploadChannel();
	const sentMessage = await uploadChannel.send({ files: [attachment] });
	return {
		messageID: sentMessage.id,
		url: sentMessage.attachments.first()!.url,
	};
}
