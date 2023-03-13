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
	interface UploadReport {
		filename: string;
		filesize: number;
	}

	interface PendingUpload {
		resolve: (report: UploadReport) => void;
		reject: (err: Error) => void;
	}

	interface FileEntry {
		id: string;
		ownerID: string;
		name: string | null;
		contentType: string;
		urls: string;
		uploadToken: string;
		uploadExpiry: number;
		uploadNotificationID: string | null;
	}
}
