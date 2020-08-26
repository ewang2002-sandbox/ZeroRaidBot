import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Guild } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MessageUtil } from "../../Utility/MessageUtil";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";

export class ConfigurePrefixCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Change Prefix Command",
                "changeprefix",
                ["setprefix"],
                "Gives you the ability to change the bot's prefix to a prefix of your desire. The new prefix, along with the default prefix, will be accepted.",
                ["changeprefix <Prefix: STRING>"],
                ["changeprefix !!", "changeprefix >"],
                1
            ),
            new CommandPermission(
                ["MANAGE_GUILD"],
                [],
                ["moderator"],
                [],
                true
            ),
            true, // guild-only command. 
            false,
            false,
            5
        );
    }

    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {
        const guild: Guild = msg.guild as Guild;
        const newPrefix: string = args[0];
        if (newPrefix.length > 2) {
            MessageUtil.send({ content: "Your prefix can only be up to two characters long." }, msg.channel);
            return;
        }
        
        await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: guild.id }, {
            $set: {
                prefix: newPrefix
            }
        });
    }
}