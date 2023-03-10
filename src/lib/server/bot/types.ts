import Discord from "discord.js";

export interface SlashCommandHandler {
	data: Discord.SlashCommandBuilder;
	execute(interaction: Discord.CommandInteraction): Promise<void>;
}

export interface AutocompleteCommandHandler extends SlashCommandHandler {
	autocomplete(interaction: Discord.AutocompleteInteraction): Promise<void>;
}


export abstract class ISplitter extends Discord.Client {
	protected commands: Discord.Collection<string, SlashCommandHandler>;
	protected uploadChannel: Discord.TextChannel | null;
	protected ready: Promise<void>;
	protected abstract onClientReady(): Promise<void>;
	protected abstract onInteractionCreate(interaction: Discord.Interaction): Promise<void>;
	public abstract getUploadChannel(): Promise<Discord.TextChannel>;

	constructor(options: Discord.ClientOptions) {
		super(options);
		this.commands = new Discord.Collection();
		this.uploadChannel = null;
		this.ready = new Promise((resolve) => {
			this.once(Discord.Events.ClientReady, () => resolve());
		});
	}
}
