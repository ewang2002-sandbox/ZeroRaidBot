import { Guild, GuildMember, Message, PartialMessage, VoiceChannel } from "discord.js";
import { AFKDungeon } from "../Constants/AFKDungeon";
import { RaidStatus } from "../Definitions/RaidStatus";
import { GameHandler } from "../Helpers/GameHandler";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { RaidHandler } from "../Helpers/RaidHandler";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { Zero } from "../Zero";

export async function onMessageDeleteEvent(msg: Message | PartialMessage): Promise<void> {
    if (msg.guild === null) {
        return;
    }

    const guild: Guild = msg.guild;
    const guildDb: IRaidGuild = await new MongoDbHelper.MongoDbGuildManager(guild.id).findOrCreateGuildDb();

    for (const afkCheckInfo of guildDb.activeRaidsAndHeadcounts.raidChannels) {
        if (afkCheckInfo.controlPanelMsgId === msg.id || afkCheckInfo.msgID === msg.id) {
            if (RaidHandler.CURRENT_RAID_DATA.has(afkCheckInfo.msgID)) {
                (RaidHandler.CURRENT_RAID_DATA.get(afkCheckInfo.msgID) as RaidHandler.IStoredRaidData).mst.disableAutoTick();
                clearTimeout((RaidHandler.CURRENT_RAID_DATA.get(afkCheckInfo.msgID) as RaidHandler.IStoredRaidData).timeout);
                RaidHandler.CURRENT_RAID_DATA.delete(afkCheckInfo.msgID);
            }
            
            let vc: VoiceChannel | null = null;
            try {
                vc = await Zero.RaidClient.channels.fetch(afkCheckInfo.vcID) as VoiceChannel;
            }
            finally {
                if (afkCheckInfo.status === RaidStatus.AFKCheck) {
                    await RaidHandler.abortAfk(guild, afkCheckInfo, afkCheckInfo.vcID);
                }
                else {
                    await RaidHandler.endRun(guild.me as GuildMember, guild, afkCheckInfo, vc !== null);
                }
            }
        }
    }

    for (const gameCheckInfo of guildDb.activeRaidsAndHeadcounts.gameChannels) {
        if (gameCheckInfo.controlPanelMsgId === msg.id || gameCheckInfo.msgId === msg.id) {
            if (GameHandler.CURRENT_GAME_DATA.has(gameCheckInfo.msgId)) {
                (GameHandler.CURRENT_GAME_DATA.get(gameCheckInfo.msgId) as RaidHandler.IStoredRaidData).mst.disableAutoTick();
                clearTimeout((GameHandler.CURRENT_GAME_DATA.get(gameCheckInfo.msgId) as RaidHandler.IStoredRaidData).timeout);
                GameHandler.CURRENT_GAME_DATA.delete(gameCheckInfo.msgId);
            }

            let vc: VoiceChannel | null = null;
            try {
                vc = await Zero.RaidClient.channels.fetch(gameCheckInfo.vcId) as VoiceChannel;
            }
            finally {
                if (gameCheckInfo.status === RaidStatus.AFKCheck) {
                    await GameHandler.abortAfk(guild, gameCheckInfo, gameCheckInfo.vcId);
                }
                else {
                    await GameHandler.endGamingSession(guild.me as GuildMember, guild, gameCheckInfo);
                }
            }
        }
    }
}