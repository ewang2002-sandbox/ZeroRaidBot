// TODO
// - implement key tier role
// - prevent duplicate/invalid entries (especially with afk check/control panel)

import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, Role, Collection, Guild, TextChannel, MessageReaction, User, ReactionCollector, EmojiResolvable, GuildChannel, MessageCollector } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { AFKDungeon } from "../../Constants/AFKDungeon";
import { ISection } from "../../Templates/ISection";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { GuildUtil } from "../../Utility/GuildUtil";
import { FilterQuery, UpdateQuery } from "mongodb";
import { StringBuilder } from "../../Classes/String/StringBuilder";
import { IDungeonData } from "../../Definitions/IDungeonData";
import { Zero } from "../../Zero";
import { StringUtil } from "../../Utility/StringUtil";
import { NumberUtil } from "../../Utility/NumberUtil";

type QType = {
	q: string;
	d: string;
	m: boolean;
	mainMongo: string;
	sectMongo: string;
};

type SBGetterType = {
	channelSB: StringBuilder;
	roleSB: StringBuilder;
	verifSB: StringBuilder;
};

type DungeonSelectionType = {
	data: IDungeonData;
	isIncluded: boolean;
};

export class ConfigureSectionCommand extends Command {
	private readonly _flags: ("ADD" | "REMOVE" | "MODIFY")[] = [
		"ADD",
		"REMOVE",
		"MODIFY"
	];

	private static MAX_SECTIONS: number = 8;

	/**
	 * q = question/title
	 * d = description 
	 * m = main only? 
	 * 
	 * mainMongo = path to the main server config path for channel
	 * sectMongo = path to the section config path for channel ("" if channel is main only)
	 */
	private readonly _channelQs: QType[] = [
		{
			q: "Configure AFK Check Channel",
			d: "Mention, or type the ID of, the channel that you want the bot to use as the AFK check channel.",
			m: false,
			mainMongo: "generalChannels.generalRaidAfkCheckChannel",
			sectMongo: "sections.$.channels.afkCheckChannel"
		},
		{
			q: "Configure Control Panel Channel",
			d: "Mention, or type the ID of, the channel that you want the bot to use as the control panel channel. This channel is where raid leaders will be able to execute various raid commands during a raid.",
			m: false,
			mainMongo: "generalChannels.controlPanelChannel",
			sectMongo: "sections.$.channels.controlPanelChannel"
		},
		{
			q: "Configure Verification Channel",
			d: "Mention, or type the ID of, the channel that you want the bot to use as the verification channel. This channel is where new members can verify to either get entry into the section or the server as a whole.",
			m: false,
			mainMongo: "generalChannels.verificationChan",
			sectMongo: "sections.$.channels.verificationChannel"
		},
		{
			q: "Configure Verification Attempts Channel",
			d: "Mention, or type the ID of, the channel that you want the bot to use as the logging channel for verification attempts. Any attempts made in verification -- like when someone starts the process, fails a verification requirement, etc. -- will be logged.",
			m: false,
			mainMongo: "generalChannels.logging.verificationAttemptsChannel",
			sectMongo: "sections.$.channels.logging.verificationAttemptsChannel"
		},
		{
			q: "Configure Verification Success Channel",
			d: "Mention, or type the ID of, the channel that you want the bot to use as the logging channel for verification successes.",
			m: false,
			mainMongo: "generalChannels.logging.verificationSuccessChannel",
			sectMongo: "sections.$.channels.logging.verificationSuccessChannel"
		},
		{
			q: "Configure Reaction Logging Channel",
			d: "Mention, or type the ID of, the channel that you want the bot to use as the logging channel for reactions. When someone reacts (to a key, class emoji, etc.), it will be logged in this channel.",
			m: false,
			mainMongo: "generalChannels.logging.reactionLoggingChannel",
			sectMongo: "sections.$.channels.logging.reactionLoggingChannel"
		},
		{
			q: "Configure Manual Verification Channel",
			d: "Mention, or type the ID of, the channel that you want the bot to use for manual verifications. If someone's profile is suspicious or missing something, then the bot will forward a summary of the profile to this channel to be reviewed.",
			m: false,
			mainMongo: "generalChannels.manualVerification",
			sectMongo: "sections.$.channels.manualVerification"
		},
		{
			q: "Configure Moderation Logging Channel",
			d: "Mention, or type the ID of, the channel that you want the bot to use as the logging channel for moderation. Any major moderation actions carried out through the bot -- mute & blacklist -- will be logged in this channel.",
			m: true,
			mainMongo: "generalChannels.logging.moderationLogs",
			sectMongo: ""
		},
		{
			q: "Configure Suspension Logging Command",
			d: "Mention, or type the ID of, the channel that you want the bot to use as the logging channel for suspensions. Any suspensions or unsuspensions will be logged in this channel.",
			m: true,
			mainMongo: "generalChannels.logging.suspensionLogs",
			sectMongo: ""
		},
		{
			q: "Configure Join & Leave Logging Channel",
			d: "Mention, or type the ID of, the channel that you want the bot to use as the logging channel for member join & leave actions.",
			m: true,
			mainMongo: "generalChannels.logging.joinLeaveChannel",
			sectMongo: ""
		},
		{
			q: "Configure Bot Updates Channel",
			d: "Mention, or type the ID of, the channel that you want to make the bot updates channel. Any changelogs by the developer will be sent to this channel.",
			m: true,
			mainMongo: "generalChannels.logging.botUpdatesChannel",
			sectMongo: ""
		},
		{
			q: "Configure Moderation Mail Channel",
			d: "Mention, or type the ID of, the channel that you want to make the moderation mail channel.",
			m: true,
			mainMongo: "generalChannels.modMailChannel",
			sectMongo: ""
		},
		{
			q: "Configure Raid Requests Channel",
			d: "Mention, or type the ID of, the channel that you want to make the raid requests channel. When a Trial Leader want to start their own raid, a message will be sent to this channel with the following information: location, section, dungeon, time/date. The request will expire in 5 minutes.",
			m: true,
			mainMongo: "generalChannels.raidRequestChannel",
			sectMongo: ""
		},
		{
			q: "Configure Network Announcements Channel",
			d: "Mention, or type the ID of, the channel that you want to make the network announcements channel. When a message is sent in the Network Announcements channel in the Network Administrator's server, the message will be forwarded to all servers.",
			m: true,
			mainMongo: "generalChannels.networkAnnouncementsChannel",
			sectMongo: ""
		}
	];

	/**
	 * q = question/title
	 * d = description 
	 * m = main only? 
	 * 
	 * mainMongo = path to the main server config path for role
	 * sectMongo = path to the section config path for role ("" if channel is main only)
	 */
	private readonly _roleQs: QType[] = [
		{
			q: "Configure Member Role",
			d: "Mention, or type the ID of, the role that you want to make the Member role. Members will need this role to access the section (or the server).",
			m: false,
			mainMongo: "roles.raider",
			sectMongo: "sections.$.verifiedRole"
		},
		{
			q: "Configure Team Role",
			d: "Mention, or type the ID of, the role that you want to make the Team role. All staff members will have this role.",
			m: true,
			mainMongo: "roles.teamRole",
			sectMongo: ""
		},
		{
			q: "Configure Moderator Role",
			d: "Mention, or type the ID of, the role that you want to make the Moderator role. Moderators will have access to commands like blacklists and should generally have all permissions except for full Administrator.",
			m: true,
			mainMongo: "roles.moderator",
			sectMongo: ""
		},
		{
			q: "Configure Head Leader Role",
			d: "Mention, or type the ID of, the role that you want to make the Head Leader role. Head Leaders will have the ability to promote and demote members and are generally in charge of raiding affairs.",
			m: true,
			mainMongo: "roles.headRaidLeader",
			sectMongo: ""
		},
		{
			q: "Configure Officer Role",
			d: "Mention, or type the ID of, the role that you want to make the Officer role. Officers will be able to access most moderation commands, including blacklists. Think of officers like Head Leaders, but without the ability to lead.",
			m: true,
			mainMongo: "roles.officer",
			sectMongo: ""
		},
		{
			q: "Configure Universal Leader Role",
			d: "Mention, or type the ID of, the role that you want to make the Universal Leader role. Leaders will have the ability to suspend members. **NOTE:** Universal Leaders have the ability to start AFK checks and headcounts in ANY section.",
			m: true,
			mainMongo: "roles.universalRaidLeader",
			sectMongo: ""
		},
		{
			q: "Configure Section Leader Role",
			d: "Mention, or type the ID of, the role that you want to make the Section Leader role. Section Leaders will have the ability to suspend members. **NOTE:** Unlike universal leaders, section leaders can only start AFK checks and headcounts in their designated sections.",
			m: false,
			mainMongo: "roles.mainSectionLeaderRole.sectionLeaderRole",
			sectMongo: "sections.$.roles.raidLeaderRole"
		},
		{
			q: "Configure Universal Almost Leader Role",
			d: "Mention, or type the ID of, the role that you want to make the Universal Almost Leader role. Almost Leaders (ARLs) are leaders that have more experience than a Trial Leader but are not quite ready for the full responsibilities associated with being a Leader. **NOTE:** Universal Almost Leaders have the ability to start AFK checks in ANY section.",
			m: true,
			mainMongo: "roles.universalAlmostRaidLeader",
			sectMongo: ""
		},
		{
			q: "Configure Section Almost Leader Role",
			d: "Mention, or type the ID of, the role that you want to make the Section Almost Leader role. Section Almost Leaders are leaders that have more experience than a Section Trial Leader but are not quite ready for the full responsibilities associated with being a full-on Section Leader. **NOTE:** Unlike universal almost leaders, section almost leaders can only start AFK checks and headcounts in their designated sections.", // this sounds awkward to say out loud, doesn't it? 
			m: false,
			mainMongo: "roles.sectionAlmostLeader",
			sectMongo: "sections.$.roles.almostLeaderRole"
		},
		{
			q: "Configure Section Trial Leader Role",
			d: "Mention, or type the ID of, the role that you want to make the Section Leader role. Section Trial Leaders will be able to start AFK checks in their designated sections with approval from a Raid Leader. **NOTE:** Sction trial leaders can only start AFK checks and headcounts in their designated sections.",
			m: false,
			mainMongo: "roles.mainSectionLeaderRole.sectionTrialLeaderRole",
			sectMongo: "sections.$.roles.trialLeaderRole"
		},
		{
			q: "Configure Support Role",
			d: "Mention, or type the ID of, the role that you want to make the Support role. Support/Helpers are generally in charge of moderating chat, and will have access to commands like mute, find, and more.",
			m: true,
			mainMongo: "roles.support",
			sectMongo: ""
		},
		{
			q: "Configure Verifier Role",
			d: "Mention, or type the ID of, the role that you want to make the Verifier role. Verifiers will be able to access the find and manual verification command.",
			m: true,
			mainMongo: "roles.verifier",
			sectMongo: ""
		},
		{
			q: "Configure Pardoned Leader Role",
			d: "Mention, or type the ID of, the role that you want to make the Pardoned Leader role. Pardoned Leaders are simply leaders, regardless of original rank, on leave. That is, they are taking a break from leading.",
			m: true,
			mainMongo: "roles.pardonedRaidLeader",
			sectMongo: ""
		},
		{
			q: "Configure Suspended Role",
			d: "Mention, or type the ID of, the role that you want to make the Suspended role. Members with this role are not formally banned from the server, but cannot see any raiding channels or member-only channels.",
			m: true,
			mainMongo: "roles.suspended",
			sectMongo: ""
		}
	];

