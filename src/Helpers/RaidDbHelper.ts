import { IRaidGuild } from "../Templates/IRaidGuild";
import { Guild, GuildMember, User } from "discord.js";
import { IRaidInfo } from "../Definitions/IRaidInfo";
import { MongoDbHelper } from "./MongoDbHelper";
import { FindAndModifyWriteOpResultObject } from "mongodb";
import { RaidStatus } from "../Definitions/RaidStatus";
import { IHeadCountInfo } from "../Definitions/IHeadCountInfo";

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
	export function addRaidChannel(
		guild: Guild,
		ri: IRaidInfo
	): Promise<IRaidGuild> {
		return new Promise(async (resolve, reject) => {
			const x: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
				$push: {
					"activeRaidsAndHeadcounts.raidChannels": ri
				}
			}, { returnOriginal: false });
			resolve(x.value);
		});
	}

	/**
	 * Adds a person that has indicated that he/she has a key to the guild doc.
	 * @param {Guild} guild The guild. 
	 * @param {string} vcID The voice channel ID.
	 * @param {(GuildMember | string | User)} member The guild member that reacted with key. 
	 * @param {string} keyId The key ID.
	 */
	export function addKeyReaction(
		guild: Guild,
		vcID: string,
		member: GuildMember | string | User,
		keyId: string
	): Promise<IRaidGuild> {
		return new Promise(async (resolve, reject) => {
			const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "activeRaidsAndHeadcounts.raidChannels.vcID": vcID }, {
				$push: {
					"activeRaidsAndHeadcounts.raidChannels.$.keyReacts": typeof member === "object" 
						? { keyId: keyId, userId: member.id } 
						: { keyId: keyId, userId: member }
				}
			}, { returnOriginal: false });
			resolve(data.value);
		});
	}

	/**
	 * Adds a person that has indicated that he/she wants the location early to the guild doc.
	 * @param {Guild} guild The guild. 
	 * @param {string} vcID The voice channel ID.
	 * @param {(GuildMember | string | User)} member The guild member that reacted with the early reaction emoji.
	 */
	export function addEarlyReaction(
		guild: Guild,
		vcID: string,
		member: GuildMember | string | User
	): Promise<IRaidGuild> {
		return new Promise(async (resolve, reject) => {
			const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "activeRaidsAndHeadcounts.raidChannels.vcID": vcID }, {
				$push: {
					"activeRaidsAndHeadcounts.raidChannels.$.earlyReacts": typeof member === "object" ? member.id : member
				}
			}, { returnOriginal: false });
			resolve(data.value);
		});
	}

	/**
	 * Adds a new `IHeadCountInfo` to the array of current headcounts. 
	 * @param {Guild} guild The target guild. 
	 * @param {IHeadCountInfo} ri The data to add to the list of current headcounts. 
	 * @returns {Promise<IRaidGuild>} The new document.  
	 */
	export function addHeadcount(
		guild: Guild,
		hcInfo: IHeadCountInfo
	): Promise<IRaidGuild> {
		return new Promise(async (resolve, reject) => {
			const x: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
				$push: {
					"activeRaidsAndHeadcounts.headcounts": hcInfo
				}
			}, { returnOriginal: false });
			resolve(x.value);
		});
	}

	/**
	 * Removes the headcount information from the array of current headcounts.
	 * @param {Guild} guild The target guild. 
	 * @param {string} msgId The ID of the message associated with the headcount that has (or should have) ended.
	 * @returns {Promise<IRaidGuild>} The new document.
	 */
	export function removeHeadcount(
		guild: Guild,
		msgId: string
	): Promise<IRaidGuild> {
		return new Promise(async (resolve, reject) => {
			const x: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
				$pull: {
					"activeRaidsAndHeadcounts.headcounts": {
						msgID: msgId
					}
				}
			}, { returnOriginal: false });
			resolve(x.value);
		});
	}

	/**
	 * Removes the raid information from the array of current raids.
	 * @param {Guild} guild The target guild. 
	 * @param {string} vcID The ID of the voice channel associated with the raid that has ended.
	 * @returns {Promise<IRaidGuild>} The new document.
	 */
	export function removeRaidChannel(
		guild: Guild,
		vcID: string
	): Promise<IRaidGuild> {
		return new Promise(async (resolve, reject) => {
			const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
				$pull: {
					"activeRaidsAndHeadcounts.raidChannels": {
						vcID: vcID
					}
				}
			}, { returnOriginal: false });
			resolve(data.value);
		});
	}

	/**
	 * Updates the raid status so that it progresses to RAID status, locking the channels.
	 * @param {Guild} guild The target guild. 
	 * @param {string} vcID The ID of the voice channel associated with the raid that has progressed to RAID status.
	 * @returns {Promise<IRaidGuild>} The new document.
	 */
	export function updateRaidStatus(
		guild: Guild,
		vcID: string
	): Promise<IRaidGuild> {
		return new Promise(async (resolve, reject) => {
			const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "activeRaidsAndHeadcounts.raidChannels.vcID": vcID }, {
				$set: {
					"activeRaidsAndHeadcounts.raidChannels.$.status": RaidStatus.InRun
				}
			}, { returnOriginal: false });
			resolve(data.value);
		});
	}

	/**
	 * Edits the specified raiding category's location with the provided location.
	 * @param {Guild} guild The target guild. 
	 * @param {string} vcID The ID of the voice channel associated with the raid that has progressed to RAID status.
	 * @param {string} location The new location. 
	 * @returns {Promise<IRaidGuild | null>} The new document.
	 */
	export function editLocation(
		guild: Guild,
		vcID: string,
		location: string
	): Promise<IRaidGuild> {
		return new Promise(async (resolve, reject) => {
			const data: FindAndModifyWriteOpResultObject<IRaidGuild> = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "activeRaidsAndHeadcounts.raidChannels.vcID": vcID }, {
				$set: {
					"activeRaidsAndHeadcounts.raidChannels.$.location": location
				}
			}, { returnOriginal: false });
			resolve(data.value);
		});
	}

	/**
	 * Checks and removes any defective sections. This will NOT check the main section.
	 * @param {Guild} guild The guild. 
	 * @param {IRaidGuild} guildData The guild document. 
	 * @returns {IRaidGuild} The new document. 
	 */
	export async function removeDeletedSections(
		guild: Guild,
		guildData: IRaidGuild
	): Promise<IRaidGuild> {
		const promises: Promise<void>[] = guildData.sections.map(section => {
			return new Promise((resolve, reject) => {
				if (!guild.channels.cache.has(section.channels.afkCheckChannel)
					|| !guild.channels.cache.has(section.channels.verificationChannel)
					|| !guild.roles.cache.has(section.roles.verifiedRole)
				) {
					MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
						$pull: {
							"sections.roles": section.roles.verifiedRole
						}
					}, (err: any, raw: any) => {
						if (err) {
							reject(err);
						}
						resolve();
					});
				}
				else {
					resolve();
				}
			});
		});

		// execute it 
		await Promise.all(promises);

		// this should not return null as we know this obj exists. 
		return await ((new MongoDbHelper.MongoDbGuildManager(guild.id)).findOrCreateGuildDb() as Promise<IRaidGuild>);
	}
}