import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, DMChannel, Guild, GuildMember } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { IRaidUser } from "../../Templates/IRaidUser";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { MessageUtil } from "../../Utility/MessageUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { IVoidVials, IKeyPops, ICompletedRuns, ILeaderRuns, IWineCellarOryx } from "../../Definitions/UserDBProps";
import { GuildUtil } from "../../Utility/GuildUtil";

export class ViewServerProfileCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "View Server Profile Command",
                "serverprofile",
                ["viewserverprofile"],
                "Allows you to view your server profile.",
                ["serverprofile"],
                ["serverprofile"],
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
            const response: Guild | "CANCEL" | null = await GuildUtil.getGuild(msg, dmChannel);
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
        main: for (let listedName of names) {
            console.log(listedName);
            // check main account
            if (listedName.toLowerCase() === userDb.rotmgLowercaseName) {
                nameStr.append(`[${++index}] ${listedName} (M)`)
                    .appendLine();
                continue;
            }

            // check alt accounts
            for (const name of userDb.otherAccountNames) {
                if (name.lowercase === listedName.toLowerCase()) {
                    nameStr.append(`[${++index}] ${listedName} (A)`)
                        .appendLine();
                    continue main;
                }
            }

            nameStr.append(`[${++index}] ${listedName} ⚠️`)
                .appendLine();
        } // end loop



        const mEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle(`Server Profile: **${guild.name}**`)
            .setColor("RANDOM")
            .setFooter("Server Profile.")
            .setDescription(`Current Server Nickname: ${StringUtil.applyCodeBlocks(nameStr.toString())}\n\nTo see all available server profile commands, use the \`;sphelp\` command. To view your user profile, use the \`;userprofile\` command.`);

        // key pops
        const keyPops: IKeyPops | undefined = userDb.general.keyPops.find(x => x.server === guild.id);

        // void vials
        const voidVials: IVoidVials | undefined = userDb.general.voidVials.find(x => x.server === guild.id);
        const vvSB: StringBuilder = new StringBuilder()
            .append(`Popped: ${typeof voidVials === "undefined" ? 0 : voidVials.popped}`)
            .appendLine()
            .append(`Stored: ${typeof voidVials === "undefined" ? 0 : voidVials.stored}`);

        // completed runs
        const completedRuns: ICompletedRuns | undefined = userDb.general.completedRuns.find(x => x.server === guild.id);
        const crSB: StringBuilder = new StringBuilder()
            .append(`General: ${typeof completedRuns === "undefined" ? 0 : completedRuns.general}`)
            .appendLine()
            .append(`Endgame: ${typeof completedRuns === "undefined" ? 0 : completedRuns.endgame}`)
            .appendLine()
            .append(`Realm Clearing: ${typeof completedRuns === "undefined" ? 0 : completedRuns.realmClearing}`)
            .appendLine();

        // leaders
        const leaderRuns: ILeaderRuns | undefined = userDb.general.leaderRuns.find(x => x.server === guild.id);
        const lrSB: StringBuilder = new StringBuilder()
            .append(`General: ${typeof leaderRuns === "undefined" ? 0 : leaderRuns.general}`)
            .appendLine()
            .append(`Endgame: ${typeof leaderRuns === "undefined" ? 0 : leaderRuns.endgame}`)
            .appendLine()
            .append(`Realm Clearing: ${typeof leaderRuns === "undefined" ? 0 : leaderRuns.realmClearing}`)
            .appendLine();

        const wc: IWineCellarOryx | undefined = userDb.general.wcOryx.find(x => x.server === guild.id);
        const wcSB: StringBuilder = new StringBuilder()
            .append(`WC Stored: ${typeof wc === "undefined" ? 0 : wc.wcIncs.amt}`)
            .appendLine()
            .append(`WC Popped: ${typeof wc === "undefined" ? 0 : wc.wcIncs.popped}`)
            .appendLine()
            .append(`Sword Rune Stored: ${typeof wc === "undefined" ? 0 : wc.swordRune.amt}`)
            .appendLine()
            .append(`Sword Rune Popped: ${typeof wc === "undefined" ? 0 : wc.swordRune.popped}`)
            .appendLine()
            .append(`Shield Rune Stored: ${typeof wc === "undefined" ? 0 : wc.shieldRune.amt}`)
            .appendLine()
            .append(`Shield Rune Popped: ${typeof wc === "undefined" ? 0 : wc.shieldRune.popped}`)
            .appendLine()
            .append(`Helm Rune Stored: ${typeof wc === "undefined" ? 0 : wc.helmRune.amt}`)
            .appendLine()
            .append(`Helm Rune Popped: ${typeof wc === "undefined" ? 0 : wc.helmRune.popped}`)
            .appendLine();

        mEmbed.addField("Keys Used", StringUtil.applyCodeBlocks(typeof keyPops === "undefined" ? 0 : keyPops.keysPopped), true)
            .addField("Vial Information", StringUtil.applyCodeBlocks(vvSB.toString()), true)
            .addField("Oryx III Information", StringUtil.applyCodeBlocks(wcSB.toString()))
            .addField("Runs Completed", StringUtil.applyCodeBlocks(crSB.toString()), true)
            .addField("Runs Led", StringUtil.applyCodeBlocks(lrSB.toString()), true);

        await dmChannel.send(mEmbed);
    }
}