	/**
	 * The constructor for this class.
	 */
	public constructor() {
		super(
			new CommandDetail(
				"Configure Section Wizard",
				"configsection",
				["configsections"],
				"Opens a wizard where you can add, remove, or modify existing sections.",
				["configsection [add | remove | modify]"],
				["configsection add"],
				1
			),
			new CommandPermission(
				["MANAGE_GUILD"],
				["ADD_REACTIONS", "MANAGE_MESSAGES", "EMBED_LINKS"],
				["moderator"],
				[],
				false
			),
			true,
			false,
			false
		);
	}

	/**
	 * @inheritdoc
	 */
	public async executeCommand(msg: Message, args: string[], guildData: IRaidGuild): Promise<void> {
		let foundFlag: "ADD" | "REMOVE" | "MODIFY" | undefined;
		for (const flag of this._flags) {
			if (flag === args[0].toUpperCase()) {
				foundFlag = flag;
			}
		}

		if (typeof foundFlag === "undefined") {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_CHOICE_CHOICE", null, "ADD", "REMOVE", "MODIFY"), msg.channel as TextChannel);
			return;
		}

		switch (foundFlag) {
			case "ADD":
				this.add(msg, guildData);
				break;
			case "REMOVE":
				this.remove(msg, guildData);
				break;
			case "MODIFY":
				this.modify(msg, guildData);
				break;
			default:
				break;
		}
	}

	// ================================================ //
	//													//
	// DIRECT METHOD CALLS								//
	//													//
	// ================================================ //

