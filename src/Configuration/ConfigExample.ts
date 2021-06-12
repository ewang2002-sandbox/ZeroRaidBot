import { IConfigurationSettings } from "./IConfigurationSettings";

/**
 * True -- uses production settings.
 * False -- uses testing settings.
 */
export const PRODUCTION_BOT: boolean = true;

/**
 * True -- use private settings.
 * False -- use public settings.
 * 
 * UNLESS you are using the official version of the bot, this should be FALSE.
 */
export const PRIVATE_BOT: boolean = false;

export const BotConfiguration: IConfigurationSettings = PRODUCTION_BOT
    ? {
		// your bot token
		token: "", 
		// the base db url
		// it should look like this:
		// mongodb+srv://<username>:<password>@something.ghgy8.mongodb.net
		// where <username> and <password> are filled out. 
		dbURL: "",
		// the name of the database. 
		dbName: "",
		// the name of the user collection
		// a good one is just "users." 
		userCollectionName: "",
		// the name of the guild/server collection
		// a good one is just "guilds."
		guildCollectionName: "",
		// the name of the bot collection.
		// a good one is just "botsettings."
        botCollectionName: "",
        botOwners: [],
		botColors: [],
		// guilds that dont need a db entry
		exemptGuild: [],
		privateApiLinks: {
            baseApi: "",
            pingOnline: "",
            parseEndpoint: "",
            realmEye: {
                playerBasics: "",
                petyard: "",
                graveyard: "",
                graveyardSummary: "",
                nameHistory: "",
                rankHistory: "",
                guildHistory: "",
                exaltations: ""
            }
        }
    } : {
        token: "",
        dbURL: "",
        dbName: "",
        userCollectionName: "",
        guildCollectionName: "",
        botCollectionName: "",
        botOwners: [],
		botColors: [],
		exemptGuild: [],
		privateApiLinks: {
            baseApi: "",
            pingOnline: "",
            parseEndpoint: "",
            realmEye: {
                playerBasics: "",
                petyard: "",
                graveyard: "",
                graveyardSummary: "",
                nameHistory: "",
                rankHistory: "",
                guildHistory: "",
                exaltations: ""
            }
        }
    };

/**
 * The default prefix for the bot.
 */
export const DefaultPrefix: string = ";";

/**
 * How long notification embeds should last before they are deleted. This should be in milliseconds.
 */
export const DeleteEmbedTime: number = 5000;

/**
 * Private RealmEye API URL. Don't fill this field out.
 */
export const APIUrl: string = "";

/**
 * Player data.
 */
export const APIPlayerData: string = "";

/**
 * Name history data.
 */
export const NameHistoryData: string = "";

/**
 * This token will be used to post issues. 
 */
export const GITHUB_TOKEN: string = "";

/**
 * The organization or user. 
 */
export const REPOSITORY_ORG: string = "";

/**
 * The repo
 */
export const REPOSITORY_NAME: string = "";

/**
 * The IDs of all devs.
 */
export const DEVELOPER_ID: string[] = [];