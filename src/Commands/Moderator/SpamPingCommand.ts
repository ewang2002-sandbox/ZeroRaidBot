import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Collection, Guild, GuildMember, Message, TextChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { ArrayUtil } from "../../Utility/ArrayUtil";
import { MessageUtil } from "../../Utility/MessageUtil";
import { BotConfiguration } from "../../Configuration/Config";

export class SpamPingCommand extends Command {
    private _usedCommand: Set<string> = new Set<string>();

    public constructor() {
        super(
            new CommandDetail(
                "Spam Ping Command",
                "spamping",
                [],
                "Lets you spam ping someone.",
                ["spam <@Mention> <...Channels> <Amount: NUMBER>"],
                ["spam @Ian#1234 #test #test1 #test2 20"],
                3
            ),
            new CommandPermission(
                ["BAN_MEMBERS"],
                ["SEND_MESSAGES"],
                ["moderator", "officer", "headRaidLeader"],
                [],
                true
            ),
            true, // guild-only command. 
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
        if (this._usedCommand.has(msg.author.id)) {
            MessageUtil.send({ embed: MessageUtil.generateBlankEmbed(msg.author).setTitle("Can't Use This Command Yet!").setDescription("You have recently used this command to spam ping someone! Please wait until the bot is finished spam pinging that person before you use this command!") }, msg.channel);
            return;
        }

        if (BotConfiguration.botOwners.includes(msg.author.id)) {
            MessageUtil.send({ embed: MessageUtil.generateBlankEmbed(msg.author).setTitle("Can't Silence This Person!").setDescription("You can't silence a defined bot owner.") }, msg.channel);
            return;
        }

        this._usedCommand.add(msg.author.id);

        const mention: GuildMember | null = msg.mentions.members === null
            ? null
            : msg.mentions.members.first() as GuildMember;
        if (mention === null)
            return;

        const listOfChannels: Collection<string, TextChannel> = msg.mentions.channels;
        if (listOfChannels.size === 0)
            return;

        const channels: TextChannel[] = listOfChannels.array();
        let max: number = Number.parseInt(args[args.length - 1]);
        if (max > 200) {
            max = 200;
        }
        let pinged: number = 0;
        while (pinged < (Number.isNaN(max) ? 200 : max)) {
            ArrayUtil.getRandomElement(channels).send(mention.toString())
                .then(x => x.delete())
                .catch(e => { });

            ++pinged;
        }

        this._usedCommand.delete(msg.author.id);
    }
}