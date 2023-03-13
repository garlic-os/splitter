import Discord from "discord.js";
import * as client from "$lib/server/bot/client";


export async function getUploadChannel(): Promise<Discord.TextChannel> {
	await client.ready;
	return client.uploadChannel!;
}


export async function uploadToDiscord(buffer: Buffer, filename: string): Promise<string> {
	const attachment = new Discord.AttachmentBuilder(buffer, {
		name: filename,
	});
	const uploadChannel = await getUploadChannel();
	const sentMessage = await uploadChannel.send({ files: [attachment] });
	return sentMessage.attachments.first()!.url;
}
