import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, Collection, Snowflake, Guild, MessageManager, MessageEmbed, Role, PresenceStatus } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { UserHandler } from "../../Helpers/UserHandler";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { DateUtil } from "../../Utility/DateUtil";
import { StringUtil } from "../../Utility/StringUtil";

export class UserInfoCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "User Information",
                "userinfo",
                [],
                "Gets details about a user. You can either mention the person or put the person's ID. If all parameters are not valid, the bot will show your information instead.",
                ["userinfo [@Mention | ID]"],
                ["userinfo", "userinfo @Test#1234", "roleinfo 703911436631670805"],
                0
            ),
            new CommandPermission(
                [],
                [],
                ["suspended"],
                [],
                true
            ),
            true, // guild-only command. 
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

        let member: GuildMember | undefined = (msg.mentions.members as Collection<Snowflake, GuildMember>).first()
            || guild.members.cache.get(args.join(" "));

        if (typeof member === "undefined") {
            member = msg.member as GuildMember;
        }

        const userSB: StringBuilder = new StringBuilder()
            .append(`⇒ User ID: \`${member.id}\``)
            .appendLine();

        // discord typings says otherwise but oops
        if (typeof member.nickname !== "undefined") {
            userSB.append(`⇒ Nickname: \`${member.nickname}\``)
                .appendLine();
        }

        if (member.joinedAt !== null) {
            userSB
                .append(`⇒ Joined Discord: \`${DateUtil.getTime(member.joinedAt)}\``)
                .appendLine();
        }

        userSB
            .append(`⇒ Joined Discord: \`${DateUtil.getTime(member.user.createdAt)}\``)
            .appendLine()
            .append(`⇒ Default Avatar: [Click Here](${member.user.defaultAvatarURL})`)
            .appendLine()
            .append(`⇒ Current Avatar: [Click Here](${member.user.displayAvatarURL()})`)
            .appendLine()
            .appendLine();

        if (member.user.presence.clientStatus === null) {
            userSB.append(this.getStatusStr(member.user.presence.status))
                .appendLine();
        }
        else {
            if (member.user.presence.clientStatus.desktop !== null) {
                userSB.append(this.getStatusStr(member.user.presence.clientStatus.desktop, "Desktop"))
                    .appendLine();
            }

            if (member.user.presence.clientStatus.mobile !== null) {
                userSB.append(this.getStatusStr(member.user.presence.clientStatus.mobile, "Mobile"))
                    .appendLine();
            }

            if (member.user.presence.clientStatus.web !== null) {
                userSB.append(this.getStatusStr(member.user.presence.clientStatus.mobile, "Web"))
                    .appendLine();
            }
        }

        let memberRoles: Role[] = member.roles.cache
            .sort((a, b) => b.position - a.position)
            .array();
        let memberRolesStr: string = "";

        // assume each id is length 22 and an extra comma & space (+2) = 24. 
        if (memberRoles.length === 0) {
            memberRolesStr = StringUtil.applyCodeBlocks("N/A");
        }
        else {
            if (memberRoles.length > 38) {
                memberRolesStr = memberRoles.splice(0, 38).join(", ") + "...";
            }
            else {
                memberRolesStr = memberRoles.join(" ");
            }
        }

        let permName: string = Object.entries(member.permissions.serialize())
            .filter(x => x[1])
            .map(y => this.modifyTxt(y[0].replace(/_/g, ' ')))
            .join(", ");

        const userInfo: MessageEmbed = new MessageEmbed()
            .setAuthor(member.user.tag, member.user.displayAvatarURL())
            .setTitle(`User Information: ${member.user.tag}`)
            .setDescription(userSB.toString())
            .setThumbnail(member.user.displayAvatarURL())
            .addField("Permissions", StringUtil.applyCodeBlocks(permName))
            .addField("Roles", memberRolesStr)
            .setColor("RANDOM")
            .setFooter(guild.ownerID === member.id ? "Owner of Server" : "Member of Server");
        msg.channel.send(userInfo);
        return;
    }

    private modifyTxt(permission: string): string {
        return permission.replace(
            /\w\S*/g,
            (txt: string): string => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    private getStatusStr(status: PresenceStatus | undefined, presenceType: string = ""): string {
        if (typeof status === "undefined") {
            return `⇒ ${presenceType} Status: \`Offline\` ⚫`;
        }
        // we could probably optimize this
        if (presenceType !== "") {
            if (status === "online") {
                return `⇒ ${presenceType} Status: \`Online\` 🟢`;
            }
            else if (status === "idle") {
                return `⇒ ${presenceType} Status: \`Idle\` 🟡`;
            }
            else if (status === "dnd") {
                return `⇒ ${presenceType} Status: \`Do Not Disturb\` 🔴`;
            }
            else {
                return `⇒ ${presenceType} Status: \`Offline\` ⚫`;
            }
        }
        else {
            if (status === "online") {
                return "⇒ Status: `Online` 🟢";
            }
            else if (status === "idle") {
                return "⇒ Status: `Idle` 🟡";
            }
            else if (status === "dnd") {
                return "⇒ Status: `Do Not Disturb` 🔴";
            }
            else {
                return "⇒ Status: `Offline` ⚫";
            }
        }
    }
}
