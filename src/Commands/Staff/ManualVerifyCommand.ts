import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, GuildMember, Role, Guild, MessageEmbed, MessageReaction, User, ReactionCollector, EmojiResolvable, Collection, TextChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { UserHandler } from "../../Helpers/UserHandler";
import { MessageUtil } from "../../Utility/MessageUtil";
import { ISection } from "../../Definitions/ISection";
import { GuildUtil } from "../../Utility/GuildUtil";
import { IManualVerification } from "../../Definitions/IManualVerification";
import { VerificationHandler } from "../../Helpers/VerificationHandler";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { AxiosResponse } from "axios";
import { ITiffitRealmEyeProfile, ITiffitNoUser } from "../../Definitions/ITiffitRealmEye";
import { Zero } from "../../Zero";
import { TiffitRealmEyeAPI } from "../../Constants/ConstantVars";
import { INameHistory, IAPIError } from "../../Definitions/ICustomREVerification";
import { FilterQuery } from "mongodb";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";

export class ManualVerifyCommand extends Command {
    private readonly _emojis: EmojiResolvable[] = [
        "☑️", "🔇", "❌"
    ];

    public constructor() {
        super(
            new CommandDetail(
                "Manual Verify",
                "manualverify",
                [],
                "Manually verifies a person. If they are currently pending manual verification, you will be given the details.",
                ["manualverify [@Mention | ID]"],
                ["manualverify", "manualverify @Console#8939"],
                0
            ),
            new CommandPermission(
                [],
                ["EMBED_LINKS"],
                ["support", "headRaidLeader", "officer", "moderator", "officer"],
                [],
                false
            ),
            true, // guild-only command. 
            false,
            false
        );
    }

	/**
	 * @inheritdoc
	 */
    public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
        const guild: Guild = msg.guild as Guild;

        if (args.length === 0) {
            let hasDone: boolean = false;
            const allSections: ISection[] = [GuildUtil.getDefaultSection(guildData), ...guildData.sections];
            for (const section of allSections) {
                const verifiedRole: Role | undefined = guild.roles.cache
                    .get(section.roles.verifiedRole);

                if (typeof verifiedRole === "undefined") {
                    continue;
                }

                const manualVerifyChannel: TextChannel | undefined = guild.channels.cache
                    .get(section.channels.manualVerification) as TextChannel | undefined;

                if (typeof manualVerifyChannel === "undefined") {
                    continue;
                }

                for (const manualVerifEntry of section.properties.manualVerificationEntries) {
                    const member: GuildMember | null = guild.member(manualVerifEntry.userId);
                    if (member === null) {
                        // remove entry
                        // TODO make this a function.
                        const filterQuery: FilterQuery<IRaidGuild> = section.isMain
                            ? { guildID: guild.id }
                            : {
                                guildID: guild.id,
                                "sections.channels.manualVerification": section.channels.manualVerification
                            };
                        const updateKey: string = section.isMain
                            ? "properties.manualVerificationEntries"
                            : "sections.$.properties.manualVerificationEntries";

                        await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne(filterQuery, {
                            $pull: {
                                [updateKey]: {
                                    userId: manualVerifEntry.userId
                                }
                            }
                        });

                        continue;
                    }

                    hasDone = true;

                    const verifEmbed: MessageEmbed = new MessageEmbed()
                        .setAuthor(member.user.tag, member.user.displayAvatarURL())
                        .setTitle(`Manual Verification: **${section.nameOfSection}**`)
                        .setColor("YELLOW")
                        .setDescription(`⇒ **Section:** ${section.nameOfSection}\n ⇒ **User:** ${member}\n⇒ **IGN:** ${manualVerifEntry.inGameName}\n⇒ **RealmEye:** [Profile](https://www.realmeye.com/player/${manualVerifEntry.inGameName})\n\nReact with ☑️ to manually verify this person.\nReact with 🔇 to ignore this entry.\nReact with ❌ to deny this person entry.\n\nIf the bot doesn't respond after you react, wait 5 seconds and then un-react & re-react.`)
                        .setFooter(`ID: ${member.id}`);

                    const m: Message = await msg.channel.send(verifEmbed);
                    for await (const emoji of this._emojis) {
                        await m.react(emoji).catch(() => { });
                    }

                    const response: "yes" | "no" | "ignore" | "time" = await new Promise(async (resolve) => {
                        const reactFilter: ((r: MessageReaction, u: User) => boolean) = (reaction: MessageReaction, user: User) => {
                            return this._emojis.includes(reaction.emoji.name) && user.id === msg.author.id;
                        }

                        const reactCollector: ReactionCollector = m.createReactionCollector(reactFilter, {
                            time: 1 * 60 * 1000,
                            max: 1
                        });

                        reactCollector.on("end", (collected: Collection<string, MessageReaction>, reason: string) => {
                            if (reason === "time") {
                                return resolve("time");
                            }
                        });

                        reactCollector.on("collect", (reaction: MessageReaction) => {
                            reactCollector.stop();
                            if (reaction.emoji.name === "❌") {
                                return resolve("no");
                            }
                            else if (reaction.emoji.name === "☑️") {
                                return resolve("yes");
                            }
                            else if (reaction.emoji.name === "🔇") {
                                return resolve("ignore");
                            }
                        });
                    });

                    await m.delete().catch(e => { });

                    if (response === "time") {
                        return;
                    }

                    if (response === "ignore") {
                        continue;
                    }


                    let verifM: Message;
                    try {
                        verifM = await manualVerifyChannel.messages.fetch(manualVerifEntry.msgId);
                        await verifM.delete().catch(e => { });
                    }
                    catch (e) { }


                    if (response === "no") {
                        VerificationHandler.denyManualVerification(
                            member,
                            msg.member as GuildMember,
                            section,
                            manualVerifEntry
                        );
                    }
                    else {
                        VerificationHandler.acceptManualVerification(
                            member,
                            msg.member as GuildMember,
                            section,
                            manualVerifEntry,
                            guildData
                        );
                    }
                }
            }

            if (!hasDone) {
                MessageUtil.send({ content: "There are no pending manual verifications." }, msg.channel);
            }
            return;
        }

