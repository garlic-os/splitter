import Discord from "discord.js";
import * as db from "$lib/server/database";
import { snowflake2date } from "$lib/server/bot/utils/snowflake2date";

type SortableAttribute = "name" | "uploadNotifID" | "fileExt" | "contentType";


export class FileMenu {
	private static readonly TIMEOUT_MS = 15_000;
	private static readonly MAX_ROWS = 25;
	private readonly interaction: Discord.ChatInputCommandInteraction;
	private readonly fileCount: number;
	private readonly userID: string;
	private readonly embed: Discord.EmbedBuilder;
	private filterSelectRow?: Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>;
	private navButtons?: Discord.ActionRowBuilder<Discord.ButtonBuilder>;
	private menu?: Discord.InteractionResponse;
	private fileList: Discord.APIEmbedField[] = [];
	private index = 0;
	private sortBy: SortableAttribute = "name";
	private disabled = false;

	constructor(interaction: Discord.ChatInputCommandInteraction) {
		this.interaction = interaction;
		this.userID = interaction.user.id;

		this.fileCount = db.getFileCount(interaction.user.id);
		if (this.fileCount === 0) {
			throw new Error("No files");
		}

		this.embed = new Discord.EmbedBuilder()
			.setTitle("Files")
			.setColor(Discord.Colors.Aqua);
	}

	private static fileListField(fileListEntry: DB.FileListEntry): Discord.APIEmbedField {
		const { name, contentType, uploadNotifID } = fileListEntry;
		const timestamp = Math.round(snowflake2date(uploadNotifID).getTime() / 1000);
		const timeCode = `<t:${timestamp}:F>`;
		return {
			name: "​",
			value: `\`${name}\`\n` +
			       `${contentType.split("/")[0]} • ${timeCode}`,
			inline: false
		};
	}

	private refreshControls(): void {
		this.filterSelectRow = new Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>()
			.setComponents(
				new Discord.StringSelectMenuBuilder()
					.setCustomId("select-filter")
					.setOptions(
						new Discord.StringSelectMenuOptionBuilder()
							.setLabel("Name")
							.setValue("name")
							.setDefault(this.sortBy === "name"),
						new Discord.StringSelectMenuOptionBuilder()
							.setLabel("Upload date")
							.setValue("uploadNotifID")
							.setDefault(this.sortBy === "uploadNotifID"),
						new Discord.StringSelectMenuOptionBuilder()
							.setLabel("File extension")
							.setValue("fileExt")
							.setDefault(this.sortBy === "fileExt"),
						new Discord.StringSelectMenuOptionBuilder()
							.setLabel("Content type")
							.setValue("contentType")
							.setDefault(this.sortBy === "contentType"),
					)
					.setDisabled(this.disabled)
			);

		this.navButtons = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
			.setComponents(
				new Discord.ButtonBuilder()
					.setCustomId("button-prev")
					.setLabel("⬅")
					.setStyle(Discord.ButtonStyle.Primary)
					.setDisabled(this.index < 1 || this.disabled),
				new Discord.ButtonBuilder()
					.setCustomId("button-next")
					.setLabel("➡")
					.setStyle(Discord.ButtonStyle.Primary)
					.setDisabled(this.index >= this.fileCount || this.disabled)
		);
		this.embed.setFooter({
			text: `Page ${this.index / FileMenu.MAX_ROWS + 1} of ` +
			      `${Math.ceil(this.fileCount / FileMenu.MAX_ROWS) || 0}`
		});
	}

	private refreshFileList(): void {
		const files = db.getFiles(
			this.userID,
			this.index,
			this.index + FileMenu.MAX_ROWS,
			this.sortBy
		);
		this.fileList = files.map(FileMenu.fileListField);
		this.embed.setFields(this.fileList);
	}

	private refresh(): void {
		this.refreshControls();
		this.refreshFileList();
	}

	private async onExpired(): Promise<void> {
		console.info(`[FILES ${this.interaction.id}] Interaction expired`);
		this.disabled = true;
		this.refreshControls();
		await this.menu!.edit({
			embeds: [this.embed],
			components: [this.filterSelectRow!, this.navButtons!],
		});
	}

	private onPrevPressed(event: Discord.ButtonInteraction): Discord.MessageComponentInteraction {
		console.info(`[FILES ${this.interaction.id}] Previous page`);
		this.index = Math.max(this.index - FileMenu.MAX_ROWS, 0);
		return event;
	}

	private onNextPressed(event: Discord.ButtonInteraction): Discord.MessageComponentInteraction {
		console.info(`[FILES ${this.interaction.id}] Next page`);
		this.index = Math.min(this.index + FileMenu.MAX_ROWS, this.fileCount);
		return event;
	}

	private onFilterSelect(event: Discord.StringSelectMenuInteraction): Discord.MessageComponentInteraction {
		this.sortBy = event.values[0] as SortableAttribute;
		this.index = 0;
		console.info(`[FILES ${this.interaction.id}] Filter set to ${this.sortBy}`);
		return event;
	}

	private async inputLoop(): Promise<void> {
		while (true) {
			const menuResponsePromise = Promise.any([
				this.menu!.awaitMessageComponent<Discord.ComponentType.Button>({
					filter: (interaction) => interaction.customId === "button-prev",
					time: FileMenu.TIMEOUT_MS,
				}).then(this.onPrevPressed.bind(this)),

				this.menu!.awaitMessageComponent<Discord.ComponentType.Button>({
					filter: (interaction) => interaction.customId === "button-next",
					time: FileMenu.TIMEOUT_MS,
				}).then(this.onNextPressed.bind(this)),

				this.menu!.awaitMessageComponent<Discord.ComponentType.StringSelect>({
					filter: (interaction) => interaction.customId === "select-filter",
					time: FileMenu.TIMEOUT_MS,
				}).then(this.onFilterSelect.bind(this)),
			]);
			try {
				const menuResponse = await menuResponsePromise;
				this.refresh();
				await menuResponse.update({
					embeds: [this.embed],
					components: [this.filterSelectRow!, this.navButtons!],
				});
			} catch (error) {
				// TODO: Filter for the "timed out" error
				console.debug(error);
				this.onExpired();
				return;
			}
		}
	}

	public async run(): Promise<void> {
		this.refresh();
		this.menu = await this.interaction.reply({
			embeds: [this.embed],
			components: [this.filterSelectRow!, this.navButtons!],
			ephemeral: true,
		});
		await this.inputLoop();
	}
}
