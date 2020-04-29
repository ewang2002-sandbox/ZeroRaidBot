import { MongoClient, Db, Collection, Cursor } from "mongodb";
import { Credentials } from "../Configuration/Config";
import { IRaidUser } from "../Templates/IRaidUser";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { AFKDungeon } from "../Constants/AFKDungeon";

export module MongoDbHelper {
	/**
	 * The base class for MongoDb. This class should be instantiated once at the beginning. 
	 */
	export class MongoDbHelper {
		public static MongoClient: MongoClient;

		/**
		 * The constructor for this class. 
		 * @param {string} dbPath The url to the database.
		 */

		public constructor() {
		}

		/**
		 * Connects to the database.
		 */
		public async connect(): Promise<void> {
			const mongoDbClient: MongoClient = new MongoClient(Credentials.dbURL, {
				useNewUrlParser: true
			});
			MongoDbHelper.MongoClient = await mongoDbClient.connect();

			MongoDbUserManager.MongoUserClient = MongoDbHelper.MongoClient.db(Credentials.dbName)
				.collection<IRaidUser>(Credentials.userCollectionName);
			MongoDbGuildManager.MongoGuildClient = MongoDbHelper.MongoClient.db(Credentials.dbName)
				.collection<IRaidGuild>(Credentials.guildCollectionName);
		}
	}

	/**
	 * The MongoDb class that is designed to handle user-related actions. 
	 */
	export class MongoDbUserManager {
		private _inGameName: string;
		public static MongoUserClient: Collection<IRaidUser>;

		/**
		 * The constructor for this class.
		 * @param {string} inGameName The display in-game name. The resulting name will not have any symbols.
		 */
		public constructor(inGameName: string) {
			if (inGameName.length > 10) {
				throw new TypeError("Name cannot be greater than 10 characters.");
			}
			this._inGameName = inGameName.replace(/[^A-Za-z]/g, "");
		}

		/**
		 * Returns the user data, if it exists. This will also look through the in-game name's alternative accounts, if any. 
		 * @returns {Promise<IRaidUser[]>} The results of the search query.
		 */
		public async getUserDB(): Promise<IRaidUser[]> {
			// look for an ign or an alt account by this name 
			return await MongoDbUserManager.MongoUserClient.find({
				$or: [
					{
						rotmgLowercaseName: this._inGameName.toLowerCase()
					},
					{
						"otherAccountNames.lowercase": this._inGameName.toLowerCase()
					}
				]
			}).toArray();
		}

		/**
		 * Returns the user data, if it exists.
		 * @param {string} id The Discord ID.
		 * @returns {Promise<IRaidUser | null>} The data, if it exists; `null` otherwise.
		 */
		public static async getUserDbByDiscordId(id: string): Promise<IRaidUser | null> {
			return new Promise((resolve, reject) => {
				MongoDbUserManager.MongoUserClient.findOne({ discordUserId: id }).then(x => {
					resolve(x);
				});
			});
		}


		/**
		 * Creates a new user DB and returns the resulting data. This will first check `CheckIfNameExist`. 
		 * @param {string} [userID] The Discord user ID associated with the in-game name. 
		 * @returns {Promise<IRaidUser>} The resulting user data.
		 */
		public async createNewUserDB(userID?: string): Promise<IRaidUser> {
			let data: IRaidUser[] = await this.getUserDB();
			// make sure the data doesnt exist before moving on
			if (data.length > 0) {
				return data[0];
			}

			// make new data
			return new Promise((resolve, reject) => {
				MongoDbUserManager.MongoUserClient.insertOne({
					discordUserId: typeof userID === "undefined" ? "" : userID,
					rotmgDisplayName: this._inGameName,
					rotmgLowercaseName: this._inGameName.toLowerCase(),
					otherAccountNames: [],
					lastModified: new Date().getTime(),
					general: {
						keyPops: [],
						voidVials: [],
						wcRuns: [],
						completedRuns: [],
						leaderRuns: [],
						moderationHistory: []
					}
				}).then(x => {
					resolve(x.ops[0]);
				});
			});
		}


