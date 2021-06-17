import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Collection, Guild, GuildMember, Message, TextChannel } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { ArrayUtil } from "../../Utility/ArrayUtil";
import { MessageUtil } from "../../Utility/MessageUtil";
import { BotConfiguration } from "../../Configuration/Config";

export class SpamPingCommand extends Command {
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
        const mention: GuildMember | null = msg.mentions.members === null
            ? null
            : msg.mentions.members.first() as GuildMember;
        if (mention === null || !msg.guild)
            return;

        if (BotConfiguration.botOwners.includes(mention.id)) {
            MessageUtil.send({ embed: MessageUtil.generateBlankEmbed(msg.author).setTitle("Can't Spam Ping This Person!").setDescription("You can't spam ping a defined bot owner.") }, msg.channel);
            return;
        }

        let listOfChannels: Collection<string, TextChannel> = msg.mentions.channels;
        if (listOfChannels.size === 0)
            listOfChannels = msg.guild.channels.cache.filter(x => x.isText() && x.type === "text") as Collection<string, TextChannel>;

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
    }
}