        const mention: GuildMember | null = await UserHandler.resolveMember(msg, guildData);
        if (mention === null) {
            MessageUtil.send({ content: "The member you have selected does not exist. Try again. " }, msg.channel);
            return;
        }
        const selectionEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle("**Manual Verification Type Selection**")
            .setDescription(`You will be manually verifying: ${mention}.\n\nType \`1\` to check if this person needs to be manually verified in any sections.\nType \`2\` to manually verify this person now (in the main section).\nType \`cancel\` to cancel this process.`)
            .setColor("RANDOM")
            .setFooter("Manual Verification");
        const num: number | "TIME" | "CANCEL" = await new GenericMessageCollector<number>(
            msg,
            { embed: selectionEmbed },
            2,
            TimeUnit.MINUTE
        ).send(GenericMessageCollector.getNumber(msg.channel, 1, 2));

        if (num === "TIME" || num === "CANCEL") {
            return;
        }

        if (num === 1) {
            let isFound: boolean = false;
            const allSections: ISection[] = [GuildUtil.getDefaultSection(guildData), ...guildData.sections];
            for (const section of allSections) {
                const verifiedRole: Role | undefined = guild.roles.cache
                    .get(section.roles.verifiedRole);

                if (typeof verifiedRole === "undefined") {
                    continue;
                }

                const manualVerifEntry: IManualVerification | undefined = section.properties.manualVerificationEntries
                    .find(x => x.userId === mention.id);

                if (typeof manualVerifEntry === "undefined") {
                    continue;
                }

                const manualVerifyChannel: TextChannel | undefined = guild.channels.cache
                    .get(section.channels.manualVerification) as TextChannel | undefined;

                if (typeof manualVerifyChannel === "undefined") {
                    continue;
                }

                isFound = true;

                const verifEmbed: MessageEmbed = new MessageEmbed()
                    .setAuthor(mention.user.tag, mention.user.displayAvatarURL())
                    .setTitle(`Manual Verification: **${section.nameOfSection}**`)
                    .setColor("YELLOW")
                    .setDescription(`⇒ **Section:** ${section.nameOfSection}\n ⇒ **User:** ${mention}\n⇒ **IGN:** ${manualVerifEntry.inGameName}\n⇒ **RealmEye:** [Profile](https://www.realmeye.com/player/${manualVerifEntry.inGameName})\n\nReact with ☑️ to manually verify this person.\nReact with 🔇 to ignore this entry.\nReact with ❌ to deny this person entry.\n\nIf the bot doesn't respond after you react, wait 5 seconds and then un-react & re-react.`)
                    .setFooter(`ID: ${mention.id}`);

                const m: Message = await msg.channel.send(verifEmbed);
                for await (const emoji of this._emojis) {
                    await m.react(emoji).catch(() => { });
                }

                const response: "yes" | "no" | "ignore" | "time" = await new Promise(async (resolve) => {
                    const reactFilter: ((r: MessageReaction, u: User) => boolean) = (reaction: MessageReaction, user: User) => {
                        return this._emojis.includes(reaction.emoji.name) && user.id === msg.author.id;
                    }

                    const reactCollector: ReactionCollector = m.createReactionCollector(reactFilter, {
                        time: 1 * 60 * 1000,
                        max: 1
                    });

                    reactCollector.on("end", (collected: Collection<string, MessageReaction>, reason: string) => {
                        if (reason === "time") {
                            return resolve("time");
                        }
                    });

                    reactCollector.on("collect", (reaction: MessageReaction) => {
                        reactCollector.stop();
                        if (reaction.emoji.name === "❌") {
                            return resolve("no");
                        }
                        else if (reaction.emoji.name === "☑️") {
                            return resolve("yes");
                        }
                        else if (reaction.emoji.name === "🔇") {
                            return resolve("ignore");
                        }
                    });
                });

                await m.delete().catch(e => { });

                if (response === "time") {
                    return;
                }

                if (response === "ignore") {
                    continue;
                }


                let verifM: Message;
                try {
                    verifM = await manualVerifyChannel.messages.fetch(manualVerifEntry.msgId);
                    await verifM.delete().catch(e => { });
                }
                catch (e) { }


                if (response === "no") {
                    VerificationHandler.denyManualVerification(
                        mention,
                        msg.member as GuildMember,
                        section,
                        manualVerifEntry
                    );
                }
                else {
                    VerificationHandler.acceptManualVerification(
                        mention,
                        msg.member as GuildMember,
                        section,
                        manualVerifEntry,
                        guildData
                    );
                }
            }

            if (!isFound) {
                MessageUtil.send({ content: `${mention} does not have any pending manual verification applications.` }, msg.channel);
                return;
            }
        }
        else {
            const verificationSuccessChannel: TextChannel | undefined = guild.channels.cache
                .get(guildData.generalChannels.logging.verificationSuccessChannel) as TextChannel | undefined;

            if (!guild.roles.cache.has(guildData.roles.raider)) {
                MessageUtil.send({ content: "A member role was not set for this server." }, msg.channel);
                return;
            }

            if (mention.roles.cache.has(guildData.roles.raider) || mention.roles.cache.has(guildData.roles.suspended)) {
                MessageUtil.send({ content: `${mention} is already verified. ` }, msg.channel);
                return;
            }

            const selectionEmbed: MessageEmbed = new MessageEmbed()
                .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                .setTitle("**In-Game Name**")
                .setDescription(`You will be manually verifying: ${mention}. Type the in-game name that you want to verify this person with. To cancel this process, type \`-cancel\`.`)
                .setColor("RANDOM")
                .setFooter("Manual Verification");
            const name: string | "TIME" | "CANCEL" | "ERROR_" = await new GenericMessageCollector<string | "ERROR_">(
                msg,
                { embed: selectionEmbed },
                3,
                TimeUnit.MINUTE
            ).send(
                async (collectedMessage: Message) => {
                    if (!/^[a-zA-Z]+$/.test(collectedMessage.content)) {
                        await MessageUtil.send({ content: "Please type a __valid__ in-game name." }, msg.channel);
                        return;
                    }

                    if (collectedMessage.content.length > 10) {
                        await MessageUtil.send({ content: "Your in-game name should not exceed 10 characters. Please try again." }, msg.channel);
                        return;
                    }

                    if (collectedMessage.content.length === 0) {
                        await MessageUtil.send({ content: "Please type in a valid in-game name." }, msg.channel);
                        return;
                    }

                    let requestData: AxiosResponse<ITiffitNoUser | ITiffitRealmEyeProfile>;
                    try {
                        requestData = await Zero.AxiosClient
                            .get<ITiffitNoUser | ITiffitRealmEyeProfile>(TiffitRealmEyeAPI + collectedMessage.content);
                    }
                    catch (e) {
                        return "ERROR_";
                    }

                    if ("error" in requestData.data) {
                        await MessageUtil.send({ content: `The profile, \`${collectedMessage.content}\`, could not be found.` }, msg.channel);
                        return;
                    }
                    else {
                        return requestData.data.name;
                    }
                }, "-cancel"
            );

            if (name === "TIME" || name === "CANCEL") {
                return;
            }

            if (name === "ERROR_") {
                MessageUtil.send({ content: "There was a problem connecting to RealmEye so your request could not be made." }, msg.channel);
                return;
            }

            let nameHistory: INameHistory[] | IAPIError;
            try {
                nameHistory = await VerificationHandler.getRealmEyeNameHistory(name);
            } catch (e) {
                MessageUtil.send({ content: "An error has occurred when trying to check this person's Name History. This is most likely because RealmEye is down or slow. Process canceled." }, msg.channel);
                return;
            }

            if ("errorMessage" in nameHistory) {
                MessageUtil.send({ content: "This person's Name History is not public! Ensure the person's name history is public and then try again." }, msg.channel);
                return;
            }

            // BLACKLIST CHECK
            for (const blacklistEntry of guildData.moderation.blacklistedUsers) {
                for (const nameEntry of nameHistory.map(x => x.name)) {
                    if (blacklistEntry.inGameName.toLowerCase() === nameEntry.toLowerCase()) {
                        MessageUtil.send({ content: `The in-game name, \`${nameEntry}${nameEntry.toLowerCase() === name.toLowerCase() ? "" : " (found in Name History)"}, has been blacklisted due to the following reason: ${blacklistEntry.reason}` }, msg.channel, 10 * 1000);
                        return;
                    }
                }
            }

            if (typeof verificationSuccessChannel !== "undefined") {
                verificationSuccessChannel.send(`📥 **\`[Main]\`** ${mention} has been manually verified as \`${name}\`. This manual verification was done by ${msg.author} (${(msg.member as GuildMember).displayName})`).catch(console.error);
            }
            await mention.roles.add(guildData.roles.raider);
            await mention.setNickname(mention.user.username === name ? `${name}.` : name).catch(() => { });

            await VerificationHandler.accountInDatabase(mention, name, nameHistory);
            await VerificationHandler.findOtherUserAndRemoveVerifiedRole(mention, guild, guildData);
        }
    }
}