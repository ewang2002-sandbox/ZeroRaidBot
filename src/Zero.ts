import { Client, Message, MessageReaction, User, PartialUser, GuildMember, PartialGuildMember, Guild, TextChannel, ClientUser } from "discord.js";
import { MongoDbHelper } from "./Helpers/MongoDbHelper";
import { CommandManager } from "./Classes/CommandManager";
import axios, { AxiosInstance } from "axios";
import { onReadyEvent } from "./Events/ReadyEvent";
import { onMessageEvent } from "./Events/MessageEvent";
import { onMessageReactionAdd } from "./Events/MessageReactionAddEvent";
import { onMessageReactionRemove } from "./Events/MessageReactionRemoveEvent";
import { onGuildMemberAdd } from "./Events/GuildMemberAddEvent";
import { onGuildCreate } from "./Events/GuildCreateEvent";

export class Zero {
	/** 
	 * The bot client.
	 */
	public static readonly RaidClient: Client = new Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });;

	/**
	 * The token for the bot.
	 */
	private readonly _token: string;

	/**
	 * The command manager object.
	 */
	public static readonly CmdManager: CommandManager = new CommandManager();

	/**
	 * The AxiosInstance, which will be used to make requests to RealmEye.
	 */
	public static readonly AxiosClient: AxiosInstance = axios.create();

	/**
	 * The contructor for this method.
	 * 
	 * There should only be ONE `Zero` object per instance.
	 *  
	 * @param {string} token The token. 
	 */
	public constructor(token: string) {
		// initialize vars as usual
		this._token = token;
		// load all bot commands.
		Zero.CmdManager.loadAllCommands();

		// events
		Zero.RaidClient.on("ready", () => onReadyEvent());
		Zero.RaidClient.on("message", async (msg: Message) => await onMessageEvent(msg));
		Zero.RaidClient.on("messageReactionAdd", async (reaction: MessageReaction, user: User | PartialUser) => await onMessageReactionAdd(reaction, user));
		Zero.RaidClient.on("messageReactionRemove", async (reaction: MessageReaction, user: User | PartialUser) => await onMessageReactionRemove(reaction, user));
		Zero.RaidClient.on("guildMemberAdd", async (member: GuildMember | PartialGuildMember) => await onGuildMemberAdd(member));
		Zero.RaidClient.on("guildCreate", async (guild: Guild) => await onGuildCreate(guild));
	}

	/**
	 * Logs into the client. This method should be called first. If this method call is successful, the bot will also attempt to connect to MongoDB.
	 */
	public async login(): Promise<void> {
		try {
			const mdm: MongoDbHelper.MongoDbHelper = new MongoDbHelper.MongoDbHelper();
			await mdm.connect();
			await Zero.RaidClient.login(this._token);
			(Zero.RaidClient.user as ClientUser).setActivity("Being programmed to death.", { type: "CUSTOM_STATUS" });
		}
		catch (e) {
			throw new ReferenceError(e);
		}
	}
}