		/**
		 * Deletes any data linked to the in-game name from the DB.
		 * @returns {Promise<number>} The amount of user data deleted.
		 */
		public async deleteUserDB(): Promise<number> {
			return new Promise(async (resolve, reject) => {
				let data: IRaidUser[] = await this.getUserDB();

				if (data.length === 0) {
					return resolve(0);
				}

				MongoDbUserManager.MongoUserClient.deleteMany({ rotmgLowercaseName: data[0].rotmgLowercaseName }).then(x => {
					if (typeof x.deletedCount !== "undefined" && x.deletedCount > 0) {
						resolve(x.deletedCount);
					}
					resolve(0);
				});
			});
		}
	}

	/**
	 * A class that manages the `Guild` aspect of the DB.
	 */
	export class MongoDbGuildManager {
		private _guildID: string;
		public static MongoGuildClient: Collection<IRaidGuild>;


		/**
		 * The constructor for this class.
		 * @param {string} guildID The guild ID to manage. 
		 */
		public constructor(guildID: string) {
			this._guildID = guildID;
		}

		/**
		 * Creates a new guild data if it does not exist.
		 * @returns {Promise<IRaidGuild>} The guild data. 
		 */
		public async findOrCreateGuildDb(): Promise<IRaidGuild> {
			let data: IRaidGuild[] = await MongoDbGuildManager.MongoGuildClient.find({ guildID: this._guildID }).toArray();

			// make sure the data doesnt exist before moving on
			if (data.length > 0) {
				return data[0];
			}

			return new Promise((resolve, reject) => {
				MongoDbGuildManager.MongoGuildClient.insertOne({
					guildID: this._guildID,
					verification: {
						stars: {
							required: false,
							minimum: 0
						},
						aliveFame: {
							required: false,
							minimum: 0
						},
						maxedStats: {
							required: false,
							statsReq: [0, 0, 0, 0, 0, 0, 0, 0, 0]
						}
					},
					generalChannels: {
						logging: {
							moderationLogs: "",
							suspensionLogs: "",
							verificationAttemptsChannel: "",
							verificationSuccessChannel: "",
							joinLeaveChannel: "",
							botUpdatesChannel: "",
							reactionLoggingChannel: ""
						},
						manualVerification: "",
						modMailChannel: "",
						generalRaidAfkCheckChannel: "",
						verificationChan: "",
						controlPanelChannel: "",
						raidRequestChannel: ""
					},
					roles: {
						teamRole: "",
						moderator: "",
						headRaidLeader: "",
						officer: "",
						raidLeader: "",
						almostRaidLeader: "",
						trialRaidLeader: "",
						support: "",
						pardonedRaidLeader: "",
						raider: "",
						suspended: "",
						talkingRoles: [],
						optRoles: {
							mutedRole: "",
							keyTier1: {
								role: "",
								min: 0,
							},
							keyTier2: {
								role: "",
								min: 0,
							},
							keyTier3: {
								role: "",
								min: 0
							}
						}
					},
					properties: {
						successfulVerificationMessage: "",
						modMail: [],
						dungeons: AFKDungeon.map(x => x.id),
					},
					moderation: {
						blacklistedUsers: [],
						amtSuspensions: 0,
						blacklistedModMailUsers: [],
						mutedUsers: [],
						suspended: []
					},
					activeRaidsAndHeadcounts: {
						raidChannels: [],
						headcounts: []
					},
					prefix: ";",
					sections: []
				}).then(x => {
					resolve(x.ops[0]);
				})
			});
		}

		/**
 		* Deletes any data linked to the guild ID from the DB.
 		* @returns {Promise<number>} The amount of guild data deleted.
 		*/
		public async deleteGuildDB(): Promise<number> {
			return new Promise((resolve, reject) => {
				MongoDbGuildManager.MongoGuildClient.deleteMany({ guildID: this._guildID }).then(x => {
					if (typeof x.deletedCount !== "undefined" && x.deletedCount > 0) {
						resolve(x.deletedCount);
					}
					resolve(0);
				});
			});
		}
	}
}