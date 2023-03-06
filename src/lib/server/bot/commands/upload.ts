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
function waitUntilUploaded(
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
	const token = DB.generateToken();
	interaction.reply(
		`Go to http://localhost:${Config.webappPort}/upload/${token} to upload your file.`
	);

	console.log("New upload request:", interaction.id);

	// TODO: It's probably possible to do this without holding a promise
	// in memory
	const { filename, filesize } = await waitUntilUploaded(
		interaction.user.id,
		interaction.id,
		token
	);

	let mention: string;
	let channel: Discord.User | Discord.TextBasedChannel;
	if (interaction.channel) {
		mention = `<@${interaction.user.id}>`;
		channel = interaction.channel;
	} else {
		mention = "You";
		channel = interaction.user;
	}

	channel.send({
		content: `${mention} posted a file: ` +
				`http://localhost:${Config.webappPort}/file/${interaction.id}/${filename}\n` +
				`${humanFileSize(filesize, 2)}`,
		allowedMentions: {
			users: []
		},
	});
};
