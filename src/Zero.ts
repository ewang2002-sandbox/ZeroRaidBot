import { Client, Message, MessageReaction, User, PartialUser, GuildMember, PartialGuildMember, Guild, ClientUser, Channel, PartialDMChannel, VoiceChannel } from "discord.js";
import { MongoDbHelper } from "./Helpers/MongoDbHelper";
import { CommandManager } from "./Classes/CommandManager";
import axios, { AxiosInstance } from "axios";
import { onReadyEvent } from "./Events/ReadyEvent";
import { onMessageEvent } from "./Events/MessageEvent";
import { onMessageReactionAdd } from "./Events/MessageReactionAddEvent";
import { onMessageReactionRemove } from "./Events/MessageReactionRemoveEvent";
import { onGuildMemberAdd } from "./Events/GuildMemberAddEvent";
import { onGuildCreate } from "./Events/GuildCreateEvent";
import { onGuildMemberUpdate } from "./Events/GuildMemberUpdate";
import { onError } from "./Events/ErrorEvent";
import { LoggerClient } from "./Classes/LoggerClient";
import { onChannelDelete } from "./Events/GuildChannelDelete";
import { PRODUCTION_BOT, BotConfiguration } from "./Configuration/Config";
import { IRaidGuild } from "./Templates/IRaidGuild";
import { RaidStatus } from "./Definitions/RaidStatus";
import { RaidHandler } from "./Helpers/RaidHandler";
import { onGuildMemberRemove } from "./Events/GuildMemberRemove";

export class Zero {
	/** 
	 * The bot client.
	 */
	public static readonly RaidClient: Client = new Client({ 
		partials: [
			"MESSAGE", 
			"CHANNEL", 
			"REACTION"
		],
		restTimeOffset: 350
	});

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

	public static readonly LogClient: LoggerClient;

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
		Zero.RaidClient
			.on("ready", () => onReadyEvent());
		Zero.RaidClient
			.on("message", async (msg: Message) => await onMessageEvent(msg));
		Zero.RaidClient
			.on("messageReactionAdd", async (reaction: MessageReaction, user: User | PartialUser) => await onMessageReactionAdd(reaction, user));
		Zero.RaidClient
			.on("messageReactionRemove", async (reaction: MessageReaction, user: User | PartialUser) => await onMessageReactionRemove(reaction, user));
		Zero.RaidClient
			.on("guildMemberAdd", async (member: GuildMember | PartialGuildMember) => await onGuildMemberAdd(member));
		Zero.RaidClient
			.on("guildMemberRemove", async (member: GuildMember | PartialGuildMember) => await onGuildMemberRemove(member));
		Zero.RaidClient
			.on("guildCreate", async (guild: Guild) => await onGuildCreate(guild));
		Zero.RaidClient
			.on("guildMemberUpdate", async (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember | PartialGuildMember) => await onGuildMemberUpdate(oldMember, newMember));
		Zero.RaidClient
			.on("error", async (error: Error) => onError(error));
		Zero.RaidClient
			.on("channelDelete", async (channel: Channel | PartialDMChannel) => await onChannelDelete(channel));

		// testing
		if (!PRODUCTION_BOT) {
			process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
		}

		this.startServices();
	}

	/**
	 * Logs into the client. This method should be called first. If this method call is successful, the bot will also attempt to connect to MongoDB.
	 */
	public async login(): Promise<void> {
		try {
			const mdm: MongoDbHelper.MongoDbBase = new MongoDbHelper.MongoDbBase();
			await mdm.connect();
			await Zero.RaidClient.login(this._token);
			(Zero.RaidClient.user as ClientUser).setActivity("my soul dying.", { type: "WATCHING" });
		}
		catch (e) {
			throw new ReferenceError(e);
		}
	}

	private _startedServices: boolean = false; 

	/**
	 * Starts any applicable services.
	 */
	private async startServices(): Promise<void> {
		if (this._startedServices) {
			return;
		}

		this._startedServices = true;
		
		// check raid vcs and clean
		setInterval(async () => {
			const docs: IRaidGuild[] = await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.find({}).toArray();
			for await (const doc of docs) {
				if (BotConfiguration.exemptGuild.includes(doc.guildID)) {
					continue;
				}

				let guild: Guild;
				try {
					guild = await Zero.RaidClient.guilds.fetch(doc.guildID);
				}
				catch (e) {
					continue;
				}

				for (const raidInfo of doc.activeRaidsAndHeadcounts.raidChannels) {
					let vc: VoiceChannel | null = null;
					try {
						vc = await Zero.RaidClient.channels.fetch(raidInfo.vcID) as VoiceChannel;
					}
					finally {
						if (vc !== null 
							&& raidInfo.status === RaidStatus.InRun 
							&& vc.members.size === 0
							&& (guild.me as GuildMember).permissions.has("MANAGE_CHANNELS")) {
							let personThatCreatedVc: GuildMember;
							try {
								personThatCreatedVc = await guild.members.fetch(raidInfo.startedBy);
							}
							catch (e) {
								personThatCreatedVc = guild.me as GuildMember;
							}
		
							await RaidHandler.endRun(personThatCreatedVc, guild, raidInfo);
							continue;
						}

						if (vc === null) {
							let personThatCreatedVc: GuildMember;
							try {
								personThatCreatedVc = await guild.members.fetch(raidInfo.startedBy);
							}
							catch (e) {
								personThatCreatedVc = guild.me as GuildMember;
							}
							await RaidHandler.endRun(personThatCreatedVc, guild, raidInfo, true);
						}
					}
				}
			}
		}, 2 * 60 * 1000);
	}
}