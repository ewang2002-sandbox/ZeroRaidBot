import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Guild, GuildMember, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { UserHandler } from "../../Helpers/UserHandler";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { IRaidUser } from "../../Templates/IRaidUser";

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
				["headRaidLeader", "universalRaidLeader", "universalAlmostRaidLeader"],
				["ALL_RLS"],
				false
			),
			true,
			false,
			false
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

		let totalKeys: number = indexOfKeyLogs === -1
			? num
			: dbEntry.general.keyPops[indexOfKeyLogs].keysPopped + num;
		
		const embed: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle("Keys Logged!")
			.setDescription(`${member} has popped ${num} keys for us! He or she now has ${totalKeys} keys logged!`)
			.setColor("GREEN")
			.setFooter("Logged Keys")
			.setTimestamp();
		MessageUtil.send({ embed: embed }, msg.channel);
    }
}
