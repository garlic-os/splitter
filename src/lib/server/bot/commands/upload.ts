import Discord from "discord.js";
import * as Config from "$config";
import * as db from "$lib/server/database";
import humanFileSize from "$lib/utils/human-file-size";


// Add a promise to an object that other modules can access.
// The webserver will resolve it when the upload is complete.
async function waitUntilUploaded(
	fileID: string,
	userID: string,
	token: string
): Promise<DB.UploadReport> {
	db.openUpload(fileID, userID, token);
	const report = await new Promise<DB.UploadReport>(
		(resolve, reject) => {
			db.pendingUploads[fileID] = { resolve, reject };
		}
	);
	delete db.pendingUploads[fileID];
	return report;
}


export const data = new Discord.SlashCommandBuilder()
	.setName("upload")
	.setDescription("Upload a file beyond the Discord file size limit.");


export async function execute(interaction: Discord.ChatInputCommandInteraction): Promise<void> {
	// Skip duplicate requests. Sometimes the bot receives several requests in a
	// row for the same interaction 🤷‍♂️
	if (interaction.id in db.pendingUploads) return;

	const token = db.generateToken();
	interaction.reply({
		content: `Go to ${Config.webappURL}/upload/${token} to upload your file.`,
		ephemeral: true,
	});

	// TODO: It's probably possible (and desirable) to do this without holding a
	// promise in memory
	console.info(`[UPLOAD ${interaction.id}] New request`);
	const { filename, filesize } = await waitUntilUploaded(
		interaction.id,
		interaction.user.id,
		token
	);

	const mention = interaction.guild ? `<@${interaction.user.id}>` : "You";
	const notifMessage = await interaction.followUp({
		content: `${mention} posted a file: ` +
			     `${Config.webappURL}/file/${interaction.id}/${filename}\n` +
			     `${humanFileSize(filesize, 2)}`,
		allowedMentions: {
			users: []
		},
		ephemeral: false
	});
	db.setUploadInfo(interaction.id, notifMessage.channelId, notifMessage.id);
	console.info(`[UPLOAD ${interaction.id}] Sent confirmation`);
	interaction.deleteReply();
}
