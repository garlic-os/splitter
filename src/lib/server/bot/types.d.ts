export interface SlashCommandHandler {
	data: Discord.SlashCommandBuilder;
	execute(interaction: Discord.CommandInteraction): Promise<void>;
}

export interface AutocompleteCommandHandler extends SlashCommandHandler {
	autocomplete(interaction: Discord.AutocompleteInteraction): Promise<void>;
}
