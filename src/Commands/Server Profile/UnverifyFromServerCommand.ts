import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, Guild, DMChannel, Role, GuildMember } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { GuildUtil } from "../../Utility/GuildUtil";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";
import { UserAvailabilityHelper } from "../../Helpers/UserAvailabilityHelper";

export class UnverifyFromServerCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Unverify From Server",
                "serverunverify",
                ["unverifyfromserver"],
                "Unverifies you from the server.",
                ["serverunverify"],
                ["serverunverify"],
                0
            ),
            new CommandPermission(
                [],
                [],
                ["raider"],
                [],
                true
            ),
            false, // guild-only command. 
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
        let dmChannel: DMChannel;
        try {
            dmChannel = await msg.author.createDM();
        }
        catch (e) {
            await msg.channel.send(`${msg.member}, I cannot DM you. Please make sure your privacy settings are set so anyone can send messages to you.`).catch(() => { });
            return;
        }

		UserAvailabilityHelper.InMenuCollection.set(msg.author.id, UserAvailabilityHelper.MenuType.SERVER_PROFILE);
        let guild: Guild;
        if (msg.guild === null) {
            const response: Guild | "CANCEL_CMD" | null = await GuildUtil.getGuild(msg, dmChannel);
            if (response === "CANCEL_CMD") {
				UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
                return;
            }

            if (response === null) {
                MessageUtil.send({ content: "You are unable to use this command because you are not verified in any servers that the bot is in." }, msg.channel);
				UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
                return;
            }

            guild = response;
        }
        else {
            guild = msg.guild;
        }

        const resolvedGuildDb: IRaidGuild = guildDb !== null && guildDb.guildID === guild.id
            ? guildDb
            : await new MongoDbHelper.MongoDbGuildManager(guild.id).findOrCreateGuildDb();

        const member: GuildMember | null = guild.member(msg.author);
        if (member === null) {
			UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
            return;
        }
        
        if (!member.roles.cache.has(resolvedGuildDb.roles.raider)) {
            MessageUtil.send({ content: "You are not verified in the server." }, msg.author);
			UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
            return;
        }

        const badRoles: string[] = [resolvedGuildDb.roles.optRoles.mutedRole, resolvedGuildDb.roles.suspended];
        if (member.roles.cache.some(x => badRoles.includes(x.id))) {
            MessageUtil.send({ content: "You cannot unverify at this time because you are either muted or suspended." }, msg.author);
			UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
            return;
        }

        const unverifyEmbed: MessageEmbed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setTitle(`Unverify From: **${msg.guild}**`)
            .setDescription("Are you sure you want to be unverified from the server? Respond with either `yes` or `no`. You will lose:\n- all your roles.\n- your nickname.\n- your ability to configure your server profile.\n\nYou will not lose:\n- your server stats.\n- any logged keys, vials, or runes.")
            .setFooter("Unverification Process")
            .setColor("RED");

        const wantsToBeUnverified: boolean | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<boolean>(
            msg.author,
            { embed: unverifyEmbed },
            2,
            TimeUnit.MINUTE,
            dmChannel
        ).send(GenericMessageCollector.getYesNoPrompt(dmChannel));

        if (wantsToBeUnverified === "CANCEL_CMD" || wantsToBeUnverified === "TIME_CMD") {
			UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
            return;
        }

        if (wantsToBeUnverified) {
            for await (const [id, role] of member.roles.cache) {
                await member.roles.remove(role).catch(e => { });
            }
            await member.setNickname(msg.author.username).catch(e => { });
        }
		UserAvailabilityHelper.InMenuCollection.delete(msg.author.id);
    }
}