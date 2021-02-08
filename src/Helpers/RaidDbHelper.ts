import { IRaidGuild } from "../Templates/IRaidGuild";
import { Guild, GuildMember, User } from "discord.js";
import { IRaidInfo } from "../Definitions/IRaidInfo";
import { MongoDbHelper } from "./MongoDbHelper";
import { FindAndModifyWriteOpResultObject } from "mongodb";
import { RaidStatus } from "../Definitions/RaidStatus";

/**
 * This file contains raid-related functions that deal with the database.
 */
export module RaidDbHelper {
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
	 * Adds a new `IRaidInfo` to the array of current raids. 
	 * @param {Guild} guild The target guild. 
	 * @param {IRaidInfo} ri The data to add to the list of current raids. 
	 * @returns {Promise<IRaidGuild>} The new document.  
	 */
	export async function addRaidChannel(
		guild: Guild,
		ri: IRaidInfo
	): Promise<IRaidGuild> {
		const x: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
			$push: {
				"activeRaidsAndHeadcounts.raidChannels": ri
			}
		}, { returnOriginal: false });
		return x.value as IRaidGuild;
	}

	/**
	 * Adds a person that has indicated that he/she has a key to the guild doc.
	 * @param {Guild} guild The guild. 
	 * @param {string} vcID The voice channel ID.
	 * @param {(GuildMember | string | User)} member The guild member that reacted with key. 
	 * @param {string} keyId The key ID.
	 */
	export async function addKeyReaction(
		guild: Guild,
		vcID: string,
		member: GuildMember | string | User,
		keyId: string
	): Promise<IRaidGuild> {
		const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "activeRaidsAndHeadcounts.raidChannels.vcID": vcID }, {
			$push: {
				"activeRaidsAndHeadcounts.raidChannels.$.keyReacts": typeof member === "object" 
					? { keyId: keyId, userId: member.id } 
					: { keyId: keyId, userId: member }
			}
		}, { returnOriginal: false });
		return data.value as IRaidGuild;
	}

	/**
	 * Adds a person that has indicated that he/she wants the location early to the guild doc.
	 * @param {Guild} guild The guild. 
	 * @param {string} vcID The voice channel ID.
	 * @param {(GuildMember | string | User)} member The guild member that reacted with the early reaction emoji.
	 */
	export async function addEarlyReaction(
		guild: Guild,
		vcID: string,
		member: GuildMember | string | User
	): Promise<IRaidGuild> {
		const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "activeRaidsAndHeadcounts.raidChannels.vcID": vcID }, {
			$push: {
				"activeRaidsAndHeadcounts.raidChannels.$.earlyReacts": typeof member === "object" ? member.id : member
			}
		}, { returnOriginal: false });
		return data.value as IRaidGuild;
	}

	/**
	 * Removes the raid information from the array of current raids.
	 * @param {Guild} guild The target guild. 
	 * @param {string} vcID The ID of the voice channel associated with the raid that has ended.
	 * @returns {Promise<IRaidGuild>} The new document.
	 */
	export async function removeRaidChannelFromDatabase(
		guild: Guild,
		vcID: string
	): Promise<IRaidGuild> {
		const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
			$pull: {
				"activeRaidsAndHeadcounts.raidChannels": {
					vcID: vcID
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
		const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "activeRaidsAndHeadcounts.raidChannels.vcID": vcID }, {
			$set: {
				"activeRaidsAndHeadcounts.raidChannels.$.status": RaidStatus.InRun
			}
		}, { returnOriginal: false });
		return data.value as IRaidGuild;
	}

	/**
	 * Edits the specified raiding category's location with the provided location.
	 * @param {Guild} guild The target guild. 
	 * @param {string} vcID The ID of the voice channel associated with the raid that has progressed to RAID status.
	 * @param {string} location The new location. 
	 * @returns {Promise<IRaidGuild>} The new document.
	 */
	export async function editLocation(
		guild: Guild,
		vcID: string,
		location: string
	): Promise<IRaidGuild> {
		const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "activeRaidsAndHeadcounts.raidChannels.vcID": vcID }, {
			$set: {
				"activeRaidsAndHeadcounts.raidChannels.$.location": location
			}
		}, { returnOriginal: false });
		return data.value as IRaidGuild;
	}

	/**
	 * Increments -- or decrements -- the dungeons that have been completed in the raid by a certain amount.
	 * @param {Guild} guild The target guild. 
	 * @param {string} vcID The ID of the voice channel associated with the raid that has progressed to RAID status.
	 * @param {number} incrementBy The amount to increment by. 
	 * @returns {Promise<number>} The current amount of dungeons that have been completed.
	 */
	export async function incrementDungeonsDone(
		guild: Guild,
		vcID: string,
		incrementBy: number
	): Promise<number> {
		const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "activeRaidsAndHeadcounts.raidChannels.vcID": vcID }, {
			$inc: {
				"activeRaidsAndHeadcounts.raidChannels.$.dungeonsDone": incrementBy
			}
		}, { returnOriginal: false });

		if (typeof data.value === "undefined") {
			return -1;
		}

		const indexOfRaid: number = data.value.activeRaidsAndHeadcounts.raidChannels
			.findIndex(x => x.vcID === vcID);
		
		if (indexOfRaid === -1) {
			return -1;
		}


		return data.value.activeRaidsAndHeadcounts.raidChannels[indexOfRaid].dungeonsDone;
	}

	/**
	 * Edits the specified raiding category's location with the provided location.
	 * @param {Guild} guild The target guild. 
	 * @param {string} vcID The ID of the voice channel associated with the raid that has progressed to RAID status.
	 * @param {string} top The top string to update.
	 * @returns {Promise<IRaidGuild>} The new document.
	 */
	export async function updateTopString(
		guild: Guild,
		vcID: string,
		top: string
	): Promise<IRaidGuild> {
		const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "activeRaidsAndHeadcounts.raidChannels.vcID": vcID }, {
			$set: {
				"activeRaidsAndHeadcounts.raidChannels.$.controlPanelDesc.top": top
			}
		}, { returnOriginal: false });
		return data.value as IRaidGuild;
	}

	/**
	 * Edits the specified raiding category's location with the provided location.
	 * @param {Guild} guild The target guild. 
	 * @param {string} vcID The ID of the voice channel associated with the raid that has progressed to RAID status.
	 * @param {string} bottom The bottom string to update.
	 * @returns {Promise<IRaidGuild>} The new document.
	 */
	export async function updateBottomString(
		guild: Guild,
		vcID: string,
		bottom: string
	): Promise<IRaidGuild> {
		const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "activeRaidsAndHeadcounts.raidChannels.vcID": vcID }, {
			$set: {
				"activeRaidsAndHeadcounts.raidChannels.$.controlPanelDesc.bottom": bottom
			}
		}, { returnOriginal: false });
		return data.value as IRaidGuild;
	}
}