	/**
	 * A method that adds a section to the guild document.
	 * @param {Message} msg The message object.
	 * @param {IRaidGuild} guildData The guild db.
	 */
	private async add(msg: Message, guildData: IRaidGuild): Promise<void> {
		// + 2 b/c we also include the main section
		if (guildData.sections.length + 2 > ConfigureSectionCommand.MAX_SECTIONS) {
			await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "MAX_LIMIT_REACHED", null, ConfigureSectionCommand.MAX_SECTIONS.toString()), msg.channel as TextChannel);
			return;
		}

		// get name
		const nameOfSectionPrompt: MessageEmbed = new MessageEmbed()
			.setTitle("**Set Section Name**")
			.setDescription("Please type the desired name of the section.")
			.setColor("RANDOM")
			.setFooter((msg.guild as Guild).name)
			.setTimestamp();
		const col0: GenericMessageCollector<string> = new GenericMessageCollector(msg, {
			embed: nameOfSectionPrompt
		}, 5, TimeUnit.MINUTE);

		const nameOfSection: string | "CANCEL" | "TIME" = await col0.send(GenericMessageCollector.getStringPrompt(msg.channel));
		if (nameOfSection === "CANCEL" || nameOfSection === "TIME") {
			return;
		}

		// ===============================================
		// get channel 
		const verificationPromptChannel: MessageEmbed = new MessageEmbed()
			.setTitle("**Configure Verification Channel**")
			.setDescription("Please either tag the verification channel or type the ID of the verification channel for this new section.")
			.setColor("RANDOM")
			.setFooter((msg.guild as Guild).name)
			.setTimestamp();

		const col1: GenericMessageCollector<TextChannel | "SKIP" | "-"> = new GenericMessageCollector<TextChannel | "SKIP">(
			msg,
			{ embed: verificationPromptChannel },
			5,
			TimeUnit.MINUTE
		);

		const verifChan: TextChannel | "SKIP" | "CANCEL" | "TIME" | "-" = await col1.send(this.getChannelPrompt(msg));

		if (verifChan === "CANCEL" || verifChan === "TIME") {
			return;
		}

		// ===============================================
		const afkCheckPromptChannel: MessageEmbed = new MessageEmbed()
			.setTitle("**Configure AFK Check Channel**")
			.setDescription("Please either tag the AFK check channel or type the ID of the AFK check channel for this new section. If you want to skip this process, type `skip`.")
			.setColor("RANDOM")
			.setFooter((msg.guild as Guild).name)
			.setTimestamp();

		const col2: GenericMessageCollector<TextChannel | "SKIP" | "-"> = new GenericMessageCollector<TextChannel | "SKIP" | "-">(
			msg,
			{ embed: afkCheckPromptChannel },
			5,
			TimeUnit.MINUTE
		);

		const afkCheckChan: TextChannel | "SKIP" | "CANCEL" | "TIME" | "-" = await col2.send(this.getChannelPrompt(msg));

		if (afkCheckChan === "CANCEL" || afkCheckChan === "TIME") {
			return;
		}

		// ===============================================
		const controlPanelPrompt: MessageEmbed = new MessageEmbed()
			.setTitle("**Configure Control Panel Channel**")
			.setDescription("Please either tag the control panel channel or type the ID of the control panel channel for this new section. This is __required__ since you have chosen an AFK check channel. The control panel channel CANNOT be the AFK check channel.")
			.setColor("RANDOM")
			.setFooter((msg.guild as Guild).name)
			.setTimestamp();

		let controlPanelChan: TextChannel | string = "";
		if (afkCheckChan !== "SKIP") {
			const col4: GenericMessageCollector<TextChannel> = new GenericMessageCollector<TextChannel>(
				msg,
				{ embed: controlPanelPrompt },
				5,
				TimeUnit.MINUTE
			);

			const controlPanelChannel: TextChannel | "CANCEL" | "TIME" = await col4.send(
				GenericMessageCollector.getChannelPrompt(msg, msg.channel)
			);

			if (controlPanelChannel === "CANCEL" || controlPanelChannel === "TIME") {
				return;
			}

			if (afkCheckChan !== "-" && controlPanelChannel.id === afkCheckChan.id) {
				MessageUtil.send({ content: "The AFK check channel and control panel channel cannot be the same! Try again. " }, msg.channel);
				return;
			}
			controlPanelChan = controlPanelChannel;
		}

		// ===============================================
		// get role now
		const rolePromptChannel: MessageEmbed = new MessageEmbed()
			.setTitle("**Configure Role**")
			.setDescription("Please either ping the role or type the ID of the role for this new section. ")
			.setColor("RANDOM")
			.setFooter((msg.guild as Guild).name)
			.setTimestamp();

		const col3: GenericMessageCollector<Role> = new GenericMessageCollector<Role>(
			msg,
			{ embed: rolePromptChannel },
			5,
			TimeUnit.MINUTE
		);

		const verifiedRole: Role | "CANCEL" | "TIME" = await col3.send(
			GenericMessageCollector.getRolePrompt(msg, msg.channel)
		);

		if (verifiedRole === "CANCEL" || verifiedRole === "TIME") {
			return;
		}

		// now we have all three 
		await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guildData.guildID }, {
			$push: {
				sections: {
					nameOfSection: nameOfSection,
					verifiedRole: verifiedRole.id,
					roles: {
						trialLeaderRole: "",
						raidLeaderRole: "",
						almostLeaderRole: ""
					},
					isMain: false,
					channels: {
						afkCheckChannel: afkCheckChan === "SKIP" || afkCheckChan === "-" ? "" : afkCheckChan.id,
						verificationChannel: verifChan === "SKIP" || verifChan === "-" ? "" : verifChan.id,
						controlPanelChannel: typeof controlPanelChan === "string" ? "" : controlPanelChan.id,
						manualVerification: "",
						logging: {
							verificationAttemptsChannel: "",
							verificationSuccessChannel: "",
							reactionLoggingChannel: ""
						}
					},
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
					properties: {
						dungeons: AFKDungeon.map(x => x.id),
						manualVerificationEntries: [],
						showVerificationRequirements: true
					}
				}
			}
		});
	}

	/**
	 * Removes a section from the guild db.
	 * @param {Message} msg The message object. 
	 * @param {IRaidGuild} guildData The guild document. 
	 */
	private async remove(msg: Message, guildData: IRaidGuild): Promise<IRaidGuild> {
		if (guildData.sections.length === 0) {
			await MessageUtil.send({ content: "There is nothing to remove because there are no sections currently available." }, msg.channel as TextChannel);
			return guildData;
		}

		const resp: ISection | "CANCEL" | "TIME" = await this.getSection(msg, guildData, "REMOVE");

		if (resp === "CANCEL" || resp === "TIME") {
			return guildData;
		}

		return (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: (msg.guild as Guild).id }, {
			$pull: {
				"sections.verifiedRole": resp.verifiedRole
			}
		}, { returnOriginal: false })).value as IRaidGuild
	}

	/**
	 * Modifies a section.
	 * @param {Message} msg The message obj. 
	 * @param {IRaidGuild} guildData The guild db. 
	 */
	private async modify(msg: Message, guildData: IRaidGuild): Promise<void> {
		const resp: ISection | "CANCEL" | "TIME" = await this.getSection(msg, guildData, "MODIFY");

		if (resp === "CANCEL" || resp === "TIME") {
			return;
		}
		this.modifyMainMenu(msg, guildData, resp);
	}

	/**
	 * TODO: Implement
	 */
	private async list(): Promise<void> {
		// TODO implement
	}



	// ================================================ //
	//													//
	// MENUS (FOR INTERACTION)							//
	//													//
	// ================================================ //

	/**
	 * The main menu where someone can modify a section.
	 * @param {Message} msg The message object. 
	 * @param {IRaidGuild} guildData The guild data. 
	 * @param {ISection} section The section. 
	 * @param {Message} [botSentMsg] The message that the bot sent (if we want to edit the old bot message). 
	 * @param {boolean} [isOriginalBotMessage] Whether the message defined in the previous argument was NOT modified (true) in any way or not
	 */
	private async modifyMainMenu(
		msg: Message,
		guildData: IRaidGuild,
		section: ISection,
		botSentMsg?: Message,
		isOriginalBotMessage?: boolean
	) {
		const guild: Guild = msg.guild as Guild;
		const sbGetter: SBGetterType = this.getStringRepOfGuildDoc(msg, section, guildData);
		const afkCheckChannel: GuildChannel | undefined = guild.channels.cache.get(section.channels.afkCheckChannel);
		const controlPanelChannel: GuildChannel | undefined = guild.channels.cache.get(section.channels.controlPanelChannel);

		// build stringbuilders and embed
		const roleStr: string = sbGetter.roleSB.toString();
		const channelStr: string = sbGetter.channelSB.toString();
		const verificationStr: string = sbGetter.verifSB.toString();
		const emojisToReact: EmojiResolvable[] = [];
		const embed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", { authorType: "GUILD", includeTimestamp: true })
			.setTitle(`**Section Modification**: ${section.nameOfSection} ${section.isMain ? "(Main)" : ""}`)
			.setDescription(`${roleStr}\n\n${channelStr}\n\n${verificationStr}`)
			.setTimestamp()
			.setFooter(guild.name)
			.setColor("RANDOM");

		if (!section.isMain) {
			embed.addField("Change Section Name", "React with 📋 if you want to change the name of this section.");
			emojisToReact.push("📋");
		}

		embed.addField("Configure Section Channels", "React with #️⃣ if you want to configure the channels for this section.")
			.addField("Configure Section Roles", "React with 📁 if you want to configure the roles for this section.")
			.addField("Configure Verification Requirements", "React with ✅ if you want to configure verification requirements.");
		emojisToReact.push("#️⃣", "📁", "✅");
		// you can't start raids unless you have an afk check channel
		if (typeof afkCheckChannel !== "undefined"
			&& typeof controlPanelChannel !== "undefined") {
			embed.addField("Configure Section Dungeon", "React with 🏃 to configure the dungeons that a raid leader can or cannot start an AFK check for.");
			emojisToReact.push("🏃");
		}
		embed.addField("Cancel Process", "React with ❌ to cancel this process.");
		emojisToReact.push("❌");

		// send out msg and react.
		let m: Message;
		if (typeof botSentMsg !== "undefined") {
			if (isOriginalBotMessage) { // better boolean logic? 
				m = botSentMsg;
			}
			else {
				m = await botSentMsg.edit(embed);
				await botSentMsg.reactions.removeAll();
			}
		}
		else {
			m = await msg.channel.send(embed);
		}

		for await (const reaction of emojisToReact) {
			await m.react(reaction).catch(() => { });
		}

		const reactCollector: ReactionCollector = m.createReactionCollector(this.reactionCollectionFilter(emojisToReact, msg), {
			time: 900000,
			max: 1
		});

		reactCollector.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
			//console.log(reason); // => limit
		});

		reactCollector.on("collect", async (r: MessageReaction) => {
			await r.remove().catch(() => { });
			reactCollector.stop();

			// change name of section
			if (r.emoji.name === "📋") {
				guildData = await this.changeNameOfSectionCommand(msg, guildData, section, m);

				if (section.isMain) {
					section = GuildUtil.getDefaultSection(guildData);
				}
				else {
					// this part only handles channel modifications, not role modifications
					// so we know that the role should be constant 
					section = guildData.sections.find(x => x.verifiedRole === section.verifiedRole) as ISection;
				}
				this.modifyMainMenu(msg, guildData, section, m, false);
				return;
			}
			// change channels
			else if (r.emoji.name === "#️⃣") {
				await this.sectionChannelMenuCommand(msg, guildData, section, m, false, channelStr);
			}
			// change roles
			else if (r.emoji.name === "📁") {
				await this.sectionRoleMenuCommand(msg, guildData, section, m, false, roleStr);
			}
			// change verification
			else if (r.emoji.name === "✅") {
				await this.sectionVerificationMenuCommand(msg, guildData, section, m, false, verificationStr);
			}
			// dungeon config
			else if (r.emoji.name === "🏃") {
				await this.resetBotEmbed(m).catch(() => { });
				guildData = await this.configDungeonCommand(msg, section, guildData);
				this.modifyMainMenu(msg, guildData, section, m, false);
				return;
			}
			// cancel
			else if (r.emoji.name === "❌") {
				await m.delete().catch(() => { });
				return;
			}
		});
	}

	/**
	 * Menu for section channel configuration.
	 * @param {Message} msg The message object. 
	 * @param {IRaidGuild} guildData The guild data. 
	 * @param {ISection} section The section. 
	 * @param {Message} botSentMsg The message that the bot sent (if we want to edit the old bot message). 
	 * @param {boolean} isSameBotMessage Whether the function was called from itself (true) or from an external function.
	 * @param {string} channelInfo The channel information string.
	 */
	private async sectionChannelMenuCommand(
		msg: Message,
		guildData: IRaidGuild,
		section: ISection,
		botSentMsg: Message,
		isSameBotMessage: boolean,
		channelInfo: string
	): Promise<void> {
		if (!isSameBotMessage) {
			await botSentMsg.reactions.removeAll().catch(() => { });
		}
		const guild: Guild = msg.guild as Guild;
		const reactions: EmojiResolvable[] = [];

		const embed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", { authorType: "GUILD", includeTimestamp: true })
			.setTitle(`**Modifying Section Channels**: ${section.nameOfSection} ${section.isMain ? "(Main)" : ""}`)
			.setDescription(channelInfo)
			.setTimestamp()
			.setFooter(guild.name)
			.setColor("RANDOM");

		//#region append channels to messageembed 
		embed
			.addField("Go Back", "React with ⬅️ to go back to the Main Menu.")
			.addField("Configure AFK Check Channel", "React with 🚥 to configure the AFK check channel.")
			.addField("Configure Control Panel Channel", "React with 💻 to configure the control panel channel. The control panel is where raid leaders can execute raid-related commands.")
			.addField("Configure Verification Channel", "React with ✅ to configure the verification channel.")
			.addField("Configure Manual Verification Channel", "React with 🔍 to configure the manual verification channel.")
			.addField("Configure Verification Attempts Channel", "React with 🥈 to configure the verification attempts channel. The bot will forward all verification attempts here.")
			.addField("Configure Verification Success Channel", "React with 🥇 to configure the verification success channel. The bot will forward successful verification attempts here.")
			.addField("Configure Reaction Logging Channel", "React with 😄 to configure the reaction logging channel. The bot will forward any major reaction events (like a user reacting to a key or class emoji on an AFK check) here.");

		reactions.push("⬅️", "🚥", "💻", "✅", "🔍", "🥈", "🥇", "😄");

		if (section.isMain) {
			embed
				.addField("Configure Moderation Logging Channel", "React with ⚒️ to configure the moderation logging channel. Blacklist and mute notifications will be forwarded to this channel")
				.addField("Configure Suspension Logging Channel", "React with ⚠️ to configure the suspension logging command.")
				.addField("Configure Join & Leave Logging Channel", "React with 📥 to configure join & leave logs.")
				.addField("Configure Bot Updates Channel", "React with 🤖 to configure the bot updates channel. Any bot changelog information will be forwarded to this channel.")
				.addField("Configure Moderation Mail Channel", "React with 📬 to configure the moderation mail channel.")
				.addField("Configure Raid Requests Channel", "React with ❓ to configure the raid requests channel.")
				.addField("Configure Network Announcements Channel", "React with to configure the network announcements channel.");

			reactions.push("⚒️", "⚠️", "📥", "🤖", "📬", "❓", "📢");
		}

		embed
			.addField("Channel Wizard", "React with 💾 to begin the channel wizard. This is ideal if this is your first time fully customizing the section's channel.")
		reactions.push("💾");

		//#endregion

		try {
			botSentMsg = await botSentMsg.edit(embed);
		}
		catch (e) { // probably got deleted.
			botSentMsg = await msg.channel.send(botSentMsg);
		}

		if (!isSameBotMessage) {
			for await (const reaction of reactions) {
				await botSentMsg.react(reaction).catch(() => { });
			}
		}

		const reactCollector: ReactionCollector = botSentMsg.createReactionCollector(this.reactionCollectionFilter(reactions, msg), {
			time: 900000,
			max: 1
		});

		reactCollector.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
			//console.log(reason);
		});

		reactCollector.on("collect", async (r: MessageReaction) => {
			await r.remove().catch(() => { });
			reactCollector.stop(); // TODO acknowledge for reason TIME

			let res: IRaidGuild | "CANCEL" | "TIME";
			// go back
			if (r.emoji.name === "⬅️") {
				this.modifyMainMenu(msg, guildData, section, botSentMsg);
				return;
			}
			// afk check channel
			else if (r.emoji.name === "🚥") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"AFK Check Channel",
					section,
					guild.channels.cache.get(section.channels.afkCheckChannel),
					section.isMain
						? "generalChannels.generalRaidAfkCheckChannel"
						: "sections.$.channels.afkCheckChannel"
				);
			}
			// control panel channel
			else if (r.emoji.name === "💻") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"Control Panel Channel",
					section,
					guild.channels.cache.get(section.channels.controlPanelChannel),
					section.isMain
						? "generalChannels.controlPanelChannel"
						: "sections.$.channels.controlPanelChannel"
				);
			}
			// verification channel
			else if (r.emoji.name === "✅") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"Verification Channel",
					section,
					guild.channels.cache.get(section.channels.verificationChannel),
					section.isMain
						? "generalChannels.verificationChan"
						: "sections.$.channels.verificationChannel"
				);
			}
			else if (r.emoji.name === "🔍") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"Manual Verification Channel",
					section,
					guild.channels.cache.get(section.channels.manualVerification),
					section.isMain
						? "generalChannels.manualVerification"
						: "sections.$.channels.manualVerification"
				);
			}
			// verification attempts channel
			else if (r.emoji.name === "🥈") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"Verification Attempts Logging Channel",
					section,
					guild.channels.cache.get(section.channels.logging.verificationAttemptsChannel),
					section.isMain
						? "generalChannels.logging.verificationAttemptsChannel"
						: "sections.$.channels.logging.verificationAttemptsChannel"
				);
			}
			// verification success channel
			else if (r.emoji.name === "🥇") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"Verification Success Logging Channel",
					section,
					guild.channels.cache.get(section.channels.logging.verificationSuccessChannel),
					section.isMain
						? "generalChannels.logging.verificationSuccessChannel"
						: "sections.$.channels.logging.verificationSuccessChannel"
				);
			}
			// reaction logging
			else if (r.emoji.name === "😄") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"Reaction Logging Channel",
					section,
					guild.channels.cache.get(section.channels.logging.reactionLoggingChannel),
					section.isMain
						? "generalChannels.logging.reactionLoggingChannel"
						: "sections.$.channels.logging.reactionLoggingChannel"
				);
			}
			// mod log channel
			else if (r.emoji.name === "⚒️") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"Moderation Channel",
					section,
					guild.channels.cache.get(guildData.generalChannels.logging.moderationLogs),
					"generalChannels.logging.moderationLogs"
				);
			}
			// suspension cmd
			else if (r.emoji.name === "⚠️") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"Suspension Logging Channel",
					section,
					guild.channels.cache.get(guildData.generalChannels.logging.suspensionLogs),
					"generalChannels.logging.suspensionLogs"
				);
			}
			// join leave
			else if (r.emoji.name === "📥") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"Join & Leave Channel",
					section,
					guild.channels.cache.get(guildData.generalChannels.logging.joinLeaveChannel),
					"generalChannels.logging.joinLeaveChannel"
				);
			}
			// bot updates
			else if (r.emoji.name === "🤖") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"Bot Updates Channel",
					section,
					guild.channels.cache.get(guildData.generalChannels.logging.botUpdatesChannel),
					"generalChannels.logging.botUpdatesChannel"
				);
			}
			// mod mail
			else if (r.emoji.name === "📬") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"Moderation Mail Channel",
					section,
					guild.channels.cache.get(guildData.generalChannels.modMailChannel),
					"generalChannels.modMailChannel"
				);
			}
			else if (r.emoji.name === "❓") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"Raid Requests Channel",
					section,
					guild.channels.cache.get(guildData.generalChannels.raidRequestChannel),
					"generalChannels.raidRequestChannel"
				);
			}
			else if (r.emoji.name === "📢") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateChannelCommand(
					msg,
					"Network Announcements Channel",
					section,
					guild.channels.cache.get(guildData.generalChannels.networkAnnouncementsChannel),
					"generalChannels.networkAnnouncementsChannel"
				);
			}
			// configuration wizard
			else if (r.emoji.name === "💾") {
				res = await this.startWizard(msg, section, botSentMsg, this._channelQs, "CHANNEL");
			}
			else {
				return; // because of strict typing
			}

			if (res === "TIME") {
				// cancel ENTIRE process
				// stop EVERYTHING
				await botSentMsg.delete().catch(() => { });
				return;
			}

			if (res === "CANCEL") {
				this.sectionChannelMenuCommand(msg, guildData, section, botSentMsg, false, channelInfo);
				return;
			}

			if (section.isMain) {
				section = GuildUtil.getDefaultSection(res);
			}
			else {
				// this part only handles channel modifications, not role modifications
				// so we know that the role should be constant 
				section = res.sections.find(x => x.verifiedRole === section.verifiedRole) as ISection;
			}

			this.sectionChannelMenuCommand(msg, res, section, botSentMsg, false, this.getStringRepOfGuildDoc(msg, section, res).channelSB.toString());
		});
	}

	/**
	 * Menu for section channel configuration.
	 * @param {Message} msg The message object. 
	 * @param {IRaidGuild} guildData The guild data. 
	 * @param {ISection} section The section. 
	 * @param {Message} botSentMsg The message that the bot sent (if we want to edit the old bot message). 
	 * @param {boolean} isSameBotMessage Whether the function was called from itself (true) or from an external function.
	 * @param {string} roleInfo The role information string.
	 */
	private async sectionRoleMenuCommand(
		msg: Message,
		guildData: IRaidGuild,
		section: ISection,
		botSentMsg: Message,
		isSameBotMessage: boolean,
		roleInfo: string
	): Promise<void> {
		if (!isSameBotMessage) {
			await botSentMsg.reactions.removeAll().catch(() => { });
		}
		const guild: Guild = msg.guild as Guild;
		const reactions: EmojiResolvable[] = [];

		const embed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", { authorType: "GUILD", includeTimestamp: true })
			.setTitle(`**Modifying Section Roles**: ${section.nameOfSection} ${section.isMain ? "(Main)" : ""}`)
			.setDescription(roleInfo)
			.setTimestamp()
			.setFooter(guild.name)
			.setColor("RANDOM");

		//#region append channels to messageembed 
		embed
			.addField("Go Back", "React with ⬅️ to go back to the Main Menu.")
			.addField("Configure Member Role", "React with 💳 to configure the Member/Verified role.")
			.addField("Configure __Section__ Leader Role", "React with 🏳️ to configure the section leader role. Section leaders will be able to start AFK checks and headcounts in their respective section only.")
			.addField("Configure __Section__ Almost Leader Role", "React with 🏴 to configure the section almost leader role. Section almost leaders will be able to start AFK checks and headcounts in their respective sections only.")
			.addField("Configure __Section__ Trial Leader Role", "React with 🚩 to configure the section trial leader role. Section trial leaders will be able to start AFK checks (after getting approval from a leader) in their respective section only.");

		reactions.push("⬅️", "💳", "🏳️", "🏴", "🚩");

		if (section.isMain) {
			embed
				.addField("Configure Team Role", "React with 👪 to configure the Team role.")
				.addField("Configure Moderator Role", "React with ⚒️ to configure the Moderator role.")
				.addField("Configure Head Leader Role", "React with 🥇 to configure the Head Leader role.")
				.addField("Configure Officer Role", "React with 👮 to configure the Officer role.")
				.addField("Configure Universal Leader Role", "React with 🥈 to configure the Universal Leader role.")
				.addField("Configure Universal Almost Leader Role", "React with 🥉 to configure the Universal Almost Leader role.")
				.addField("Configure Support Role", "React with 📛 to configure the Support/Helper role.")
				.addField("Configure Verifier Role", "React with 🔎 to configure the Verifier role.")
				.addField("Configure Pardoned Leader Role", "React with 💤 to configure the Pardoned Leader role.")
				.addField("Configure Suspended Role", "React with ⛔ to configure the Suspended role.")
				.addField("Configure Talking Roles", "React with 🔈 to configure talking roles.")
				.addField("Configure Early Location Roles", "React with 🗺️ to configure early location roles.");
			//.addField("Configure Tier I Key Role", "React with 🗝️ to configure the Tier 1 Key Donator role.")
			//.addField("Configure Tier II Key Role", "React with 🔑 to configure the Tier 2 Key Donator role.")
			//.addField("Configure Tier III Key Role", "React with 🍀 to configure the Tier 3 Key Donator role.");

			reactions.push("👪", "⚒️", "🥇", "👮", "🥈", "🥉", "📛", "🔎", "💤", "⛔", "🔈", "🗺️");
			// , "🔈", "🗝️", "🔑", "🍀"
		}

		embed
			.addField("Role Wizard", "React with 💾 to begin the role wizard. This is ideal if this is your first time fully customizing the section's roles.")
		reactions.push("💾");
		//#endregion

		try {
			botSentMsg = await botSentMsg.edit(embed);
		}
		catch (e) { // probably got deleted.
			botSentMsg = await msg.channel.send(botSentMsg);
		}

		if (!isSameBotMessage) {
			for await (const reaction of reactions) {
				await botSentMsg.react(reaction).catch(() => { });
			}
		}

		const reactCollector: ReactionCollector = botSentMsg.createReactionCollector(this.reactionCollectionFilter(reactions, msg), {
			time: 900000,
			max: 1
		});

		reactCollector.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
			//console.log(reason);
		});

		reactCollector.on("collect", async (r: MessageReaction) => {
			await r.remove().catch(() => { });
			reactCollector.stop(); // TODO acknowledge for reason TIME

			let res: IRaidGuild | "CANCEL" | "TIME";
			// go back
			if (r.emoji.name === "⬅️") {
				this.modifyMainMenu(msg, guildData, section, botSentMsg);
				return;
			}
			else if (r.emoji.name === "👪") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Team Role",
					section,
					guild.roles.cache.get(guildData.roles.teamRole),
					"roles.teamRole"
				);
			}
			// raider role
			else if (r.emoji.name === "💳") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Raider Role",
					section,
					guild.roles.cache.get(section.verifiedRole),
					section.isMain
						? "roles.raider"
						: "sections.$.verifiedRole"
				);
			}
			// moderator role
			else if (r.emoji.name === "⚒️") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Moderator Role",
					section,
					guild.roles.cache.get(guildData.roles.moderator),
					"roles.moderator"
				);
			}
			// head raid leader role
			else if (r.emoji.name === "🥇") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Head Leader Role",
					section,
					guild.roles.cache.get(guildData.roles.headRaidLeader),
					"roles.headRaidLeader"
				);
			}
			// leader role
			else if (r.emoji.name === "🥈") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Leader Role",
					section,
					guild.roles.cache.get(guildData.roles.universalRaidLeader),
					"roles.universalRaidLeader"
				);
			}
			// almost leader
			else if (r.emoji.name === "🥉") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Almost Leader Role",
					section,
					guild.roles.cache.get(guildData.roles.universalAlmostRaidLeader),
					"roles.universalAlmostRaidLeader"
				);
			}
			// support
			else if (r.emoji.name === "📛") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Support/Helper Role",
					section,
					guild.roles.cache.get(guildData.roles.support),
					"roles.support"
				);
			}
			// pardoned rl
			else if (r.emoji.name === "💤") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Pardoned Leader Role",
					section,
					guild.roles.cache.get(guildData.roles.pardonedRaidLeader),
					"roles.pardonedRaidLeader"
				);
			}
			// suspended
			else if (r.emoji.name === "⛔") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Suspended Role",
					section,
					guild.roles.cache.get(guildData.roles.suspended),
					"roles.suspended"
				);
			}
			// talking roles
			else if (r.emoji.name === "🔈") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateArrayRoleCommand(
					msg,
					"Talking Roles",
					guildData,
					"roles.talkingRoles",
					guildData.roles.talkingRoles
				);
			}
			// early loc roles
			else if (r.emoji.name === "🗺️") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateArrayRoleCommand(
					msg,
					"Early Location Roles",
					guildData,
					"roles.earlyLocationRoles",
					guildData.roles.earlyLocationRoles
				);
			}
			// sec leader role
			else if (r.emoji.name === "🏳️") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Section Leader Roles",
					section,
					guild.roles.cache.get(section.roles.raidLeaderRole),
					section.isMain
						? "roles.mainSectionLeaderRole.sectionLeaderRole"
						: "sections.$.roles.raidLeaderRole"
				);
			}
			// sec arl
			else if (r.emoji.name === "🏴") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Section Almost Leader Roles",
					section,
					guild.roles.cache.get(section.roles.almostLeaderRole),
					section.isMain
						? "roles.mainSectionLeaderRole.sectionAlmostLeaderRole"
						: "sections.$.roles.almostLeaderRole"
				);
			}
			// sec trl
			else if (r.emoji.name === "🚩") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Section Trial Leader Roles",
					section,
					guild.roles.cache.get(section.roles.trialLeaderRole),
					section.isMain
						? "roles.mainSectionLeaderRole.sectionTrialLeaderRole"
						: "sections.$.roles.trialLeaderRole"
				);
			}
			// officer
			else if (r.emoji.name === "👮") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Officer Role",
					section,
					guild.roles.cache.get(guildData.roles.officer),
					"roles.officer"
				);
			}
			// verifier
			else if (r.emoji.name === "🔎") {
				await this.resetBotEmbed(botSentMsg).catch(() => { });
				res = await this.updateRoleCommand(
					msg,
					"Verifier Role",
					section,
					guild.roles.cache.get(guildData.roles.verifier),
					"roles.verifier"
				);
			}
			// configuration wizard
			else if (r.emoji.name === "💾") {
				res = await this.startWizard(msg, section, botSentMsg, this._roleQs, "ROLE");
			}
			else {
				return; // because of strict typing
			}

			if (res === "TIME") {
				// cancel ENTIRE process
				// stop EVERYTHING
				await botSentMsg.delete().catch(() => { });
				return;
			}

			if (res === "CANCEL") {
				this.sectionRoleMenuCommand(msg, guildData, section, botSentMsg, false, roleInfo);
				return;
			}

			if (section.isMain) {
				section = GuildUtil.getDefaultSection(res);
			}
			else {
				// name should be constant
				section = res.sections.find(x => x.nameOfSection === section.nameOfSection) as ISection;
			}

			this.sectionRoleMenuCommand(msg, res, section, botSentMsg, false, this.getStringRepOfGuildDoc(msg, section, res).roleSB.toString());
		});
	}

	private async updateArrayRoleCommand(
		msg: Message,
		roleName: string,
		guildData: IRaidGuild,
		mongoPath: string,
		currRoles: string[]
	): Promise<IRaidGuild | "CANCEL" | "TIME"> {
		const guild: Guild = msg.guild as Guild;
		guildData = await this.removeDeadElements(guildData, currRoles, mongoPath, guild);

		const roles: (Role | undefined)[] = currRoles.map(x => guild.roles.cache.get(x));

		const resolvedRole: Role[] = [];
		for (const role of roles) {
			if (typeof role !== "undefined") {
				resolvedRole.push(role);
			}
		}

		const embed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", { authorType: "GUILD" })
			.setTitle(`Changing **${roleName}**`)
			.setDescription(`Current Roles Inputted: ${resolvedRole.length === 0 ? "None" : resolvedRole}.\n Please mention, or type the ID of, the role now. If you select a role that is listed above, the role will be removed; otherwise, it will be added.`);

		const targetRole: Role | "CANCEL" | "TIME" = await (new GenericMessageCollector<Role>(msg, {
			embed: embed
		}, 3, TimeUnit.MINUTE)).send(GenericMessageCollector.getRolePrompt(msg, msg.channel));

		if (targetRole === "CANCEL") {
			return "CANCEL";
		}

		if (targetRole === "TIME") {
			return "TIME";
		}

		if (resolvedRole.some(x => x.id === targetRole.id)) {
			return (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
				$pull: {
					[mongoPath]: targetRole.id
				}
			}, { returnOriginal: false })).value as IRaidGuild;
		}
		else {
			return (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
				$push: {
					[mongoPath]: targetRole.id
				}
			}, { returnOriginal: false })).value as IRaidGuild;
		}
	}

	/**
	 * Menu for section verification configuration.
	 * @param {Message} msg The message object. 
	 * @param {IRaidGuild} guildData The guild data. 
	 * @param {ISection} section The section. 
	 * @param {Message} botSentMsg The message that the bot sent (if we want to edit the old bot message). 
	 * @param {boolean} isSameBotMessage Whether the function was called from itself (true) or from an external function.
	 * @param {string} verifInfo The role information string.
	 */
	private async sectionVerificationMenuCommand(
		msg: Message,
		guildData: IRaidGuild,
		section: ISection,
		botSentMsg: Message,
		isSameBotMessage: boolean,
		verifInfo: string
	): Promise<void> {
		if (!isSameBotMessage) {
			await botSentMsg.reactions.removeAll().catch(() => { });
		}
		const guild: Guild = msg.guild as Guild;
		const reactions: EmojiResolvable[] = [];
		const verificationChannel: GuildChannel | undefined = guild.channels.cache.get(section.channels.verificationChannel);

		const embed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", { authorType: "GUILD", includeTimestamp: true })
			.setTitle(`**Modifying Section Verification**: ${section.nameOfSection} ${section.isMain ? "(Main)" : ""}`)
			.setDescription(verifInfo)
			.setTimestamp()
			.setFooter(guild.name)
			.setColor("RANDOM");

		embed
			.addField("Go Back", "React with ⬅️ to go back to the Main Menu.")
			.addField("Configure Rank Requirements", "React with ⭐ to configure rank requirements.")
			.addField("Configure Fame Requirements", "React with 📛 to configure fame requirements.")
			.addField("Configure Maxed Stats Requirements", "React with ➕ to configure maxed stats requirements.")
			.addField(`${!section.properties.showVerificationRequirements ? "Show" : "Hide"} Verification Requirements`, `React with 🛡️ to ${!section.properties.showVerificationRequirements ? "show" : "hide"} the verification requirements. This will affect both the verification requirement embed *and* the direct message verification.`);

		reactions.push("⬅️", "⭐", "📛", "➕", "🛡️");

		if (typeof verificationChannel !== "undefined") {
			embed.addField("Send Verification Embed", "React with 📧 to send the embed containing verification instructions out.");
			reactions.push("📧");
		}

		try {
			botSentMsg = await botSentMsg.edit(embed);
		}
		catch (e) { // probably got deleted.
			botSentMsg = await msg.channel.send(botSentMsg);
		}

		if (!isSameBotMessage) {
			for await (const reaction of reactions) {
				await botSentMsg.react(reaction).catch(() => { });
			}
		}

		const reactCollector: ReactionCollector = botSentMsg.createReactionCollector(this.reactionCollectionFilter(reactions, msg), {
			time: 900000,
			max: 1
		});

		reactCollector.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
			//console.log(reason);
		});

		reactCollector.on("collect", async (r: MessageReaction) => {
			await r.remove().catch(() => { });
			reactCollector.stop(); // TODO acknowledge for reason TIME

			let res: IRaidGuild | "CANCEL" | "TIME";
			// go back
			if (r.emoji.name === "⬅️") {
				this.modifyMainMenu(msg, guildData, section, botSentMsg);
				return;
			}
			// rank req
			else if (r.emoji.name === "⭐") {
				res = await this.verifAlterCommand(
					msg,
					guildData,
					section,
					botSentMsg,
					"RANK",
					["verification.stars.required", "verification.stars.minimum"],
					["sections.$.verification.stars.required", "sections.$.verification.stars.minimum"]
				);
			}
			// fame req
			else if (r.emoji.name === "📛") {
				res = await this.verifAlterCommand(
					msg,
					guildData,
					section,
					botSentMsg,
					"FAME",
					["verification.aliveFame.required", "verification.aliveFame.minimum"],
					["sections.$.verification.aliveFame.required", "sections.$.verification.aliveFame.minimum"]
				);
			}
			// maxed stats req
			else if (r.emoji.name === "➕") {
				res = await this.verifAlterCommand(
					msg,
					guildData,
					section,
					botSentMsg,
					"STATS",
					["verification.maxedStats.required", "verification.maxedStats.statsReq"],
					["sections.$.verification.maxedStats.required", "sections.$.verification.maxedStats.statsReq"]
				);
			}
			// show/hide reqs
			else if (r.emoji.name === "🛡️") {
				const filterQuery: FilterQuery<IRaidGuild> = section.isMain
					? { guildID: guild.id }
					: { guildID: guild.id, "sections.verifiedRole": section.verifiedRole };
				const updateQuery: UpdateQuery<IRaidGuild> = section.isMain
					? { $set: { "properties.showVerificationRequirements": !section.properties.showVerificationRequirements } }
					: { $set: { "sections.$.properties.showVerificationRequirements": !section.properties.showVerificationRequirements } };
				res = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate(filterQuery, updateQuery, {
					returnOriginal: false
				})).value as IRaidGuild;
			}
			// send embed
			else if (r.emoji.name === "📧") {
				let reqs: StringBuilder = new StringBuilder()
					.append("• Public Profile.")
					.appendLine()
					.append("• Private \"Last Seen\" Location.")
					.appendLine();

				if (section.isMain) {
					reqs.append("• Public Name History.")
						.appendLine();
				}

				if (section.properties.showVerificationRequirements) {
					if (section.verification.aliveFame.required) {
						reqs.append(`• ${section.verification.aliveFame.minimum} Alive Fame.`)
							.appendLine();
					}

					if (section.verification.stars.required) {
						reqs.append(`• ${section.verification.stars.minimum} Stars.`)
							.appendLine();
					}

					if (section.verification.maxedStats.required) {
						for (let i = 0; i < section.verification.maxedStats.statsReq.length; i++) {
							if (section.verification.maxedStats.statsReq[i] !== 0) {
								reqs.append(`• ${section.verification.maxedStats.statsReq[i]} ${i}/8 Character(s).`)
									.appendLine();
							}
						}
					}
				}

				const verifEmbed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", { authorType: "GUILD" })
					.setTitle(`**${section.isMain ? "Server" : "Section"} Verification Channel**`)
					.setDescription(`Welcome to ${section.isMain ? `**\`${guild.name}\`**` : `the **\`${section.nameOfSection}\`** section`}! In order to join in on our raids, you will have to first verify your identity. The requirements for this server are listed below. ${StringUtil.applyCodeBlocks(reqs.toString())}\nIf you meet these requirements, then please react to the ✅ to get started. ${!section.isMain ? "To unverify from the section, simply react with ❌." : ""}`)
					.setFooter(section.isMain ? "Server Verification" : "Section Verification")
					.setColor("RANDOM");
				const z: Message = await (verificationChannel as TextChannel).send(verifEmbed);
				await z.react("✅").catch(() => { });
				if (!section.isMain) {
					await z.react("❌").catch(() => { });
				}
				await z.pin().catch(() => { });
				this.modifyMainMenu(msg, guildData, section, botSentMsg);
				return;
			}
			else {
				return; // because of strict typing
			}

			if (res === "TIME") {
				// cancel ENTIRE process
				// stop EVERYTHING
				await botSentMsg.delete().catch(() => { });
				return;
			}

			if (res === "CANCEL") {
				this.sectionVerificationMenuCommand(msg, guildData, section, botSentMsg, false, verifInfo);
				return;
			}

			if (section.isMain) {
				section = GuildUtil.getDefaultSection(res);
			}
			else {
				// this part only handles channel modifications, not role modifications
				// so we know that the role should be constant 
				section = res.sections.find(x => x.verifiedRole === section.verifiedRole) as ISection;
			}

			this.sectionVerificationMenuCommand(msg, res, section, botSentMsg, false, this.getStringRepOfGuildDoc(msg, section, res).verifSB.toString());
		});
	}




	// ================================================ //
	//													//
	// INDIVIDUAL COMMANDS FOR CHANGING DB PROPERTIES	//
	//													//
	// ================================================ //

	/**
	 * Verification commands. 
	 * @param {Message} msg The message object. 
	 * @param {IRaidGuild} guildData The guild doc. 
	 * @param {ISection} section The section. 
	 * @param {Message} botMsg The bot message.
	 * @param {"FAME" | "RANK" | "STATS"} verifType The verification type. 
	 * @param {string[]} mainMongoPath The mongo paths for main. Index 0 => required, index 1 => data 
	 * @param {string[]} sectMongoPath The mongo paths for section. 
	 */
	private async verifAlterCommand(
		msg: Message,
		guildData: IRaidGuild,
		section: ISection,
		botMsg: Message,
		verifType: "FAME" | "RANK" | "STATS",
		mainMongoPath: string[],
		sectMongoPath: string[]
	): Promise<IRaidGuild | "CANCEL" | "TIME"> {
		return new Promise(async (resolve) => {
			const guild: Guild = msg.guild as Guild;
			await botMsg.reactions.removeAll().catch(() => { });
			const polishedVerifType: string = verifType === "FAME"
				? "Fame"
				: verifType === "RANK"
					? "Rank"
					: "Maxed Stats";
			const currentStatus: boolean = verifType === "FAME"
				? section.verification.aliveFame.required
				: verifType === "RANK"
					? section.verification.stars.required
					: section.verification.maxedStats.required;
			const filterQuery: FilterQuery<IRaidGuild> = section.isMain
				? { guildID: guild.id }
				: { guildID: guild.id, "sections.verifiedRole": section.verifiedRole };
			const updateQueryOnOff: UpdateQuery<IRaidGuild> = section.isMain
				? { $set: { [mainMongoPath[0]]: !currentStatus } }
				: { $set: { [sectMongoPath[0]]: !currentStatus } };

			const embed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", { authorType: "GUILD", includeTimestamp: true })
				.setTitle(`**Modifying Section Verification**: ${section.nameOfSection} ⇒ ${polishedVerifType}`)
				.setDescription(`React with ⬅️ to go back to the previous menu.\nReact with 🔔 to ${currentStatus ? "disable" : "enable"} this verification requirement.\nReact with 🛠 to change the minimum amount for this verification requirement.`)
				.setFooter(guild.name)
				.setTimestamp()
				.setColor("RANDOM");

			botMsg = await botMsg.edit(embed);
			const reactions: EmojiResolvable[] = ["⬅️", "🔔", "🛠"];

			for await (const reaction of reactions) {
				await botMsg.react(reaction).catch(() => { });
			}

			const reactCollector: ReactionCollector = botMsg.createReactionCollector(this.reactionCollectionFilter(reactions, msg), {
				time: 900000,
				max: 1
			});

			reactCollector.on("end", async (collected: Collection<string, MessageReaction>, reason: string) => {
				//console.log(reason);
			});

			reactCollector.on("collect", async (r: MessageReaction) => {
				await r.remove().catch(() => { });
				reactCollector.stop(); // TODO acknowledge for reason TIME

				if (r.emoji.name === "⬅️") {
					await this.resetBotEmbed(botMsg).catch(() => { });
					this.sectionVerificationMenuCommand(msg, guildData, section, botMsg, false, this.getStringRepOfGuildDoc(msg, section, guildData).verifSB.toString());
					return;
				}
				else if (r.emoji.name === "🔔") {
					await this.resetBotEmbed(botMsg).catch(() => { });
					guildData = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate(filterQuery, updateQueryOnOff, {
						returnOriginal: false
					})).value as IRaidGuild;

					if (section.isMain) {
						section = GuildUtil.getDefaultSection(guildData);
					}
					else {
						// this part only handles channel modifications, not role modifications
						// so we know that the role should be constant 
						section = guildData.sections.find(x => x.verifiedRole === section.verifiedRole) as ISection;
					}

					this.sectionVerificationMenuCommand(msg, guildData, section, botMsg, false, this.getStringRepOfGuildDoc(msg, section, guildData).verifSB.toString());
					return;
				}
				else if (r.emoji.name === "🛠") {
					await this.resetBotEmbed(botMsg).catch(() => { });
					let promptEmbed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null);
					if (verifType === "FAME") {
						const gm0: GenericMessageCollector<number> = new GenericMessageCollector<number>(msg, {
							embed: promptEmbed.setTitle("**Edit Minimum Fame**").setDescription("Type the minimum amount of fame a person needs to meet the requirements.")
						}, 2, TimeUnit.MINUTE);

						const n: number | "TIME" | "CANCEL" = await gm0.send(GenericMessageCollector.getNumber(msg.channel, 0));
						if (n === "TIME") {
							return resolve("TIME");
						}

						if (n === "CANCEL") {
							return resolve("CANCEL");
						}

						guildData = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate(filterQuery, {
							$set: {
								[section.isMain ? mainMongoPath[1] : sectMongoPath[1]]: n
							}
						}, { returnOriginal: false })).value as IRaidGuild;
					}
					else if (verifType === "RANK") {
						const gm0: GenericMessageCollector<number> = new GenericMessageCollector<number>(msg, {
							embed: promptEmbed.setTitle("**Edit Minimum Rank**").setDescription("Type the minimum rank a person needs to meet the requirements.")
						}, 2, TimeUnit.MINUTE);

						const n: number | "TIME" | "CANCEL" = await gm0.send(GenericMessageCollector.getNumber(msg.channel, 0, 75));
						if (n === "TIME") {
							return resolve("TIME");
						}

						if (n === "CANCEL") {
							return resolve("CANCEL");
						}

						guildData = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate(filterQuery, {
							$set: {
								[section.isMain ? mainMongoPath[1] : sectMongoPath[1]]: n
							}
						}, { returnOriginal: false })).value as IRaidGuild;
					}
					else {
						const gmc2: GenericMessageCollector<number> = new GenericMessageCollector<number>(msg, {
							embed: promptEmbed.setTitle("**Edit Required Character Stats**").setDescription("Please type the stats type that you want to modify. For example, to modify the amount of `7/8`s needed to verify, type `7`.")
						}, 2, TimeUnit.MINUTE);
						const n: number | "TIME" | "CANCEL" = await gmc2.send(GenericMessageCollector.getNumber(msg.channel, 0, 8));
						if (n === "TIME") {
							return resolve("TIME");
						}

						if (n === "CANCEL") {
							return resolve("CANCEL");
						}

						promptEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null);
						const gmc3: GenericMessageCollector<number> = new GenericMessageCollector<number>(msg, {
							embed: promptEmbed.setTitle("**Edit Required Character Stats**").setDescription(`You are currently modifying the required amount of ${n}/8 needed. Please type the amount of ${n}/8 characters needed.`)
						}, 2, TimeUnit.MINUTE);

						const m: number | "TIME" | "CANCEL" = await gmc3.send(GenericMessageCollector.getNumber(msg.channel, 0, 15));
						if (m === "TIME") {
							return resolve("TIME");
						}

						if (m === "CANCEL") {
							return resolve("CANCEL");
						}

						guildData = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate(filterQuery, {
							$set: {
								[`${section.isMain ? mainMongoPath[1] : sectMongoPath[1]}.${n}`]: m
							}
						}, { returnOriginal: false })).value as IRaidGuild;
					}

					if (section.isMain) {
						section = GuildUtil.getDefaultSection(guildData);
					}
					else {
						// this part only handles channel modifications, not role modifications
						// so we know that the role should be constant 
						section = guildData.sections.find(x => x.verifiedRole === section.verifiedRole) as ISection;
					}

					this.sectionVerificationMenuCommand(msg, guildData, section, botMsg, false, this.getStringRepOfGuildDoc(msg, section, guildData).verifSB.toString());
					return;
				}
			});
		});
	}


	/**
	 * Change the name of a section.
	 * @param {Message} msg The message object. 
	 * @param {IRaidGuild} guildData The guild data. 
	 * @param {ISection} section The section. 
	 * @param {Message} botSentMsg The message that the bot sent (if we want to edit the old bot message). 
	 */
	private async changeNameOfSectionCommand(
		msg: Message,
		guildData: IRaidGuild,
		section: ISection,
		botSentMsg: Message
	): Promise<IRaidGuild> {
		const promptEmbed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null);
		const guild: Guild = msg.guild as Guild;
		await this.resetBotEmbed(botSentMsg).catch(() => { });

		//#region name of section
		promptEmbed.setTitle("**Change Name of Section**")
			.setDescription(`The current name of the section is ${section.nameOfSection}. Type the name of the new section, or type \`cancel\` to cancel the process.`);
		const nameColl: GenericMessageCollector<string> = new GenericMessageCollector<string>(
			msg,
			{ embed: promptEmbed },
			5,
			TimeUnit.MINUTE
		);

		const result: string | "CANCEL" | "TIME" = await nameColl.send(GenericMessageCollector.getStringPrompt(msg.channel));
		if (result === "CANCEL") {
			return guildData;
		}

		if (result === "TIME") {
			return guildData;
		}

		guildData = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id, "sections.verifiedRole": section.verifiedRole }, {
			$set: {
				"sections.$.nameOfSection": result
			}
		}, { returnOriginal: false })).value as IRaidGuild;

		return guildData;
		//#endregion
	}

	/**
	 * Menu for section channel configuration.
	 * @param {Message} msg The message object. 
	 * @param {ISection} section The section. 
	 * @param {Message} botSentMsg The message that the bot sent (if we want to edit the old bot message). 
	 */
	private async startWizard(
		msg: Message,
		section: ISection,
		botSentMsg: Message,
		typeQs: QType[],
		wizType: "ROLE" | "CHANNEL"
	): Promise<"CANCEL" | "TIME" | IRaidGuild> {
		await this.resetBotEmbed(botSentMsg).catch(() => { });

		const guild: Guild = msg.guild as Guild;
		const QsToAsk: QType[] = section.isMain
			? typeQs
			: typeQs.filter(x => !x.m);

		let query: FilterQuery<IRaidGuild> = section.isMain
			? { guildID: guild.id }
			: { guildID: guild.id, "sections.verifiedRole": section.verifiedRole }

		let updateQuery: UpdateQuery<IRaidGuild> = {};
		let update$set: { [key: string]: string } = {};
		//updateQuery.$set;

		for await (const chanQ of QsToAsk) {
			const qEmbed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", { authorType: "GUILD", includeTimestamp: true })
				.setTitle(chanQ.q)
				.setDescription(`${chanQ.d}\n\nTo skip this selection, simply type \`skip\`.\nTo reset this value to the default (nothing), type \`-\`.`)
				.setFooter(`Name: ${section.nameOfSection} • Main: ${section.isMain ? "Yes" : "No"}`);

			let resp: (TextChannel | Role) | "-" | "CANCEL" | "TIME" | "SKIP";
			if (wizType === "CHANNEL") {
				resp = await (new GenericMessageCollector<TextChannel | "SKIP" | "-">(msg, { embed: qEmbed }, 2, TimeUnit.MINUTE)).send(this.getChannelPrompt(msg));
			}
			else {
				resp = await (new GenericMessageCollector<Role | "SKIP" | "-">(msg, { embed: qEmbed }, 2, TimeUnit.MINUTE)).send(this.getRolePrompt(msg));
			}

			if (resp === "CANCEL" || resp === "TIME") {
				return "CANCEL";
			}

			if (resp === "SKIP") {
				continue;
			}

			if (resp === "-") {
				update$set[section.isMain ? chanQ.mainMongo : chanQ.sectMongo] = "";
			}
			else {
				update$set[section.isMain ? chanQ.mainMongo : chanQ.sectMongo] = resp.id;
			}
		}

		if (Object.keys(update$set).length === 0) {
			return await new MongoDbHelper.MongoDbGuildManager(guild.id).findOrCreateGuildDb();
		}

		updateQuery.$set = update$set;

		return (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate(query, updateQuery, { returnOriginal: false })).value as IRaidGuild;
	}

	/**
	 * Updates a channel in a section.
	 * @param {Message} msg The message object. 
	 * @param {string} channelName The name of the channel. 
	 * @param {ISection} section The section.
	 * @param {GuildChannel | undefined} currentChannel The current channel itself. 
	 * @param {string} mongoPath The mongo path. Should lead to the property associated with the channel. 
	 */
	private async updateChannelCommand(
		msg: Message,
		channelName: string,
		section: ISection,
		currentChannel: GuildChannel | undefined,
		mongoPath: string
	): Promise<IRaidGuild | "TIME" | "CANCEL"> {
		const guild: Guild = msg.guild as Guild;
		const embed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", { authorType: "GUILD" })
			.setTitle(`Changing **${channelName}**`)
			.setDescription(`Current ${channelName}: ${typeof currentChannel === "undefined" ? "Not Set" : currentChannel}.\n Please mention, or type the ID of, the channel now.`);

		const chan: TextChannel | "CANCEL" | "TIME" | "-" = await (new GenericMessageCollector<TextChannel | "-">(msg, {
			embed: embed
		}, 3, TimeUnit.MINUTE)).send(GenericMessageCollector.getChannelPrompt(msg, msg.channel));

		if (chan === "CANCEL") {
			return "CANCEL";
		}

		if (chan === "TIME") {
			return "TIME";
		}

		let query: FilterQuery<IRaidGuild> = section.isMain
			? { guildID: guild.id }
			: { guildID: guild.id, "sections.verifiedRole": section.verifiedRole };

		return (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate(query, {
			$set: {
				[mongoPath]: chan === "-" ? "" : chan.id
			}
		}, { returnOriginal: false })).value as IRaidGuild;
	}

	/**
	 * Updates a role in a section.
	 * @param {Message} msg The message object. 
	 * @param {string} roleName The name of the role. 
	 * @param {ISection} section The section.
	 * @param {Role | undefined} role The current role itself. 
	 * @param {string} mongoPath The mongo path. Should lead to the property associated with the role. 
	 */
	private async updateRoleCommand(
		msg: Message,
		roleName: string,
		section: ISection,
		currentRole: Role | undefined,
		mongoPath: string
	): Promise<IRaidGuild | "TIME" | "CANCEL"> {
		const guild: Guild = msg.guild as Guild;
		const embed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", { authorType: "GUILD" })
			.setTitle(`Changing **${roleName}**`)
			.setDescription(`Current ${roleName}: ${typeof currentRole === "undefined" ? "Not Set" : currentRole}.\n Please mention, or type the ID of, the role now.`);

		const getRole: Role | "CANCEL" | "TIME" | "-" = await (new GenericMessageCollector<Role | "-">(msg, {
			embed: embed
		}, 3, TimeUnit.MINUTE)).send(GenericMessageCollector.getRolePrompt(msg, msg.channel));

		if (getRole === "CANCEL") {
			return "CANCEL";
		}

		if (getRole === "TIME") {
			return "TIME";
		}

		let query: FilterQuery<IRaidGuild> = section.isMain
			? { guildID: guild.id }
			: { guildID: guild.id, "sections.verifiedRole": section.verifiedRole };

		return (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate(query, {
			$set: {
				[mongoPath]: getRole === "-" ? "" : getRole.id
			}
		}, { returnOriginal: false })).value as IRaidGuild;
	}

	/**
	 * Determines whether a section should be removed or modified through a user's choice. 
	 * @param {Message} msg The message object. 
	 * @param {IRaidGuild} guildData The guild doc. 
	 * @param {"REMOVE" | "MODIFY"} actionType The type of action. 
	 */
	private async getSection(
		msg: Message,
		guildData: IRaidGuild,
		actionType: "REMOVE" | "MODIFY"
	): Promise<ISection | "CANCEL" | "TIME"> {
		const guild: Guild = (msg.guild as Guild);
		let desc: string = "", action: string = "";
		if (actionType === "REMOVE") {
			desc = "Please select the number corresponding to the section you want to remove. To cancel this process, type `cancel`.";
			action = "Removal";
		}
		else if (actionType === "MODIFY") {
			desc = "Please select the number corresponding to the section you want to modify.";
			action = "Modify";
		}

		const removeEmbed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null)
			.setTitle(`**Section Configuration**: ${action}.`)
			.setDescription(desc);
		let configuredSections: ISection[] = [];
		if (actionType === "MODIFY") {
			configuredSections.push(GuildUtil.getDefaultSection(guildData));
		}

		configuredSections.push(...guildData.sections);
		for (let i = 0; i < configuredSections.length; i++) {
			const afkCheckChannel: GuildChannel | undefined = guild.channels.cache.get(configuredSections[i].channels.afkCheckChannel);
			const verificationChannel: GuildChannel | undefined = guild.channels.cache.get(configuredSections[i].channels.verificationChannel);
			const verifiedRole: Role | undefined = guild.roles.cache.get(configuredSections[i].verifiedRole);

			removeEmbed.addField(`[${i + 1}] Section: ${configuredSections[i].nameOfSection}`, `Verified Role: ${typeof verifiedRole !== "undefined" ? verifiedRole : "Not Set."}
AFK Check Channel: ${typeof afkCheckChannel !== "undefined" ? afkCheckChannel : "Not Set."}
Verification Channel: ${typeof verificationChannel !== "undefined" ? verificationChannel : "Not Set"}`);
			//}
		}

		const coll: GenericMessageCollector<ISection> = new GenericMessageCollector<ISection>(msg, { embed: removeEmbed }, 2, TimeUnit.MINUTE);
		const resp: ISection | "CANCEL" | "TIME" = await coll.send(async (collectedMessage: Message): Promise<ISection | void> => {
			const num: number = Number.parseInt(collectedMessage.content);
			if (Number.isNaN(num)) {
				MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_NUMBER_INPUT", null), msg.channel as TextChannel);
				return;
			}
			if (typeof configuredSections[num - 1] === "undefined") {
				MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_INDEX", null), msg.channel as TextChannel);
				return;
			}
			return configuredSections[num - 1];
		});
		return resp;
	}

	/**
	 * Configures the dungeons that can be run in a section.
	 * @param {Message} msg The message object. 
	 * @param {ISection} section The section. 
	 * @param {IRaidGuild} guildDb The guild db. 
	 */
	private async configDungeonCommand(
		msg: Message,
		section: ISection,
		guildDb: IRaidGuild
	): Promise<IRaidGuild> {
		const guild: Guild = msg.guild as Guild;
		return new Promise(async (resolve) => {
			const d: DungeonSelectionType[] = [];
			for (const dData of AFKDungeon) {
				d.push({ data: dData, isIncluded: section.properties.dungeons.includes(dData.id) });
			}

			const editorMessage: Message | void = await msg.channel.send(this.getAllowedDungeonEditorEmbed(msg, d, section)).catch(() => { });
			if (typeof editorMessage === "undefined") {
				return guildDb;
			}

			const collector: MessageCollector = new MessageCollector(msg.channel as TextChannel, ((m: Message) => m.author.id === msg.author.id));

			collector.on("end", async (collected: Collection<string, Message>, reason: string) => {
				await editorMessage.delete().catch(() => { });
				if (reason === "SAVE") {
					const filterQuery: FilterQuery<IRaidGuild> = section.isMain
						? { guildID: guild.id }
						: { guildID: guild.id, "sections.verifiedRole": section.verifiedRole };
					const updateQuery: UpdateQuery<IRaidGuild> = section.isMain
						? { $set: { "properties.dungeons": d.filter(x => x.isIncluded).map(x => x.data.id) } }
						: { $set: { "sections.$.properties.dungeons": d.filter(x => x.isIncluded).map(x => x.data.id) } };

					guildDb = (await MongoDbHelper
						.MongoDbGuildManager
						.MongoGuildClient
						.findOneAndUpdate(filterQuery, updateQuery, { returnOriginal: false })).value as IRaidGuild;

					return resolve(guildDb);
				}
				else {
					return resolve(guildDb);
				}
			});

			collector.on("collect", async (m: Message) => {
				await m.delete().catch(() => { });

				if (m.content === "cancel") {
					collector.stop("PROCESS_CANCELED");
					return;
				}

				if (m.content === "save") {
					collector.stop("SAVE");
					return;
				}

				if (m.content === "disableAll") {
					for (let i = 0; i < d.length; i++) {
						d[i].isIncluded = false;
					}
					await editorMessage.edit(this.getAllowedDungeonEditorEmbed(msg, d, section));
					return;
				}

				if (m.content === "enableAll") {
					for (let i = 0; i < d.length; i++) {
						d[i].isIncluded = true;
					}
					await editorMessage.edit(this.getAllowedDungeonEditorEmbed(msg, d, section));
					return;
				}

				const nums: number[] = NumberUtil.parseNumbersFromString(m.content);
				for (const num of nums) {
					if (num - 1 < 0 || num - 1 >= d.length) {
						return; // out of index
					}
	
					d[num - 1].isIncluded = !d[num - 1].isIncluded;
				}
				await editorMessage.edit(this.getAllowedDungeonEditorEmbed(msg, d, section));
			});
		});
	}

	/**
	 * Generates an embed showing all the dungeons that have been selected from a list.
	 * @param {Message} msg The message object. 
	 * @param {DungeonSelectionType[]} d The current dungeons that are selected.
	 */
	private getAllowedDungeonEditorEmbed(
		msg: Message,
		d: DungeonSelectionType[],
		section: ISection
	): MessageEmbed {
		const allowedDungeonEmbed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", { authorType: "GUILD" })
			.setTitle(`Section Dungeon Editor: **${section.nameOfSection}**`)
			.setDescription("Please type a number (e.g. `4`, `19`) or a range of numbers (e.g. `1-4`, `18-22, 24, 26`) corresponding to the dungeon(s) you want to allow in this section.\n\nA ☑️ next to the dungeon name means raid leaders will be able to use the dungeon in headcounts and AFK checks.\nA ❌ means the dungeon will not be part of the section.\n\nTo unselect all, type `disableAll`. To select all, type `enableAll`. To save, type `save`. To cancel, type `cancel`.")
			.setColor("RANDOM")
			.setFooter((msg.guild as Guild).name);
		let i: number = 0;
		let k: number = 0;
		let l: number = 0;
		while (d.length > 0) {
			i++;
			let str: string = "";
			for (let j = 0; j < d.slice(0, 10).length; j++) {
				k = j + l;
				str += `\`[${k + 1}]\` ${d[j].isIncluded ? "☑️" : "❌"} ${Zero.RaidClient.emojis.cache.get(d[j].data.portalEmojiID)} ${d[j].data.dungeonName}\n`;
			}
			l += 10;
			allowedDungeonEmbed.addFields({
				name: `Dungeon Selection: Part ${i}`,
				value: str,
				inline: true
			});
			d = d.slice(10);
			str = "";
		}

		return allowedDungeonEmbed;
	}



	// ================================================ //
	//													//
	// OTHER MINOR INTERNAL METHODS					 	//
	//													//
	// ================================================ //


	/**
	 * Returns three StringBuilders -- channel, role, and verification requirements. 
	 * @param {Message} msg The message object. 
	 * @param {ISection} section The section. 
	 * @param {IRaidGuild} guildData The guild doc. 
	 */
	private getStringRepOfGuildDoc(msg: Message, section: ISection, guildData: IRaidGuild): SBGetterType {
		const guild: Guild = msg.guild as Guild;
		// general channels for section
		const afkCheckChannel: GuildChannel | undefined = guild.channels.cache.get(section.channels.afkCheckChannel);
		const controlPanelChannel: GuildChannel | undefined = guild.channels.cache.get(section.channels.controlPanelChannel);
		const verificationChannel: GuildChannel | undefined = guild.channels.cache.get(section.channels.verificationChannel);
		const manualVerificationChannel: GuildChannel | undefined = guild.channels.cache.get(section.channels.manualVerification);

		// logging channels for section
		const verificationAttemptsChan: GuildChannel | undefined = guild.channels.cache.get(section.channels.logging.verificationAttemptsChannel);
		const verificationSuccessChan: GuildChannel | undefined = guild.channels.cache.get(section.channels.logging.verificationSuccessChannel);
		const reactionLoggingChannel: GuildChannel | undefined = guild.channels.cache.get(section.channels.logging.reactionLoggingChannel);

		// general channels for guild
		const moderationLoggingChannel: GuildChannel | undefined = guild.channels.cache.get(guildData.generalChannels.logging.moderationLogs);
		const suspensionLoggingChannel: GuildChannel | undefined = guild.channels.cache.get(guildData.generalChannels.logging.suspensionLogs);
		const joinLeaveLoggingChannel: GuildChannel | undefined = guild.channels.cache.get(guildData.generalChannels.logging.joinLeaveChannel);
		const botUpdatesChannel: GuildChannel | undefined = guild.channels.cache.get(guildData.generalChannels.logging.botUpdatesChannel);
		const modMailChannel: GuildChannel | undefined = guild.channels.cache.get(guildData.generalChannels.modMailChannel);
		const raidRequestsChannel: GuildChannel | undefined = guild.channels.cache.get(guildData.generalChannels.raidRequestChannel);

		// roles for section (only 1)
		const verifiedRole: Role | undefined = guild.roles.cache.get(section.verifiedRole);
		const secRaidLeaderRole: Role | undefined = guild.roles.cache.get(section.roles.raidLeaderRole);
		const secAlmostRaidLeaderRole: Role | undefined = guild.roles.cache.get(section.roles.almostLeaderRole);
		const secTrialLeaderRole: Role | undefined = guild.roles.cache.get(section.roles.trialLeaderRole);

		// roles for the guild
		const teamRole: Role | undefined = guild.roles.cache.get(guildData.roles.teamRole);
		const moderatorRole: Role | undefined = guild.roles.cache.get(guildData.roles.moderator);
		const headLeaderRole: Role | undefined = guild.roles.cache.get(guildData.roles.headRaidLeader);
		const officerRole: Role | undefined = guild.roles.cache.get(guildData.roles.officer);
		const leaderRole: Role | undefined = guild.roles.cache.get(guildData.roles.universalRaidLeader);
		const almostLeaderRole: Role | undefined = guild.roles.cache.get(guildData.roles.universalAlmostRaidLeader);
		const supportRole: Role | undefined = guild.roles.cache.get(guildData.roles.support);
		const verifierRole: Role | undefined = guild.roles.cache.get(guildData.roles.verifier);
		const pardonedLeaderRole: Role | undefined = guild.roles.cache.get(guildData.roles.pardonedRaidLeader);
		const suspendedRole: Role | undefined = guild.roles.cache.get(guildData.roles.suspended);
		const allTalkingRoles: (Role | undefined)[] = guildData.roles.talkingRoles.map(x => guild.roles.cache.get(x));
		const allEarlyLocRoles: (Role | undefined)[] = guildData.roles.earlyLocationRoles.map(x => guild.roles.cache.get(x));

		const talkingRoles: Role[] = [];
		for (const role of allTalkingRoles) {
			if (typeof role !== "undefined") {
				talkingRoles.push(role);
			}
		}

		const earlyReactionRoles: Role[] = [];
		for (const role of allEarlyLocRoles) {
			if (typeof role !== "undefined") {
				earlyReactionRoles.push(role);
			}
		}

		const mutedRole: Role | undefined = guild.roles.cache.get(guildData.roles.optRoles.mutedRole);
		const keyTier1: Role | undefined = guild.roles.cache.get(guildData.roles.optRoles.keyTier1.role);
		const keyTier2: Role | undefined = guild.roles.cache.get(guildData.roles.optRoles.keyTier2.role);
		const keyTier3: Role | undefined = guild.roles.cache.get(guildData.roles.optRoles.keyTier3.role);

		const starReq: string = section.verification.stars.required ? "Enabled" : "Disabled";
		const fameReq: string = section.verification.aliveFame.required ? "Enabled" : "Disabled";
		const statsReq: string = section.verification.maxedStats.required ? "Enabled" : "Disabled";


		const channelSB: StringBuilder = new StringBuilder("__Channels__")
			.appendLine()
			.append(`AFK Check Channel: ${typeof afkCheckChannel === "undefined" ? "N/A" : afkCheckChannel}`)
			.appendLine()
			.append(`Control Panel Channel: ${typeof controlPanelChannel === "undefined" ? "N/A" : controlPanelChannel}`)
			.appendLine()
			.append(`Verification Channel: ${typeof verificationChannel === "undefined" ? "N/A" : verificationChannel}`)
			.appendLine()
			.append(`Manual Verification Channel: ${typeof manualVerificationChannel === "undefined" ? "N/A" : manualVerificationChannel}`)
			.appendLine()
			.append(`Verification Attempts Channel: ${typeof verificationAttemptsChan === "undefined" ? "N/A" : verificationAttemptsChan}`)
			.appendLine()
			.append(`Verification Success Channels: ${typeof verificationSuccessChan === "undefined" ? "N/A" : verificationSuccessChan}`)
			.appendLine()
			.append(`Reaction Logging Channels: ${typeof reactionLoggingChannel === "undefined" ? "N/A" : reactionLoggingChannel}`);

		const roleSB: StringBuilder = new StringBuilder("__Role__")
			.appendLine()
			.append(`Verified Role: ${typeof verifiedRole === "undefined" ? "N/A" : verifiedRole}`)
			.appendLine()
			.append(`Section Leader Role: ${typeof secRaidLeaderRole === "undefined" ? "N/A" : secRaidLeaderRole}`)
			.appendLine()
			.append(`Section Almost Leader Role: ${typeof secAlmostRaidLeaderRole === "undefined" ? "N/A" : secAlmostRaidLeaderRole}`)
			.appendLine()
			.append(`Section Trial Leader Role: ${typeof secTrialLeaderRole === "undefined" ? "N/A" : secTrialLeaderRole}`);

		const verificationSB: StringBuilder = new StringBuilder("__Verification__")
			.appendLine()
			.append(`Show Requirements: ${section.properties.showVerificationRequirements ? "Yes" : "No"}`)
			.appendLine()
			.append(`Stars: ${section.verification.stars.minimum} (${starReq})`)
			.appendLine()
			.append(`Fame: ${section.verification.aliveFame.minimum} (${fameReq})`)
			.appendLine()
			.append(`Maxed Stats: ${statsReq}`)
			.appendLine()
			.append(`\t⇒ 0/8 Required: ${section.verification.maxedStats.statsReq[0]}`)
			.appendLine()
			.append(`\t⇒ 1/8 Required: ${section.verification.maxedStats.statsReq[1]}`)
			.appendLine()
			.append(`\t⇒ 2/8 Required: ${section.verification.maxedStats.statsReq[2]}`)
			.appendLine()
			.append(`\t⇒ 3/8 Required: ${section.verification.maxedStats.statsReq[3]}`)
			.appendLine()
			.append(`\t⇒ 4/8 Required: ${section.verification.maxedStats.statsReq[4]}`)
			.appendLine()
			.append(`\t⇒ 5/8 Required: ${section.verification.maxedStats.statsReq[5]}`)
			.appendLine()
			.append(`\t⇒ 6/8 Required: ${section.verification.maxedStats.statsReq[6]}`)
			.appendLine()
			.append(`\t⇒ 7/8 Required: ${section.verification.maxedStats.statsReq[7]}`)
			.appendLine()
			.append(`\t⇒ 8/8 Required: ${section.verification.maxedStats.statsReq[8]}`);

		if (section.isMain) {
			channelSB
				.appendLine()
				.append(`Moderation Logging Channel: ${typeof moderationLoggingChannel === "undefined" ? "N/A" : moderationLoggingChannel}`)
				.appendLine()
				.append(`Suspension Logging Channel: ${typeof suspensionLoggingChannel === "undefined" ? "N/A" : suspensionLoggingChannel}`)
				.appendLine()
				.append(`Join & Leave Channel: ${typeof joinLeaveLoggingChannel === "undefined" ? "N/A" : joinLeaveLoggingChannel}`)
				.appendLine()
				.append(`Bot Updates Channel: ${typeof botUpdatesChannel === "undefined" ? "N/A" : botUpdatesChannel}`)
				.appendLine()
				.append(`Mod Mail Channel: ${typeof modMailChannel === "undefined" ? "N/A" : modMailChannel}`)
				.appendLine()
				.append(`Raid Requests Channel: ${typeof raidRequestsChannel === "undefined" ? "N/A" : raidRequestsChannel}`)

			roleSB
				.appendLine()
				.append(`Team Role: ${typeof teamRole === "undefined" ? "N/A" : teamRole}`)
				.appendLine()
				.append(`Moderator Role: ${typeof moderatorRole === "undefined" ? "N/A" : moderatorRole}`)
				.appendLine()
				.append(`Head Leader Role: ${typeof headLeaderRole === "undefined" ? "N/A" : headLeaderRole}`)
				.appendLine()
				.append(`Officer Role: ${typeof officerRole === "undefined" ? "N/A" : officerRole}`)
				.appendLine()
				.append(`Universal Leader Role: ${typeof leaderRole === "undefined" ? "N/A" : leaderRole}`)
				.appendLine()
				.append(`Universal Almost Leader Role: ${typeof almostLeaderRole === "undefined" ? "N/A" : almostLeaderRole}`)
				.appendLine()
				.append(`Support Role: ${typeof supportRole === "undefined" ? "N/A" : supportRole}`)
				.appendLine()
				.append(`Verifier Role: ${typeof verifierRole === "undefined" ? "N/A" : verifierRole}`)
				.appendLine()
				.append(`Pardoned Leader Role: ${typeof pardonedLeaderRole === "undefined" ? "N/A" : pardonedLeaderRole}`)
				.appendLine()
				.append(`Suspended Role: ${typeof suspendedRole === "undefined" ? "N/A" : suspendedRole}`)
				.appendLine()
				.append(`Talking Roles: ${talkingRoles.length === 0 ? "None" : talkingRoles.join(", ")}`)
				.appendLine()
				.append(`Early Location Role: ${earlyReactionRoles.length === 0 ? "None" : earlyReactionRoles.join(", ")}`)
				.appendLine()
				.append(`Muted Role: ${typeof mutedRole === "undefined" ? "N/A" : mutedRole}`)
				.appendLine()
				.append(`Key Tier I Role: ${typeof keyTier1 === "undefined" ? "N/A" : keyTier1}`)
				.appendLine()
				.append(`Key Tier II Role: ${typeof keyTier2 === "undefined" ? "N/A" : keyTier2}`)
				.appendLine()
				.append(`Key Tier III Role: ${typeof keyTier3 === "undefined" ? "N/A" : keyTier3}`);
		}

		return {
			channelSB: channelSB,
			roleSB: roleSB,
			verifSB: verificationSB
		};
	}

	/**
	 * Replaces the bot's message with an empty embed and removes all reactions.
	 * @param {Message} botSentMsg The message to delete.
	 */
	private async resetBotEmbed(botSentMsg: Message): Promise<void> {
		await botSentMsg.edit(new MessageEmbed()).catch(() => { });
		await botSentMsg.reactions.removeAll().catch(() => { });
	}


	/**
	 * The reaction collector filter that can be used for all reaction collectors.
	 * @param {EmojiResolvable[]} reactions The reactions. 
	 * @param {Message} msg The message from the author.  
	 */
	private reactionCollectionFilter(reactions: EmojiResolvable[], msg: Message): ((r: MessageReaction, u: User) => boolean) {
		return (reaction: MessageReaction, user: User) => {
			return reactions.includes(reaction.emoji.name) && user.id === msg.author.id && !user.bot;
		}
	}

	/**
	 * A sample function, to be used as a parameter for the `send` method, that will wait for someone to respond with either a TextChannel mention or ID, or simply the "skip" message.
	 * @param {Message} msg The message that triggered this class. This is generally a message that results in the exeuction of the command. 
	 */
	private getChannelPrompt(msg: Message): (m: Message) => Promise<void | TextChannel | "SKIP" | "-"> {
		return async (m: Message): Promise<void | TextChannel | "SKIP" | "-"> => {
			if (m.content.toLowerCase() === "skip") {
				return "SKIP";
			}

			if (m.content === "-") {
				return "-";
			}

			const channel: GuildChannel | undefined = m.mentions.channels.first();
			let resolvedChannel: GuildChannel;
			if (typeof channel === "undefined") {
				let reCh: GuildChannel | undefined = (msg.guild as Guild).channels.cache.get(m.content) as GuildChannel | undefined;
				if (typeof reCh === "undefined") {
					await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_ID", null, "channel"), msg.channel);
					return;
				}
				resolvedChannel = reCh;
			}
			else {
				resolvedChannel = channel;
			}

			if (resolvedChannel instanceof TextChannel) {
				return resolvedChannel;
			}
			else {
				await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "DEFAULT", null).setTitle("Not a Text Channel").setDescription("Please input an ID associated with a text channel."), msg.channel);
			}
		};
	}


	/**
	 * A sample function, to be used as a parameter for the `send` method, that will wait for someone to respond with a role ID or mention, or simply the "skip" message.
	 * @param {Message} msg The message that triggered this class. This is generally a message that results in the exeuction of the command. 
	 */
	private getRolePrompt(msg: Message): (collectedMessage: Message) => Promise<void | Role | "SKIP" | "-"> {
		return async (m: Message): Promise<void | Role | "SKIP" | "-"> => {
			if (m.content.toLowerCase() === "skip") {
				return "SKIP";
			}

			if (m.content === "-") {
				return "-";
			}

			const role: Role | undefined = m.mentions.roles.first();
			let resolvedRole: Role;
			if (typeof role === "undefined") {
				let reRo: Role | undefined = (msg.guild as Guild).roles.cache.get(m.content) as Role | undefined;
				if (typeof reRo === "undefined") {
					await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_ID", null, "role"), msg.channel as TextChannel);
					return;
				}
				resolvedRole = reRo;
			}
			else {
				resolvedRole = role;
			}
			return resolvedRole;
		};
	}

	/**
	 * Removes any dead roles. Dead roles are roles that exist in the db but not in the server.
	 * @param {IRaidGuild} guildDb The document.
	 * @param {string[]} roleArray The array of roles to check. 
	 * @param {string} field The Mongo path to the array specified above. 
	 * @param {Guild} guild The guild. 
	 */
	private async removeDeadElements(
		guildDb: IRaidGuild,
		roleArray: string[],
		field: string,
		guild: Guild
	): Promise<IRaidGuild> {
		const promises: Promise<unknown>[] = roleArray.map(role => {
			return new Promise((resolve, reject) => {
				if (!guild.roles.cache.has(role)) {
					MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
						$pull: {
							[field]: role
						}
					}, (err, raw) => {
						if (err) {
							reject(err);
						}
						resolve();
					});
				} else {
					resolve();
				}
			});
		});

		await Promise.all(promises);

		return new MongoDbHelper.MongoDbGuildManager(guild.id).findOrCreateGuildDb();
	}
}