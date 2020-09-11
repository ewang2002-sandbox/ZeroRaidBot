import { IRaidGuild } from "../Templates/IRaidGuild";
import { Guild, GuildMember, User } from "discord.js";
import { IGameInfo } from "../Definitions/IGameInfo";
import { MongoDbHelper } from "./MongoDbHelper";
import { FindAndModifyWriteOpResultObject } from "mongodb";
import { RaidStatus } from "../Definitions/RaidStatus";
import { IHeadCountInfo } from "../Definitions/IHeadCountInfo";

/**
 * This file contains raid-related functions that deal with the database.
 */
export module GameDbHelper {
	/**
	 * Checks to see if raiding channels are present. This is useful to ensure no errors actually occur in the process of creating an AFK check and managing raids.
	 * @param {Guild} guild The guild.
	 * @param {IRaidGuild} guildDB The guild database.
	 * @returns {boolean} Whether you can start the raid without errors.
	 */
	export function checkIfConfigured(
		guild: Guild,
		guildDB: IRaidGuild
	): boolean {
		return guild.channels.cache.has(guildDB.generalChannels.generalRaidAfkCheckChannel);
	}

	/**
	 * Adds a new `IGameInfo` to the array of current games. 
	 * @param {Guild} guild The target guild. 
	 * @param {IGameInfo} ri The data to add to the list of current raids. 
	 * @returns {Promise<IRaidGuild>} The new document.  
	 */
	export async function addGameChannel(
		guild: Guild,
		ri: IGameInfo
	): Promise<IRaidGuild> {
		const x: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
			$push: {
				"activeRaidsAndHeadcounts.gameChannels": ri
			}
		}, { returnOriginal: false });
		return x.value as IRaidGuild;
	}

	/**
	 * Removes the raid information from the array of current raids.
	 * @param {Guild} guild The target guild. 
	 * @param {string} vcID The ID of the voice channel associated with the raid that has ended.
	 * @returns {Promise<IRaidGuild>} The new document.
	 */
	export async function removeGameChannelFromDatabase(
		guild: Guild,
		vcID: string
	): Promise<IRaidGuild> {
		const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
			$pull: {
				"activeRaidsAndHeadcounts.gameChannels": {
					vcId: vcID
				}
			}
		}, { returnOriginal: false });
		return data.value as IRaidGuild;
	}

	/**
	 * Updates the raid status so that it progresses to RAID status, locking the channels.
	 * @param {Guild} guild The target guild. 
	 * @param {string} vcID The ID of the voice channel associated with the raid that has progressed to RAID status.
	 * @returns {Promise<IRaidGuild>} The new document.
	 */
	export async function updateRaidStatus(
		guild: Guild,
		vcID: string
	): Promise<IRaidGuild> {
		const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "activeRaidsAndHeadcounts.gameChannels.vcId": vcID }, {
			$set: {
				"activeRaidsAndHeadcounts.gameChannels.$.status": RaidStatus.InRun
			}
		}, { returnOriginal: false });
		return data.value as IRaidGuild;
	}

	/**
	 * Edits the specified game's message with the provided message.
	 * @param {Guild} guild The target guild. 
	 * @param {string} vcID The ID of the voice channel associated with the raid that has progressed to RAID status.
	 * @param {string} msgToDmPeople The new message. 
	 * @returns {Promise<IRaidGuild>} The new document.
	 */
	export async function editMessage(
		guild: Guild,
		vcID: string,
		location: string
	): Promise<IRaidGuild> {
		const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "activeRaidsAndHeadcounts.gameChannels.vcId": vcID }, {
			$set: {
				"activeRaidsAndHeadcounts.gameChannels.$.msgToDmPeople": location
			}
		}, { returnOriginal: false });
		return data.value as IRaidGuild;
	}
}