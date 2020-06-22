import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, Role, Guild, GuildEmoji, Emoji, VerificationLevel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { DateUtil } from "../../Utility/DateUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { StringBuilder } from "../../Classes/String/StringBuilder";

export class ServerInfoCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Server Information",
                "serverinfo",
                ["guildinfo"],
                "Gets details about the server.",
                ["serverinfo"],
                ["serverinfo"],
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

        let serverRoles: Role[] = guild.roles.cache
            .sort((a, b) => b.position - a.position)
            .array();
        let serverRolesStr: string = "";
        
        // assume each id is length 22 and an extra comma & space (+2) = 24. 
        if (serverRoles.length === 0) {
            serverRolesStr = StringUtil.applyCodeBlocks("N/A");
        }
        else {
            if (serverRoles.length > 38) { 
                serverRolesStr = serverRoles.splice(0, 38).join(", ") + "...";
            }
            else {
                serverRolesStr = serverRoles.join(" ");
            }
        }
        
        const stringBuilder: StringBuilder = new StringBuilder()
            .append(`⇒ Server ID: ${guild.id}`)
            .appendLine()
            .append(`⇒ Region: ${guild.region.replace(/\W/g, " ").toUpperCase()}`)
            .appendLine()
            .append(`⇒ Everyone Role: ${guild.roles.everyone} (${guild.roles.everyone.id})`)
            .appendLine();

        if (guild.premiumSubscriptionCount !== null) {
            stringBuilder.append(`⇒ Nitro Boost: ${guild.premiumSubscriptionCount}`)
                .appendLine();
        }
        if (guild.owner !== null) {
            stringBuilder.append(`⇒ Owner: ${guild.owner}`)
                .appendLine();
        }

        const channelBuilder: StringBuilder = new StringBuilder()
            .append(`📁 Categories: ${guild.channels.cache.filter(x => x.type === "category").size}`)
            .appendLine()
            .append(`#️⃣ Text: ${guild.channels.cache.filter(x => x.type === "text").size}`)
            .appendLine()
            .append(`🎤 Voice: ${guild.channels.cache.filter(x => x.type === "voice").size}`)
            .appendLine()
            .append(`📰 News: ${guild.channels.cache.filter(x => x.type === "news").size}`);

        const onlineCount: number = guild.members.cache.filter(m => m.user.presence.status === "online").size;
        const offlineCount: number = guild.members.cache.filter(m => m.user.presence.status === "offline").size;
        const dndCount: number = guild.members.cache.filter(m => m.user.presence.status === "dnd").size;
        const idleCount: number = guild.members.cache.filter(m => m.user.presence.status === "idle").size;
        const memberBuilder: StringBuilder = new StringBuilder()
            .append(`🟢 Online: ${onlineCount}`)
            .appendLine()
            .append(`🟡 Idle: ${idleCount}`)
            .appendLine()
            .append(`🔴 DND: ${dndCount}`)
            .appendLine()
            .append(`⚫ Offline: ${offlineCount}`);

        const embed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle(`Guild: **${guild.name}**`)
            .setColor("RANDOM")
            .setFooter(guild.name)
            .setTimestamp()
            .setDescription(stringBuilder.toString())
            .addField("Verification Level", StringUtil.applyCodeBlocks(this.veriToText(guild.verificationLevel)), true)
            .addField("Created On", StringUtil.applyCodeBlocks(DateUtil.getTime(guild.createdTimestamp)), true)
            .addField(`Roles (${guild.roles.cache.size})`, serverRolesStr)
            .addField(`Channels (${guild.channels.cache.size})`, StringUtil.applyCodeBlocks(channelBuilder), true)
            .addField(`Members (${guild.memberCount})`, StringUtil.applyCodeBlocks(memberBuilder), true);

        // Begin Emojis
        let str: string = "";
        let index: number = 1;
        for (const [id, emoji] of guild.emojis.cache) {
            if (str.length + emoji.toString().length > 1024) {
                embed.addField(`Emojis (${guild.emojis.cache.size}) (Part ${index})`, str);
                str = emoji.toString();
            }
            else {
                str += emoji.toString();
            }
        }

        if (str.length !== 0) {
            embed.addField(`Emojis (${guild.emojis.cache.size}) (Part ${++index})`, str);
        }

        await msg.channel.send(embed).catch(e => { });
    }

    /**Gets the verification information from the text. */
    private veriToText(lvl: VerificationLevel): string {
        switch (lvl) {
            case "NONE":
                return "None";
            case "LOW":
                return "Verified Email";
            case "MEDIUM":
                return "Verified Email & Member for 5+ Minutes";
            case "HIGH":
                return "Verified Email & Member for 10+ Minutes";
            case "VERY_HIGH":
                return "Verified Phone";
            default:
                return ""; // not possible i hope
        }
    }
}