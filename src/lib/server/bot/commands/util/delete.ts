import Discord from "discord.js";
import * as db from "$lib/server/database";
import * as bot from "$lib/server/bot";


export function coerceIntoError(maybeErr: unknown): Error {
	if (maybeErr instanceof Error) {
		return maybeErr;
	} else if (maybeErr instanceof Object) {
		return new Error(JSON.stringify(maybeErr));
	} else {
		return new Error(String(maybeErr));
	}
}


// I LOVE HANDLING ERRORS!!! I LOVE CHECKING FOR NULL!!!
export async function getNotificationMessage(
	interaction: Discord.ChatInputCommandInteraction,
	fileID: string
): Promise<Discord.Message> {
	const uploadInfo = db.getUploadInfo(fileID);
	if (!uploadInfo) {
		throw `[DELETE ${fileID}] Upload info not found for file ${fileID}`;
	}

	const { channelID, uploadNotifID } = uploadInfo;
	if (!channelID || !uploadNotifID) {
		throw `[DELETE ${fileID}] Missing upload info ${JSON.stringify(uploadInfo)}`;
	}

	const uploadNotifChannel = await interaction.client.channels.fetch(channelID);
	if (!(uploadNotifChannel instanceof Discord.TextChannel)) {
		throw `[DELETE ${fileID}] Invalid notification channel ID ${channelID}`;
	}

	console.debug(`[DELETE ${fileID}] Deleting notification message ${uploadNotifID}`);
	try {
		return await uploadNotifChannel.messages.fetch(uploadNotifID);
	} catch (err: unknown) {
		throw `[DELETE ${fileID}] Upload notification message ${uploadNotifID} not found; API returned error: ${coerceIntoError(err).message}`;
	}
}


// Delete every place where a bit of a file is stored:
// 1. The message posted when the file was uploaded.
// 2. The messages that contain the file's parts.
// 3. The file entry in the database.
export async function deleteFile(
	interaction: Discord.ChatInputCommandInteraction,
	fileID: string
): Promise<boolean> {
	const removalsInProgress: Promise<any>[] = [];
	let encounteredError = false;

	// Delete the upload notification message.
	try {
		const message = await getNotificationMessage(interaction, fileID);
		removalsInProgress.push(message.delete());
	} catch (err: unknown) {
		console.error(err);
		encounteredError = true;
	}

	// Delete the messages on Discord that contained the file's parts.
	const partEntries = db.getParts(fileID);
	for (const { url, messageID } of partEntries) {
		console.info(`[DELETE ${fileID}] Deleting message ${messageID}`);
		const uploadChannel = await bot.getUploadChannel();
		try {
			const message = await uploadChannel.messages.fetch(messageID);
			removalsInProgress.push(message.delete());
		} catch (err: unknown) {
			console.error(`[DELETE ${fileID}] Invalid message ID "${messageID}" from URL "${url}"; API returned error:`, err);
			encounteredError = true;
			continue;
		}
	}

	// Delete the file entry from the database.
	db.deleteFile(fileID);

	try {
		await Promise.all(removalsInProgress);
	} catch (err: unknown) {
		console.error(`[DELETE ${fileID}] Error while deleting messages:`, err);
		encounteredError = true;
	}

	return encounteredError;
}
