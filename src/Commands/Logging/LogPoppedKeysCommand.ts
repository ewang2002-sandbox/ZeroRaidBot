import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Guild, GuildMember, MessageEmbed, Role } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { UserHandler } from "../../Helpers/UserHandler";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { IRaidUser } from "../../Templates/IRaidUser";
import { DateUtil } from "../../Utility/DateUtil";
import { ArrayUtil } from "../../Utility/ArrayUtil";

export class LogPoppedKeysCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Log Keys Command",
				"logkeys",
				["logkey", "keypop", "kp"],
				"Logs keys popped by other people.",
				["logkeys <@Mention | ID | IGN> [Amount: NUMBER]"],
				["logkeys User#0001 4"],
				1
			),
			new CommandPermission(
				[],
				[],
				["universalAlmostRaidLeader"],
				["ALL_RLS"],
				true
			),
			true,
			false,
			false,
			5
		);
	}

	public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
		const guild: Guild = msg.guild as Guild;
		const member: GuildMember | null = await UserHandler.resolveMember(msg, guildData);
		if (member === null) {
			MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_MEMBER_FOUND", null), msg.channel);
			return;
		}

		args.shift();

		let num: number = Number.parseInt(args[0]);
		if (Number.isNaN(num)) {
			num = 1;
		}

		const dbEntry: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.MongoUserClient.findOne({
			discordUserId: member.id
		});

		if (dbEntry === null) {
			MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_DB_ENTRY_FOUND", null), msg.channel);
			return;
		}

		const indexOfKeyLogs: number = dbEntry.general.keyPops
			.findIndex(x => x.server === guild.id);
		if (indexOfKeyLogs === -1) {
			await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({ discordUserId: member.id }, {
				$push: {
					"general.keyPops": {
						server: guild.id,
						keysPopped: num
					}
				}
			});
		}
		else {
			await MongoDbHelper.MongoDbUserManager.MongoUserClient.updateOne({
				discordUserId: member.id,
				"general.keyPops.server": guild.id
			}, {
				$inc: {
					"general.keyPops.$.keysPopped": num
				}
			});
		}

		if (!guildData.properties.keyLeaderboard) {
			await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({
				guildID: guild.id
			}, {
				$set: {
					"properties.keyLeaderboard": {
						keyDetails: [],
						keyMessage: "",
						lastReset: new Date().getTime()
					}
				}
			});

			guildData.properties.keyLeaderboard = {
				keyDetails: [],
				keyMessage: "",
				lastReset: new Date().getTime()
			};
		}

		let numKeysForThisLeaderboard = 0;
		const idxOfKeyLeaderboard = guildData.properties.keyLeaderboard.keyDetails.findIndex(x => x.memberId === member.id);
		if (idxOfKeyLeaderboard !== -1) {
			await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({
				guildID: guild.id,
				"properties.keyLeaderboard.keyDetails.memberId": member.id
			}, {
				$inc: {
					"properties.keyLeaderboard.keyDetails.$.numLogged": num
				},
				$set: {
					"properties.keyLeaderboard.keyDetails.$.lastUpdated": Date.now()
				}
			});
			numKeysForThisLeaderboard = guildData.properties.keyLeaderboard.keyDetails[idxOfKeyLeaderboard].numLogged + num;

			guildData.properties.keyLeaderboard.keyDetails[idxOfKeyLeaderboard].numLogged += num;
		}
		else {
			await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({
				guildID: guild.id
			}, {
				$push: {
					"properties.keyLeaderboard.keyDetails": {
						memberId: member.id,
						numLogged: num,
						lastUpdated: Date.now()
					}
				}
			});

			guildData.properties.keyLeaderboard.keyDetails.push({
				memberId: member.id,
				numLogged: num,
				lastUpdated: Date.now()
			});

			numKeysForThisLeaderboard = num;
		}

		let totalKeys: number = indexOfKeyLogs === -1
			? num
			: dbEntry.general.keyPops[indexOfKeyLogs].keysPopped + num;

		const rolesToGive: Role[] = [];
		if (guildData.roles.optRoles.keyPopperRewards) {
			guildData.roles.optRoles.keyPopperRewards.sort((a, b) => a.amt - b.amt);
			for (const data of guildData.roles.optRoles.keyPopperRewards) {
				const role = guild.roles.cache.get(data.role);
				if (!role) continue;
				if (totalKeys <= data.amt && !member.roles.cache.has(role.id)) {
					rolesToGive.push(role);
				}
			}
		}

		const embed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("Keys Logged!")
			.setDescription(`${member} has popped ${num} keys for us! He or she now has ${totalKeys} keys logged!`)
			.addField("Time Period", `From ${DateUtil.getTime(guildData.properties.keyLeaderboard.lastReset)} (UTC) until now, he or she has popped ${numKeysForThisLeaderboard} keys total.`)
			.setColor("GREEN")
			.setFooter("Logged Keys")
			.setTimestamp();
		if (rolesToGive.length > 0) {
			embed.addField("Earned Roles", `${member} has earned the following role(s): ${rolesToGive.join(", ")}`);
			for await (const role of rolesToGive) {
				await member.roles.add(role).catch();
			}
		}

		MessageUtil.send({ embed: embed }, msg.channel);

		const leaderboardChannel = guild.channels.cache
			.get(guildData.generalChannels.keyLeaderboardChannel ?? "");
		if (leaderboardChannel && leaderboardChannel.isText()) {
			const top20Keys = ArrayUtil.generateLeaderboardArray(
				guildData.properties.keyLeaderboard.keyDetails,
				val => val.numLogged
			).slice(0, 20);


			// construct the embed. 
			const leaderboardEmbed = MessageUtil.generateBlankEmbed(guild, "RANDOM")
				.setDescription(`Top 20 key poppers for the time period from ${DateUtil.getTime(guildData.properties.keyLeaderboard.lastReset)} to ${DateUtil.getTime()}.`)
				.setTitle(`Top 20 Keypoppers in: ${guild.name}`)
				.setFooter("Last Updated")
				.setTimestamp();

			const members = await Promise.all(top20Keys.map(async x => {
				try {
					return guild.members.fetch(x[1].memberId);
				}
				catch (e) {
					return null;
				}
			}));

			for (let i = 0; i < top20Keys.length; i++) {
				const [rank, data] = top20Keys[i];
				leaderboardEmbed.addField(
					`[${rank}] ${members[i]?.displayName ?? data.memberId}`,
					`- Keys Popped: ${data.numLogged}\n- Last Logged: ${DateUtil.getTime(data.lastUpdated)}`
				);
			}

			let leaderboardMsg: Message | null;
			try {
				leaderboardMsg = await leaderboardChannel.messages.fetch(guildData.properties.keyLeaderboard.keyMessage);
			}
			catch (e) {
				leaderboardMsg = null;
			}

			if (leaderboardMsg) {
				await leaderboardMsg.edit(leaderboardEmbed).catch();
			}
			else {
				const m = await leaderboardChannel.send(leaderboardEmbed);
				await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({
					guildID: guild.id
				}, {
					$set: {
						"properties.keyLeaderboard": {
							keyMessage: m.id,
						}
					}
				});
			}
		}
	}
}
