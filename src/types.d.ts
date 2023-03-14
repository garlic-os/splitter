namespace Bot {
	interface SlashCommandHandler {
		data: Discord.SlashCommandBuilder;
		execute(interaction: Discord.CommandInteraction): Promise<void>;
	}

	interface AutocompleteCommandHandler extends SlashCommandHandler {
		autocomplete(interaction: Discord.AutocompleteInteraction): Promise<void>;
	}
}


namespace DB {
	interface FileEntry {
		id: string;
		uploadToken: string;
		uploadExpiry: number;
		ownerID: string;
		name: string | null;
		contentType: string;
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
}
