
import Discord from "discord.js";
import * as Config from "../../../../config";


// Load commands from the commands/ directory.
const commands: Discord.Collection<string, Bot.SlashCommandHandler> = new Discord.Collection();
const modules = import.meta.glob("./commands/*", { eager: true }) as Record<string, Bot.SlashCommandHandler>;
for (const command of Object.values(modules)) {
	commands.set(command.data.name, command);
}

const client = new Discord.Client({ intents: [] });


// Lazy load the upload channel.
let uploadChannel: Discord.TextChannel | null = null;;
export async function getUploadChannel(): Promise<Discord.TextChannel> {
	if (!uploadChannel) {
		const channel = await client.channels.fetch(Config.discordUploadChannelID);
		if (!(channel instanceof Discord.TextChannel)) {
			throw new Error("Invalid upload channel ID");
		}
		uploadChannel = channel;
	}
	return uploadChannel;
}


client.on(Discord.Events.ClientReady, async () => {
	console.log(`Bot logged in as ${client.user!.tag}`);
});


// Handle slash commands, including autocomplete events.
client.on(Discord.Events.InteractionCreate, async (interaction: Discord.Interaction) => {
	if (interaction.isChatInputCommand()) {
		const command = commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			await interaction.reply({
				content: "There was an error while executing this command!",
				ephemeral: true
			});
		}
	} else if (interaction.isAutocomplete()) {
		const command = commands.get(
			interaction.commandName
		) as Bot.AutocompleteCommandHandler | undefined;

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.autocomplete(interaction);
		} catch (error) {
			console.error(error);
		}
	}
});


process.on("exit", () => {
	client.destroy();
});


await client.login(Config.discordBotToken);
