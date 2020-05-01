import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Guild, GuildMember, Role, MessageEmbed, TextChannel } from "discord.js";
import { MessageUtil } from "../../Utility/MessageUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { UserHandler } from "../../Handlers/UserHandler";

export class UnmuteCommand extends Command {
	public constructor() {
		super(
			new CommandDetail(
				"Unmute",
				"unmute",
				[],
				"Unmutes a user, with a reason if needed. THIS DOES NOT REQUIRE THE USE OF FLAGS!",
				["unmute <@Mention | ID> [Reason: STRING]"],
				["unmute @Test#1234 No longer annoying."],
				1
			),
			new CommandPermission(
                ["MUTE_MEMBERS"],
				["MANAGE_ROLES", "EMBED_LINKS"],
				["support", "headRaidLeader", "officer", "moderator"],
				false
			),
			true,
			false,
			false
		);
    }
    
    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {
        const guild: Guild = msg.guild as Guild;
        const mod: GuildMember = msg.member as GuildMember;
        let memberToUnmute: GuildMember | null = await UserHandler.resolveMember(msg, guildDb);

        if (memberToUnmute === null) {
            await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "NO_MENTIONS_FOUND", null), msg.channel);
            return;
        }

        if (memberToUnmute.id === msg.author.id) {
            await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "SAME_PERSON_AS_AUTHOR", null), msg.channel);
            return;
        }

        const role: Role | void = guild.roles.cache.find(x => x.id === guildDb.roles.optRoles.mutedRole);
        let resolvedMutedRole: Role;

        if (typeof role === "undefined") {
            MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("No Registered Muted Role").setDescription("There is no muted role, or the bot does not have one registered. Try again later."), msg.channel);
            return;
        }
        else {
            resolvedMutedRole = role;
        }

        if (!memberToUnmute.roles.cache.has(resolvedMutedRole.id)) {
            await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("Member Not Muted").setDescription("The member is already unmuted. Try again."), msg.channel);
            return;
        }

        args.shift();
        let reason: string = args.join(" ").trim().length === 0 ? "No reason provided" : args.join(" ").trim();

        await memberToUnmute.roles.remove(role).catch(e => { });
        await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
            $pull: {
                "moderation.mutedUsers": {
                    userId: memberToUnmute.id,
                }
            }
        });

        const moderationChannel: TextChannel | undefined = guild.channels.cache.get(guildDb.generalChannels.logging.moderationLogs) as TextChannel | undefined;
        await MessageUtil.send({ content: `${memberToUnmute} has been unmuted successfully.` }, msg.channel).catch(e => { });

        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(memberToUnmute.user.tag, memberToUnmute.user.displayAvatarURL())
            .setTitle("🔈 Member Unmuted")
            .setDescription(`⇒ ${memberToUnmute} (${memberToUnmute.displayName}) has been unmuted.\n⇒ Moderator: ${msg.author} (${mod.displayName})\n⇒ Reason: ${reason}`)
            .setColor("GREEN")
            .setTimestamp()
            .setFooter("Unmute Command Executed At");
        if (typeof moderationChannel !== "undefined") {
            await moderationChannel.send(embed).catch(e => { });
        }
    }
}