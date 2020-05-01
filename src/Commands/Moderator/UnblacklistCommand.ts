import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Guild, GuildMember, Role, MessageEmbed, TextChannel, User } from "discord.js";
import { MessageUtil } from "../../Utility/MessageUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { UserHandler } from "../../Handlers/UserHandler";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { IRaidUser } from "../../Templates/IRaidUser";

export class UnblacklistCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Unblacklist",
                "unblacklist",
                ["unbl"],
                "unblacklist a user, with a reason if needed. THIS DOES NOT REQUIRE THE USE OF FLAGS!",
                ["unblacklist <IGN: STRING> [Reason: STRING]"],
                ["unblacklist TestingH Forgiven."],
                2
            ),
            new CommandPermission(
				["BAN_MEMBERS", "MANAGE_GUILD"],
                ["BAN_MEMBERS", "EMBED_LINKS"],
                ["officer", "moderator"],
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

        let nameToUnblacklist: string = args[0];
		const reason: string = args.pop() as string; // there will always be at least 2 elements

        const isBlacklisted: boolean = guildDb.moderation.blacklistedUsers
            .some(x => x.inGameName.toLowerCase().trim() === nameToUnblacklist.toLowerCase().trim());

        if (!isBlacklisted) {
            MessageUtil.send({ content: `**\`${nameToUnblacklist}\`** is not blacklisted. Make sure you spelled the name right.` }, msg.channel);
            return;
        }

        const desc: StringBuilder = new StringBuilder();

        await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
            $pull: {
                "moderation.blacklistedUsers": {
                    inGameName: nameToUnblacklist.toLowerCase(),
                }
            }
        });

        desc.append(`⇒ **\`${nameToUnblacklist}\`** has been unblacklisted from the server.`)
            .appendLine();

        let userToUnban: User | undefined;
        for (const [id, user] of (await guild.fetchBans())) {
            // TODO can <ban>.reason be undefined/null if no reason is inputted? 
            if (user.reason.split("|")[0].trim().toLowerCase() === nameToUnblacklist.toLowerCase()) {
                await guild.members.unban(id, "Unblacklisted.").catch(e => { });
                userToUnban = user.user;
                desc.append("⇒ The Discord account associated with this member has been unbanned from the server.")
                    .appendLine();
                break;
            }
        }

        desc.append(`⇒ Reason: ${reason}`)
            .appendLine();

        const moderationChannel: TextChannel | undefined = guild.channels.cache.get(guildDb.generalChannels.logging.moderationLogs) as TextChannel | undefined;

        const embed: MessageEmbed = new MessageEmbed()
            .setTitle("🚩 Unblacklisted")
            .setDescription(desc.toString())
            .setColor("GREEN")
            .setFooter("Unblacklisted on")
            .setTimestamp();
        
        if (typeof userToUnban !== "undefined") {
            embed.setAuthor(userToUnban.tag, userToUnban.displayAvatarURL());
        }
        else {
            embed.setAuthor(guild.name, guild.iconURL() === null ? undefined : guild.iconURL() as string);
        }
        await MessageUtil.send(embed, msg.channel).catch(e => { });

        if (typeof moderationChannel !== "undefined") {
            await moderationChannel.send(embed).catch(e => { });
        }
    }
}