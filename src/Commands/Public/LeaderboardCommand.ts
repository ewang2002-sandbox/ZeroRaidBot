// TODO make code more concise. 

import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Guild, GuildMember, Message, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { IRaidUser } from "../../Templates/IRaidUser";
import { ArrayUtil } from "../../Utility/ArrayUtil";
import { ICompletedRuns, IKeyPops, ILeaderRuns, IWineCellarOryx } from "../../Definitions/UserDBProps";

export class LeaderboardCommand extends Command {

    public constructor() {
        super(
            new CommandDetail(
                "Leaderboard Command",
                "leaderboard",
                [],
                "Displays the top 20 people for each category.",
                ["leaderboard [quotaledruns | totalledruns | keys | runes | runs]"],
                ["leaderboard keys"],
                1
            ),
            new CommandPermission(
                [],
                [],
                ["raider"],
                [],
                true
            ),
            true, // guild-only command. 
            false,
            false,
            0
        );
    }

    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {
        const guild: Guild = msg.guild as Guild;
        const argType: string = args[0].toLowerCase();
        const displayEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author);

        let argTypeName: string = "";
        let thisMembersStats: string = "";
        let leaderboardStats: string[] = [];

        const allUsers = await MongoDbHelper.MongoDbUserManager.MongoUserClient.find({}).toArray();
        if (argType === "totalledruns") {
            argTypeName = "Total Runs Led";
            const totalLedRuns: IRaidUser[] = allUsers.filter(x => x.general.leaderRuns.some(x => x.server === guild.id))
                .sort((a, b) => {
                    const guildIndexB: number = b.general.leaderRuns.findIndex(x => x.server === guild.id);
                    const guildIndexA: number = a.general.leaderRuns.findIndex(x => x.server === guild.id);
                    // we assume that A and B are non-(-1)

                    return b.general.leaderRuns[guildIndexB].endgame.completed
                        + b.general.leaderRuns[guildIndexB].endgame.assists
                        + b.general.leaderRuns[guildIndexB].endgame.failed
                        + b.general.leaderRuns[guildIndexB].general.completed
                        + b.general.leaderRuns[guildIndexB].general.assists
                        + b.general.leaderRuns[guildIndexB].general.failed
                        + b.general.leaderRuns[guildIndexB].realmClearing.completed
                        + b.general.leaderRuns[guildIndexB].realmClearing.assists
                        + b.general.leaderRuns[guildIndexB].realmClearing.failed
                        - (
                            b.general.leaderRuns[guildIndexA].endgame.completed
                            + b.general.leaderRuns[guildIndexA].endgame.assists
                            + b.general.leaderRuns[guildIndexA].endgame.failed
                            + b.general.leaderRuns[guildIndexA].general.completed
                            + b.general.leaderRuns[guildIndexA].general.assists
                            + b.general.leaderRuns[guildIndexA].general.failed
                            + b.general.leaderRuns[guildIndexA].realmClearing.completed
                            + b.general.leaderRuns[guildIndexA].realmClearing.assists
                            + b.general.leaderRuns[guildIndexA].realmClearing.failed
                        );
                });
            const thisMembersIndex: number = totalLedRuns.findIndex(x => x.discordUserId === msg.author.id);
            if (thisMembersIndex === -1) {
                thisMembersStats = "You have not led a run at all!"
            }
            else {
                const thisMembersGuildIndex: number = totalLedRuns[thisMembersIndex].general.leaderRuns.findIndex(x => x.server === guild.id);
                if (thisMembersGuildIndex === -1) {
                    thisMembersStats = "You have not led a run at all!"
                }
                else {
                    thisMembersStats = `Current Rank: ${thisMembersIndex + 1}
                
General Runs Completed: ${totalLedRuns[thisMembersIndex].general.leaderRuns[thisMembersGuildIndex].general.completed}
General Runs Failed: ${totalLedRuns[thisMembersIndex].general.leaderRuns[thisMembersGuildIndex].general.failed}
General Runs Assisted: ${totalLedRuns[thisMembersIndex].general.leaderRuns[thisMembersGuildIndex].general.assists}
                    
Endgame Runs Completed: ${totalLedRuns[thisMembersIndex].general.leaderRuns[thisMembersGuildIndex].endgame.completed}
Endgame Runs Failed: ${totalLedRuns[thisMembersIndex].general.leaderRuns[thisMembersGuildIndex].endgame.failed}
Endgame Runs Assisted: ${totalLedRuns[thisMembersIndex].general.leaderRuns[thisMembersGuildIndex].endgame.assists}
                    
Realm Clearing Completed: ${totalLedRuns[thisMembersIndex].general.leaderRuns[thisMembersGuildIndex].realmClearing.completed}
Realm Clearing Failed: ${totalLedRuns[thisMembersIndex].general.leaderRuns[thisMembersGuildIndex].realmClearing.failed}
Realm Clearing Assisted: ${totalLedRuns[thisMembersIndex].general.leaderRuns[thisMembersGuildIndex].realmClearing.assists}`;
                }
            }

            const leaderboardInfo: [number, IRaidUser][] = ArrayUtil.generateLeaderboardArray<IRaidUser>(
                totalLedRuns,
                val => {
                    const leaderRunGuildInfo: ILeaderRuns = val.general.leaderRuns.find(x => x.server === guild.id) as ILeaderRuns;
                    return leaderRunGuildInfo.endgame.completed
                        + leaderRunGuildInfo.endgame.assists
                        + leaderRunGuildInfo.endgame.failed
                        + leaderRunGuildInfo.general.completed
                        + leaderRunGuildInfo.general.assists
                        + leaderRunGuildInfo.general.failed
                        + leaderRunGuildInfo.realmClearing.completed
                        + leaderRunGuildInfo.realmClearing.assists
                        + leaderRunGuildInfo.realmClearing.failed
                }
            ).slice(0, 20);

            leaderboardStats = ArrayUtil.arrayToStringFields<[number, IRaidUser]>(
                leaderboardInfo,
                (i, val) => {
                    let str: string = `**\`[${val[0]}]\`** `;
                    let member: GuildMember | null = null;
                    try {
                        member = guild.members.resolve(val[1].discordUserId);
                    }
                    finally {
                        if (member === null) {
                            str += `ID \`${val[1].discordUserId}\`\n`;
                        }
                        else {
                            str += `${member}\n`;
                        }
                        const runInfo: ILeaderRuns = val[1].general.leaderRuns.find(x => x.server === guild.id) as ILeaderRuns;

                        str += `⇒ Endgame: ${runInfo.endgame.completed} / ${runInfo.endgame.failed} / ${runInfo.endgame.assists}`;
                        str += `\n⇒ General: ${runInfo.general.completed} / ${runInfo.general.failed} / ${runInfo.general.assists}`;
                        str += `\n⇒ Realm Clearing: ${runInfo.realmClearing.completed} / ${runInfo.realmClearing.failed} / ${runInfo.realmClearing.assists}\n\n`;

                        return str;
                    }
                }
            );
        }
        else if (argType === "keys") {
            argTypeName = "Total Keys Popped";
            const keysPopped: IRaidUser[] = allUsers.filter(x => x.general.keyPops.some(x => x.server === guild.id))
                .sort((a, b) => {
                    const guildIndexB: number = b.general.keyPops.findIndex(x => x.server === guild.id);
                    const guildIndexA: number = a.general.keyPops.findIndex(x => x.server === guild.id);
                    // we assume that A and B are non-(-1)
                    return b.general.keyPops[guildIndexB].keysPopped - a.general.keyPops[guildIndexA].keysPopped;
                });

            const thisMembersIndex: number = keysPopped.findIndex(x => x.discordUserId === msg.author.id);
            if (thisMembersIndex === -1) {
                thisMembersStats = "You have not popped a key for us at all!"
            }
            else {
                const thisMembersGuildIndex: number = keysPopped[thisMembersIndex].general.keyPops.findIndex(x => x.server === guild.id);
                if (thisMembersGuildIndex === -1) {
                    thisMembersStats = "You have not popped a key for us at all!"
                }
                else {
                    thisMembersStats = `Current Rank: ${thisMembersIndex + 1}
                    
Keys Popped: ${keysPopped[thisMembersIndex].general.keyPops[thisMembersGuildIndex].keysPopped}`;
                }
            }

            const leaderboardInfo: [number, IRaidUser][] = ArrayUtil.generateLeaderboardArray<IRaidUser>(
                keysPopped,
                val => {
                    const keyPopL: IKeyPops = val.general.keyPops.find(x => x.server === guild.id) as IKeyPops;
                    return keyPopL.keysPopped;
                }
            ).slice(0, 20);

            leaderboardStats = ArrayUtil.arrayToStringFields<[number, IRaidUser]>(
                leaderboardInfo,
                (i, val) => {
                    let str: string = `**\`[${val[0]}]\`** `;
                    let member: GuildMember | null = null;
                    try {
                        member = guild.members.resolve(val[1].discordUserId);
                    }
                    finally {
                        if (member === null) {
                            str += `ID \`${val[1].discordUserId}\`\n`;
                        }
                        else {
                            str += `${member}\n`;
                        }
                        const keyInfo: IKeyPops = val[1].general.keyPops.find(x => x.server === guild.id) as IKeyPops;

                        str += `⇒ Keys Popped: ${keyInfo.keysPopped}\n\n`;

                        return str;
                    }
                }
            );
        }
        else if (argType === "runes") {
            argTypeName = "Total Runes Popped";
            const runesPopped: IRaidUser[] = allUsers.filter(x => x.general.wcOryx.some(x => x.server === guild.id)).sort((a, b) => {
                const guildIndexB: number = b.general.wcOryx.findIndex(x => x.server === guild.id);
                const guildIndexA: number = a.general.wcOryx.findIndex(x => x.server === guild.id);
                // we assume that A and B are non-(-1)
                return b.general.wcOryx[guildIndexB].helmRune.popped
                    + b.general.wcOryx[guildIndexB].shieldRune.popped
                    + b.general.wcOryx[guildIndexB].swordRune.popped
                    - (a.general.wcOryx[guildIndexA].helmRune.popped
                        + a.general.wcOryx[guildIndexA].shieldRune.popped
                        + a.general.wcOryx[guildIndexA].swordRune.popped);
            });

            const thisMembersIndex: number = runesPopped.findIndex(x => x.discordUserId === msg.author.id);
            if (thisMembersIndex === -1) {
                thisMembersStats = "You have not popped any runes for us at all!"
            }
            else {
                const thisMembersGuildIndex: number = runesPopped[thisMembersIndex].general.wcOryx.findIndex(x => x.server === guild.id);
                if (thisMembersGuildIndex === -1) {
                    thisMembersStats = "You have not popped any runes for us at all!"
                }
                else {
                    thisMembersStats = `Current Rank: ${thisMembersIndex + 1}
                
Helm Runes Popped: ${runesPopped[thisMembersIndex].general.wcOryx[thisMembersGuildIndex].helmRune}
Sword Runes Popped: ${runesPopped[thisMembersIndex].general.wcOryx[thisMembersGuildIndex].swordRune}
Shield Runes Popped: ${runesPopped[thisMembersIndex].general.wcOryx[thisMembersGuildIndex].shieldRune}
WC Incs Popped: ${runesPopped[thisMembersIndex].general.wcOryx[thisMembersGuildIndex].wcIncs}`;
                }
            }

            const leaderboardInfo: [number, IRaidUser][] = ArrayUtil.generateLeaderboardArray<IRaidUser>(
                runesPopped,
                val => {
                    const wcOryxInfo: IWineCellarOryx = val.general.wcOryx.find(x => x.server === guild.id) as IWineCellarOryx;
                    return wcOryxInfo.helmRune.popped
                        + wcOryxInfo.shieldRune.popped
                        + wcOryxInfo.swordRune.popped
                }
            ).slice(0, 20);

            leaderboardStats = ArrayUtil.arrayToStringFields<[number, IRaidUser]>(
                leaderboardInfo,
                (i, val) => {
                    let str: string = `**\`[${val[0]}]\`** `;
                    let member: GuildMember | null = null;
                    try {
                        member = guild.members.resolve(val[1].discordUserId);
                    }
                    finally {
                        if (member === null) {
                            str += `ID \`${val[1].discordUserId}\`\n`;
                        }
                        else {
                            str += `${member}\n`;
                        }
                        const wcInfo: IWineCellarOryx = val[1].general.wcOryx.find(x => x.server === guild.id) as IWineCellarOryx;

                        str += `⇒ Helm Popped: ${wcInfo.helmRune.popped}`;
                        str += `\n⇒ Shield Popped: ${wcInfo.shieldRune.popped}`;
                        str += `\n⇒ Sword Popped: ${wcInfo.swordRune.popped}`;
                        str += `\n⇒ WC Incs Popped: ${wcInfo.wcIncs.popped}\n\n`;

                        return str;
                    }
                }
            );
        }
        else if (argType === "runs") {
            argTypeName = "Total Runs Completed";
            const runsCompleted: IRaidUser[] = allUsers.filter(x => x.general.completedRuns.some(x => x.server === guild.id)).sort((a, b) => {
                const guildIndexB: number = b.general.completedRuns.findIndex(x => x.server === guild.id);
                const guildIndexA: number = a.general.completedRuns.findIndex(x => x.server === guild.id);
                // we assume that A and B are non-(-1)
                return b.general.completedRuns[guildIndexB].endgame
                    + b.general.completedRuns[guildIndexB].general
                    + b.general.completedRuns[guildIndexB].realmClearing
                    - (a.general.completedRuns[guildIndexA].endgame
                        + a.general.completedRuns[guildIndexA].general
                        + a.general.completedRuns[guildIndexA].realmClearing);
            });
            
            const thisMembersIndex: number = runsCompleted.findIndex(x => x.discordUserId === msg.author.id);
            if (thisMembersIndex === -1) {
                thisMembersStats = "You have not completed any runs with us!"
            }
            else {
                const thisMembersGuildIndex: number = runsCompleted[thisMembersIndex].general.completedRuns.findIndex(x => x.server === guild.id);
                if (thisMembersGuildIndex === -1) {
                    thisMembersStats = "You have not completed any runs with us!"
                }
                else {
                    thisMembersStats = `Current Rank: ${thisMembersIndex + 1}
                
Endgame Dungeons Completed: ${runsCompleted[thisMembersIndex].general.completedRuns[thisMembersGuildIndex].endgame}
General Dungeons Completed: ${runsCompleted[thisMembersIndex].general.completedRuns[thisMembersGuildIndex].general}
Realm Clearing Sessions Completed: ${runsCompleted[thisMembersIndex].general.completedRuns[thisMembersGuildIndex].realmClearing}`;
                }
            }
            
            const leaderboardInfo: [number, IRaidUser][] = ArrayUtil.generateLeaderboardArray<IRaidUser>(
                runsCompleted,
                val => {
                    const completedRunsInfo: ICompletedRuns = val.general.completedRuns.find(x => x.server === guild.id) as ICompletedRuns;
                    return completedRunsInfo.endgame
                        + completedRunsInfo.general
                        + completedRunsInfo.realmClearing
                }
            ).slice(0, 20);
            
            leaderboardStats = ArrayUtil.arrayToStringFields<[number, IRaidUser]>(
                leaderboardInfo,
                (i, val) => {
                    let str: string = `**\`[${val[0]}]\`** `;
                    let member: GuildMember | null = null;
                    try {
                        member = guild.members.resolve(val[1].discordUserId);
                    }
                    finally {
                        if (member === null) {
                            str += `ID \`${val[1].discordUserId}\`\n`;
                        }
                        else {
                            str += `${member}\n`;
                        }
                        const comRunInfo: ICompletedRuns = val[1].general.completedRuns.find(x => x.server === guild.id) as ICompletedRuns;
            
                        str += `⇒ Endgame Dungeons: ${comRunInfo.endgame}`;
                        str += `\n⇒ General Dungeons: ${comRunInfo.general}`;
                        str += `\n⇒ Realm Clearing Sessions: ${comRunInfo.realmClearing}\n\n`;
            
                        return str;
                    }
                }
            );
        }

        if (leaderboardStats.length === 0 || thisMembersStats.length === 0) {
            displayEmbed.setTitle("No Leaderboard Stats Available")
                .setDescription(`Your specified query of \`${argType}\` is not valid. Please try again.`)
                .addField("Valid Queries", "`totalLedRuns` = Runs Led (Total)\n`keysPopped` = Keys Popped (Total)\n`runesPopped` = Runes Popped (Total)\n`runs` = Runs Completed")
                .setColor("RED")
                .setFooter("No Leaderboard Stats Found!");
            MessageUtil.send({ embed: displayEmbed }, msg.channel, 10 * 1000);
            return;
        }

        displayEmbed.setTitle(argTypeName)
            .setDescription(thisMembersStats)
            .setFooter("Leaderboard Stats Displayed")
            .setColor("GREEN");

        for (const field of leaderboardStats) {
            displayEmbed.addField("Leaderboard Stats", field);
        }

        msg.channel.send(displayEmbed); 
    }
}