import type { SlashCommandHandler, AutocompleteCommandHandler } from "./types";
import { ISplitter } from "./types";
import Discord from "discord.js";
import * as Config from "../../../../config";


class Splitter extends ISplitter {
	constructor(options: Discord.ClientOptions) {
		super(options);
		const commands = import.meta.glob("./commands/*", { eager: true }) as Record<string, SlashCommandHandler>;
		for (const command of Object.values(commands)) {
			this.commands.set(command.data.name, command);
		}

		this.on(Discord.Events.ClientReady, this.onClientReady);
		this.on(Discord.Events.InteractionCreate, this.onInteractionCreate);
	}

	async onClientReady(): Promise<void> {
		const channel = await this.channels.fetch(Config.discordUploadChannelID);
		if (channel instanceof Discord.TextChannel) {
			this.uploadChannel = channel;
		} else {
			throw new Error("Invalid Discord channel ID");
		}
	}

	async onInteractionCreate(interaction: Discord.Interaction): Promise<void> {
		if (interaction.isChatInputCommand()) {
			const command = this.commands.get(interaction.commandName);
	
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
			const command = this.commands.get(
				interaction.commandName
			) as AutocompleteCommandHandler | undefined;
	
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
	}

	async getUploadChannel(): Promise<NonNullable<ISplitter["uploadChannel"]>> {
		await this.ready;
		return this.uploadChannel!;
	}
}


const bot = new Splitter({ intents: [] });

bot.on(Discord.Events.ClientReady, async () => {
	console.log(`Bot logged in as ${bot.user!.tag}`);
});

process.on("exit", () => {
	bot.destroy();
});

await bot.login(Config.discordBotToken);


export async function uploadToDiscord(buffer: Buffer, filename: string): Promise<string> {
	// Upload the file to Discord.
	const attachment = new Discord.AttachmentBuilder(buffer, {
		name: filename,
	});
	const uploadChannel = await bot.getUploadChannel();
	const message = await uploadChannel.send({files: [attachment]});

	// Return the URL of the uploaded file.
	const sentAttachment = message.attachments.first();
	if (!sentAttachment) {
		throw new Error("No attachment found in message");
	}
	return sentAttachment.url;
}
