import Discord from "discord.js";
import * as Config from "../../../../../config";
import * as DB from "$lib/server/database";


// Format a number of bytes as human-readable text.
// https://stackoverflow.com/a/14919494
function humanFileSize(numBytes: number, numDecimalPlaces=1): string {
	const thresh = 1024;
	if (Math.abs(numBytes) < thresh) {
		return numBytes + " B";
	}
	const units = ["KB", "MB", "GB"];
	let u = -1;
	const r = 10 ** numDecimalPlaces;
	do {
		numBytes /= thresh;
		++u;
	} while (Math.round(Math.abs(numBytes) * r) / r >= thresh && u < units.length - 1);
	return numBytes.toFixed(numDecimalPlaces) + " " + units[u];
}


// Add a promise to an object that other modules can access.
// The webserver will resolve it when the upload is complete.
async function waitUntilUploaded(
	userID: string,
	fileID: string,
	token: string
): Promise<DB.UploadReport> {
	DB.reserveUpload(fileID, userID, token);
	const report = await new Promise<DB.UploadReport>(
		(resolve, reject) => {
			DB.pendingUploads.set(fileID, { resolve, reject });
		}
	);
	DB.pendingUploads.delete(fileID);
	return report;
}


export const data = new Discord.SlashCommandBuilder()
	.setName("upload")
	.setDescription("Upload a file beyond the Discord file size limit.");


export const execute = async (interaction: Discord.ChatInputCommandInteraction): Promise<void> => {
	// Skip duplicate requests. Sometimes the bot receives several requests in a
	// row for the same interaction 🤷‍♂️
	if (DB.pendingUploads.has(interaction.id)) return;

	const token = DB.generateToken();
	interaction.reply({
		content: `Go to ${Config.webappURL}/upload/${token} to upload your file.`,
		ephemeral: true,
	});

	// TODO: It's probably possible (and desirable) to do this without holding a
	// promise in memory
	console.info(`[UPLOAD ${interaction.id}] New request`);
	const { filename, filesize } = await waitUntilUploaded(
		interaction.user.id,
		interaction.id,
		token
	);

	const mention = interaction.guild ? `<@${interaction.user.id}>` : "You";
	const notificationMessage = await interaction.followUp({
		content: `${mention} posted a file: ` +
				 `${Config.webappURL}/file/${interaction.id}/${filename}\n` +
				 `${humanFileSize(filesize, 2)}`,
		allowedMentions: {
			users: []
		},
		ephemeral: false
	});
	DB.setUploadNotificationID(interaction.id, notificationMessage.id);
	console.info(`[UPLOAD ${interaction.id}] Sent confirmation`);
	interaction.deleteReply();
};
