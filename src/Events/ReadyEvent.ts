import { User, ClientUser, ClientApplication, GuildMember, Role } from "discord.js";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { Zero } from "../Zero";
import { MuteCommand } from "../Commands/Moderator/MuteCommand";
import { SuspendCommand } from "../Commands/Moderator/SuspendCommand";

export async function onReadyEvent() {
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

	// get info
	let app: ClientApplication = await Zero.RaidClient.fetchApplication();
	let owner: User = await Zero.RaidClient.users.fetch((app.owner as User).id);
	console.log('\x1b[36m%s\x1b[0m', `${(Zero.RaidClient.user as ClientUser).tag} has started.\nBOT TAG: ${(Zero.RaidClient.user as ClientUser).tag}\nBOT ID: ${(Zero.RaidClient.user as ClientUser).id}\nOWNER TAG: ${owner.tag}\nOWNER ID: ${owner.id}`);
}