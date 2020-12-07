import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Guild, GuildMember, Message, MessageAttachment, MessageEmbed, VoiceChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { InternalPrivateApi } from "../../Private/Api/InternalPrivateApi";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { ArrayUtil } from "../../Utility/ArrayUtil";
import { UserHandler } from "../../Helpers/UserHandler";

export class ParseWhoCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Parse Who Command",
                "parsewho",
                ["parse"],
                "Parses a /who screenshots.",
                ["parsewho <Attachment>"],
                ["parsewho <Attach Screenshot>"],
                0
            ),
            new CommandPermission(
                [],
                [],
                ["support"],
                ["ALL_RLS"],
                true
            ),
            true, // guild-only command. 
            false,
            false,
            -1
        );
    }

    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {
        const member: GuildMember = msg.member as GuildMember;

        const checkApi: boolean = await InternalPrivateApi.checkIfApiIsOnline();
        if (!checkApi) {
            const errorNoApiEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
                .setTitle("Parse API Not Online")
                .setDescription("The parsing API is currently offline. Please try again later.")
                .setFooter("Parse API Offline.");
            MessageUtil.send({ embed: errorNoApiEmbed }, msg.channel, 5000);
            return;
        }

        const voiceChannel: VoiceChannel | null = member.voice.channel;
        if (voiceChannel === null) {
            const errorNoVcEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
                .setTitle("Not In Voice Channel")
                .setDescription("You are not in a raid voice channel. Please join a raiding voice channel and try again.")
                .setFooter("No Voice Channel.");
            MessageUtil.send({ embed: errorNoVcEmbed }, msg.channel, 5000);
            return;
        }

        const attachments: MessageAttachment[] = Array.from(msg.attachments.values());
        let imageUrl: string = "";
        if (attachments.length === 0 || attachments[0].height === null) {
            const promptEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
                .setTitle("Upload /who Screenshot")
                .setDescription("Please upload a screenshot that only contains the `/who` information. Your screenshot should be cropped to the best of your ability so that only the `/who` is present.\n\nTo cancel, simply type `cancel`.")
                .setFooter("Upload a PNG or JPG Image.");

            const screenshot: MessageAttachment | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<MessageAttachment>(msg.author, {
                embed: promptEmbed
            }, 3, TimeUnit.MINUTE, msg.channel)
                .send(async (msg) => {
                    const a: MessageAttachment[] = Array.from(msg.attachments.values());
                    if (a.length > 0 && a[0].height !== null) {
                        return a[0];
                    }

                    const errorMessageEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author, "RED")
                        .setTitle("Invalid Attachment")
                        .setDescription("Please only upload a PNG or JPG file.")
                        .setFooter("Invalid Image Provided.");

                    MessageUtil.send({ embed: errorMessageEmbed }, msg.channel, 5000);
                }, "cancel", false, null, true);

            if (screenshot === "CANCEL_CMD" || screenshot === "TIME_CMD") {
                return;
            }

            imageUrl = screenshot.url;
        }
        else {
            imageUrl = attachments[0].url;
        }

        const parseResults: string[] = (await InternalPrivateApi.parseWho(imageUrl))
            .map(x => x.replaceAll("0", "O").replaceAll("1", "I"));
        if (parseResults.length === 0) {
            const errorParseEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
                .setTitle("No Names Found")
                .setDescription("The parse API could not find any names. Make sure the screenshot provided only has `Player Online (Count)` and the names, and that there aren't any obstructions that may affect the quality of the screenshot.")
                .setFooter("No Results Found.");
            MessageUtil.send({ embed: errorParseEmbed }, msg.channel, 8000);
            return;
        }

        const vcMembers: GuildMember[] = Array.from(voiceChannel.members.values());

        // begin scan
        let membersInVcNotInWho: GuildMember[] = [];

        let membersNotInVcInWho: GuildMember[] = [];
        let ignNotInVcInWho: string[] = [];

        // check if we have any crashers
        for (const result of parseResults) {
            let isFound: boolean = false;

            memberLoop:
            for (const member of vcMembers) {
                const igns: string[] = member.displayName
                    .split("|")
                    .map(x => x.replace(/[^A-Za-z]/g, ""));

                // check each ign
                for (const ign of igns) {
                    if (ign.toLowerCase() === result.toLowerCase()) {
                        isFound = true;
                        break memberLoop;
                    }
                }
            }

            if (!isFound) {
                const memberQuery = UserHandler.findUserByInGameName(msg.guild as Guild, result, guildDb);
                if (Array.isArray(memberQuery)) {
                    ignNotInVcInWho.push(result);
                }
                else {
                    membersNotInVcInWho.push(memberQuery);
                }
            }
        }

        // check if we have any people in vc not in who
        for (const member of vcMembers) {
            const igns: string[] = member.displayName
                .split("|")
                .map(x => x.replace(/[^A-Za-z]/g, ""));

            let foundInWho: boolean = false;

            ignLoop:
            for (const ign of igns) {
                for (const result of parseResults) {
                    if (result.toLowerCase() === ign.toLowerCase()) {
                        foundInWho = true;
                        break ignLoop;
                    }
                }
            }

            if (!foundInWho) {
                membersInVcNotInWho.push(member);
            }
        }

        // display crasher info
        const desc: string = new StringBuilder()
            .append(`⇒ **/who Names:** ${parseResults.length}`)
            .appendLine()
            .append(`⇒ **VC Members:** ${vcMembers.length}`)
            .appendLine()
            .appendLine()
            .append(`⇒ **In VC, Not In /who:** ${membersInVcNotInWho.length}`)
            .appendLine()
            .append(`⇒ **Members In /who, Not In VC:** ${membersNotInVcInWho.length}`)
            .appendLine()
            .append(`⇒ **Non-Members In /who, Not In VC:** ${ignNotInVcInWho.length}`)
            .toString();

        const displayIgnInWhoNotVc: string[] = ArrayUtil.arrayToStringFields<string>(
            ignNotInVcInWho,
            (i, elem) => `**\`[${i + 1}]\`** ${elem}\n`
        );

        const displayIgnInVcNotWho: string[] = ArrayUtil.arrayToStringFields<GuildMember>(
            membersInVcNotInWho,
            (i, elem) => `**\`[${i + 1}]\`** ${elem}\n`
        );

        const displayMembersInWhoNotVc: string[] = ArrayUtil.arrayToStringFields<GuildMember>(
            membersNotInVcInWho,
            (i, elem) => `**\`[${i + 1}]\`** ${elem}\n`
        );

        const crasherSummary: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
            .setTitle(`**${voiceChannel.name}** ⇒ Parse Results`)
            .setDescription(desc)
            .setFooter("It is your responsibility to ensure that the parse results are accurate.");

        for (const elem of displayMembersInWhoNotVc) {
            crasherSummary.addField("Server Members Crashing (In /who, Not In VC)", elem);
        }

        for (const elem of displayIgnInWhoNotVc) {
            crasherSummary.addField("Non-Server Members Crashing (In /who, Not In VC)", elem);
        }

        for (const elem of displayIgnInVcNotWho) {
            crasherSummary.addField("Potential Alt. Accounts (In VC, Not /who)", elem);
        }

        msg.channel.send(crasherSummary)
            .catch(e => { });
    }
}