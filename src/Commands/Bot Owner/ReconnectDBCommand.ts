import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbedThumbnail, MessageEmbed } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { OtherUtil } from "../../Utility/OtherUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { DateUtil } from "../../Utility/DateUtil";

export class ReconnectDBCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Reconnect to Database",
                "reconnectdb",
                [],
                "Restarts the MongoDB connection. Run this in direct messages!",
                ["reconnectdb"],
                ["reconnectdb"],
                0
            ),
            new CommandPermission(
                [],
                [],
                [],
                [],
                false
            ),
            false, // guild-only command. 
            false,
            true,
            0
        );
    }

    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {
        try {
            await MongoDbHelper.MongoDbBase.MongoClient.close();
            const mdm: MongoDbHelper.MongoDbBase = new MongoDbHelper.MongoDbBase();
            await mdm.connect();

            await msg.author.send(StringUtil.applyCodeBlocks(`✅ [${DateUtil.getTime()}] Reestablished connection to database successfully.`)).catch(e => { });
        }
        catch (e) {
            await msg.author.send(StringUtil.applyCodeBlocks(`❌ [${DateUtil.getTime()}] An error occurred when trying to establish a connection.\n\nError: ${e}`));
        }
    }
}