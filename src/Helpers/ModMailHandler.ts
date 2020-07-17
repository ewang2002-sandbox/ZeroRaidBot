import { IRaidGuild } from "../Templates/IRaidGuild";
import { User, Guild, Message, MessageEmbed } from "discord.js";
import { MongoDbHelper } from "./MongoDbHelper";
import { StringUtil } from "../Utility/StringUtil";
import { UserAvailabilityHelper } from "./UserAvailabilityHelper";
import { GenericMessageCollector } from "../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../Definitions/TimeUnit";
import { resolve } from "dns";

export module ModMailHandler {
	/**
	 * Checks whether the person is already engaged in a modmail conversation. 
	 * @param discordId The Discord ID.
	 * @param guildDb The guild document.
	 */
	export function isInThreadConversation(discordId: string, guildDb: IRaidGuild): boolean {
		return guildDb.properties.modMail.some(x => x.sender === discordId);
	}

	/**
	 * Checks whether modmail can be used in the server.
	 * @param guild The guild.
	 * @param guildDb The guild document.
	 */
	export function canUseModMail(guild: Guild, guildDb: IRaidGuild): boolean {
		return guild.channels.cache.has(guildDb.generalChannels.modMailChannel);
	}


	export async function initiateModMailContact(initiator: User, message: Message): Promise<void> {
		
	}

	/**
	 * Selects a guild for modmail. 
	 * @param user The user that initated this.
	 */
	async function chooseGuild(user: User): Promise<Guild | null> {
		const guildsToChoose: Guild[] = [];

		const allGuilds: IRaidGuild[] = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.find({}).toArray();
		for (const [id, guild] of user.client.guilds.cache) {
			const index: number = allGuilds.findIndex(x => x.guildID === id);
			if (index === -1) {
				continue;
			}

			if (guild.members.cache.has(user.id)
				&& guild.roles.cache.has(allGuilds[index].roles.raider)
				&& guild.channels.cache.has(allGuilds[index].generalChannels.modMailChannel)) {
				guildsToChoose.push(guild);
			}
		}

		if (guildsToChoose.length === 0) {
			return null;
		}

		if (guildsToChoose.length === 1) {
			return guildsToChoose[0];
		}

		const selectedGuild: Guild | "CANCEL" = await new Promise(async (resolve, reject) => {
			const embed: MessageEmbed = new MessageEmbed()
				.setAuthor(user.tag, user.displayAvatarURL())
				.setTitle("Select Server")
				.setDescription("The message sent above will be sent to a designated server of your choice. Please select the server by typing the number corresponding to the server that you want to. To cancel, please type `cancel`.")
				.setColor("RANDOM")
				.setFooter(`${guildsToChoose.length} Servers.`);
			const arrFieldsContent: string[] = StringUtil.arrayToStringFields<Guild>(guildsToChoose, (i, elem) => `\`[${i + 1}]\` ${elem.name}\n`);
			for (const elem of arrFieldsContent) {
				embed.addField("Possible Guilds", elem);
			}

			UserAvailabilityHelper.InMenuCollection.set(user.id, UserAvailabilityHelper.MenuType.PRE_MODMAIL);

			const numSelected: number | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<number>(
				user,
				{ embed: embed },
				5,
				TimeUnit.MINUTE,
				user
			).send(GenericMessageCollector.getNumber(user, 1, arrFieldsContent.length));

			if (numSelected === "CANCEL_CMD" || numSelected === "TIME_CMD") {
				resolve("CANCEL");
			}
			else {
				resolve(guildsToChoose[numSelected - 1]);
			}
			UserAvailabilityHelper.InMenuCollection.delete(user.id)
		});

		return selectedGuild === "CANCEL" ? null : selectedGuild;
	}
}