declare namespace Bot {
	interface SlashCommandHandler {
		data: Discord.SlashCommandBuilder;
		execute(interaction: Discord.CommandInteraction): Promise<void>;
	}

	interface AutocompleteCommandHandler extends SlashCommandHandler {
		autocomplete(interaction: Discord.AutocompleteInteraction): Promise<void>;
	}
}


declare namespace DB {
	interface FileEntry {
		id: string;
		uploadToken: string;
		uploadExpiry: number;
		ownerID: string;
		name: string | null;
		contentType: string;
		channelID: string | null;
		uploadNotifID: string | null;
	}

	interface PartEntry {
		fileID: string;
		messageID: string;
		url: string;
	}

	interface UploadReport {
		filename: string;
		filesize: number;
	}

	interface PendingUpload {
		resolve: (report: UploadReport) => void;
		reject: (err: Error) => void;
	}

	interface FileListEntry {
		name: NonNullable<DB.FileEntry["name"]>;
		contentType: DB.FileEntry["contentType"];
		uploadNotifID: NonNullable<DB.FileEntry["uploadNotifID"]>;
	}
}
