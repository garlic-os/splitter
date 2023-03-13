import Discord from "discord.js";
import * as client from "$lib/server/bot/client";


export async function getUploadChannel(): Promise<Discord.TextChannel> {
	await client.ready;
	return client.uploadChannel!;
}


export async function uploadToDiscord(buffer: Buffer, filename: string): Promise<string> {
	// Upload the file to Discord.
	const attachment = new Discord.AttachmentBuilder(buffer, {
		name: filename,
	});
	const uploadChannel = await getUploadChannel();
	const message = await uploadChannel.send({files: [attachment]});

	// Return the URL of the uploaded file.
	const sentAttachment = message.attachments.first();
	if (!sentAttachment) {
		throw new Error("No attachment found in message");
	}
	return sentAttachment.url;
}
