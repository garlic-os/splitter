interface SlashCommandHandler {
	data: Discord.SlashCommandBuilder;
	execute(interaction: Discord.CommandInteraction): Promise<void>;
}

interface AutocompleteCommandHandler extends SlashCommandHandler {
	autocomplete(interaction: Discord.AutocompleteInteraction): Promise<void>;
}
