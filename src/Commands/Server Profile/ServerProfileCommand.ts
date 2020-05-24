import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, DMChannel, Guild, MessageManager, GuildMember } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { IRaidUser } from "../../Templates/IRaidUser";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { MessageUtil } from "../../Utility/MessageUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { IVoidVials, IKeyPops, ICompletedRuns, ILeaderRuns, IWineCellarOryx } from "../../Definitions/UserDBProps";

export class ServerProfileCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "View Profile Command",
                "userprofile",
                ["viewprofile"],
                "Allows you to view your current profile. If executed in a server, you will see server-specific settings.",
                ["userprofile"],
                ["userprofile"],
                0
            ),
            new CommandPermission(
                [],
                [],
                [],
                [],
                true
            ),
            false, // guild-only command. 
            false,
            false
        );
    }

    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {
        let dmChannel: DMChannel;
        try {
            dmChannel = await msg.author.createDM();
        }
        catch (e) {
            await msg.channel.send(`${msg.member}, I cannot DM you. Please make sure your privacy settings are set so anyone can send messages to you.`).catch(() => { });
            return;
        }

        const userDb: IRaidUser | null = await MongoDbHelper.MongoDbUserManager.getUserDbByDiscordId(msg.author.id);
        if (userDb === null) {
            MessageUtil.send({ content: "You do not have a profile registered with the bot. Please contact an administrator or try again later." }, dmChannel, 1 * 60 * 1000);
            return;
        }

        
        let guild: Guild;
        if (msg.guild === null) {
            const response: Guild | "CANCEL" | null = await this.getGuild(msg, dmChannel);
            if (response === "CANCEL") {
                return;
            }

            if (response === null) {
                MessageUtil.send({ content: "You are unable to use this command because you are not verified in any servers that the bot is in." }, msg.channel);
                return;
            }

            guild = response;
        }
        else {
            guild = msg.guild;
        }

        // first, get nickname
        const resolvedMember: GuildMember | null = guild.member(msg.author.id);
        if (resolvedMember === null) {
            return;
        }

        const names: string[] = resolvedMember.displayName
            .split("|")
            .map(x => x.replace(/[^a-zA-Z0-9]/g, "").trim());

        // make sure names correspond
        let nameStr: StringBuilder = new StringBuilder();
        let index: number = 0;
        let hasUnverifiedName: boolean = false;
        for (let listedName of names) {
            // check main account
            if (listedName.toLowerCase() === userDb.rotmgLowercaseName) {
                nameStr.append(`[${++index}] ${listedName} (M)`)
                    .appendLine();
                continue;
            }

            // check alt accounts
            let isFound: boolean = false;
            for (const name of userDb.otherAccountNames) {
                if (name.lowercase === listedName) {
                    nameStr.append(`[${++index}] ${listedName} (A)`)
                        .appendLine();
                    isFound = true;
                    break;
                }
            }

            if (isFound) {
                continue;
            }

            nameStr.append(`[${++index}] ${listedName} \`⚠️\``)
                .appendLine();
            hasUnverifiedName = true;
        } // end loop

        const commandSB: StringBuilder = new StringBuilder()
            .append("⇒ Manage Profile")
            .appendLine()
            .append("To manage your profile (including the ability to add an alternative account IGN to your profile so you can use it in any server or remove an alternative account IGN), run the `;userprofile` command.")
            .appendLine()
            .appendLine();
        if (names.length + 1 <= 2) {
            commandSB.append("⇒ Add Name To Display")
                .appendLine()
                .append("To add a linked alternative account IGN to your server nickname, use the `;addservername` command.")
                .appendLine()
                .appendLine();
        }

        // NOTE: Make sure you read the server's Discord & raiding rules; some servers require that the IGN corresponding to the account you want to use in a server raid be in your nickname.
        if (names.length !== 1) {
            commandSB.append("⇒ Remove Name From Display")
                .appendLine()
                .append("To remove an alternative account IGN from your server nickname, use the `;removeservername` command.")
                .appendLine()
                .appendLine();
        }

        if (hasUnverifiedName) {
            commandSB.append("⇒ Remove Unverified Names")
                .appendLine()
                .append("To remove an unverified IGN from your server nickname, use the `;removeunverified` command.")
                .appendLine()
                .appendLine();
        }

        commandSB.append("⇒ Unverify From Server")
            .appendLine()
            .append("To unverify yourself from this server, use the `;serverunverify` command. You will no longer be able to manage your server profile for this server and your nickname will be reset.");

        const mEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle(`Server Profile: **${guild.name}**`)
            .setColor("RANDOM")
            .setDescription(commandSB.toString());
        
        const keyPops: IKeyPops | undefined = userDb.general.keyPops.find(x => x.server === guild.id);
        const voidVials: IVoidVials | undefined = userDb.general.voidVials.find(x => x.server === guild.id);
        const completedRuns: ICompletedRuns | undefined = userDb.general.completedRuns.find(x => x.server === guild.id);
        const leaderRuns: ILeaderRuns | undefined = userDb.general.leaderRuns.find(x => x.server === guild.id);
        const wc: IWineCellarOryx | undefined = userDb.general.wcOryx.find(x => x.server === guild.id);
        
        
    }

    /**
     * Gets a guild.
     * @param msg The message object.
     */
    private async getGuild(msg: Message, dmChannel: DMChannel): Promise<Guild | null | "CANCEL"> {
        const allGuilds: IRaidGuild[] = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.find({}).toArray();
        const embed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setDescription("Please select the server that you want to configure your profile for.")
            .setColor("RANDOM")
            .setFooter("Zero");

        let str: string = "";
        let index: number = 0;
        const validGuilds: Guild[] = [];
        for (const guildEntry of allGuilds) {
            for (const [id, guild] of msg.client.guilds.cache) {
                if (guild.id !== guildEntry.guildID) {
                    continue; // not the right guild
                }

                if (!guild.roles.cache.has(guildEntry.roles.raider)
                    || guild.members.cache.has(msg.author.id)) {
                    break; // found guild but no verified role OR not a member of the server
                }

                const resolvedMember: GuildMember = guild.member(msg.author) as GuildMember;

                if (!resolvedMember.roles.cache.has(guildEntry.roles.raider)) {
                    break; // not verified
                }

                validGuilds.push(guild);
                const tempStr: string = `[${++index}] ${guild.name}`;
                if (str.length + tempStr.length > 1000) {
                    embed.addField("Guild Selection", StringUtil.applyCodeBlocks(str));
                    str = tempStr;
                }
                else {
                    str += tempStr;
                }
            }
        } // end major loop

        if (validGuilds.length === 0) {
            return null;
        }

        if (embed.fields.length === 0) {
            embed.addField("Guild Selection", StringUtil.applyCodeBlocks(str));   
        }

        const num: number | "CANCEL" | "TIME" = await new GenericMessageCollector<number>(
            msg.author,
            { embed: embed },
            2,
            TimeUnit.MINUTE,
            dmChannel
        ).send(GenericMessageCollector.getNumber(dmChannel, 1, validGuilds.length));

        if (num === "CANCEL" || num === "TIME") {
            return "CANCEL";
        }

        return validGuilds[num];
    }
}