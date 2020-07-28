import { User, ClientUser, ClientApplication, GuildMember, Role, TextChannel } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { Zero } from "../Zero";
import { MuteCommand } from "../Commands/Moderator/MuteCommand";
import { SuspendCommand } from "../Commands/Moderator/SuspendCommand";
import { IRaidBot } from "../Templates/IRaidBot";
import { DateUtil } from "../Utility/DateUtil";
import { BOT_VERSION } from "../Constants/ConstantVars";

export async function onReadyEvent() {
	await mongoPreloader();
	const guildBots: string[] = [];
	for await (let [id, guild] of Zero.RaidClient.guilds.cache) {
		guildBots.push(id);
		const g = new MongoDbHelper.MongoDbGuildManager(id);
		const doc: IRaidGuild = await g.findOrCreateGuildDb();

		const mutedRole: Role | undefined = guild.roles.cache.get(doc.roles.optRoles.mutedRole);

		if (typeof mutedRole !== "undefined") {
			for (const mutedUser of doc.moderation.mutedUsers) {
				if (guild.members.cache.has(mutedUser.userId)
					&& mutedUser.endsAt !== -1) {
					const durationToServe: number = mutedUser.endsAt - new Date().getTime();
					const member: GuildMember = guild.members.cache.get(mutedUser.userId) as GuildMember;
					if (durationToServe < 0) {
						await member.roles.remove(mutedRole).catch(() => { });
						continue;
					}
					MuteCommand.timeMute(guild, member, durationToServe);
				}
			}
		}

		// check suspended
		const suspendedRole: Role | undefined = guild.roles.cache.get(doc.roles.suspended);

		if (typeof suspendedRole !== "undefined") {
			for (const suspendedUser of doc.moderation.suspended) {
				if (guild.members.cache.has(suspendedUser.userId)
					&& suspendedUser.endsAt !== -1) {
					const durationToServe: number = suspendedUser.endsAt - new Date().getTime();
					const member: GuildMember = guild.members.cache.get(suspendedUser.userId) as GuildMember;
					if (durationToServe < 0) {
						await member.roles.set(suspendedUser.roles).catch(() => { });
						await member.roles.remove(suspendedRole).catch(() => { });
						continue;
					}
					SuspendCommand.timeSuspend(guild, member, durationToServe, suspendedUser.roles);
				}
			}
		}
	}
	
	const botDb: IRaidBot | null = await MongoDbHelper.MongoBotSettingsClient
		.findOne({ botId: (Zero.RaidClient.user as ClientUser).id });

	if (botDb === null) {
		await MongoDbHelper.MongoBotSettingsClient.insertOne({
			botId: (Zero.RaidClient.user as ClientUser).id,
			channels: {
				altAccountRemovalChannel: "",
				networkBlacklistLogs: "",
				staffAnnouncementsChannel: ""
			},
			moderation: {
				networkBlacklisted: []
			},
			dev: {
				feedback: [],
				isEnabled: true,
				blacklisted: [],
				bugs: []
			}
		});
	}

	// get info
	let app: ClientApplication = await Zero.RaidClient.fetchApplication();
	let owner: User = await Zero.RaidClient.users.fetch((app.owner as User).id);
	console.info('\x1b[36m%s\x1b[0m', `${(Zero.RaidClient.user as ClientUser).tag} (Version ${BOT_VERSION}) has started.\nBOT TAG: ${(Zero.RaidClient.user as ClientUser).tag}\nBOT ID: ${(Zero.RaidClient.user as ClientUser).id}\nOWNER TAG: ${owner.tag}\nOWNER ID: ${owner.id}\nTIME: ${DateUtil.getTime()}`);
}

/**
 * Preloads any new data. Make sure to update this before running! :) 
 */
async function mongoPreloader(): Promise<void> {
	// UNCOMMENT BEFORE GOING TO PRODUCTION
	/*
	await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateMany({}, {
		$set: {
			"generalChannels.quotaChannel": "",
			"properties.quotas": {
				quotaDetails: [],
				quotaMessage: "",
				lastReset: 0
			} 
		}
	});*/
}