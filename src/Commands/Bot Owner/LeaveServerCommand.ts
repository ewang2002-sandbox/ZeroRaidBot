import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, Guild, TextChannel, MessageAttachment, MessageEmbed, EmbedFieldData, Emoji } from "discord.js";
import { Zero } from "../../Zero";
import { AxiosResponse } from "axios";
import { FORMERR } from "dns";
import { ArrayUtil } from "../../Utility/ArrayUtil";
import { MessageUtil } from "../../Utility/MessageUtil";
import { GenericMessageCollector } from "../../Classes/Message/GenericMessageCollector";
import { TimeUnit } from "../../Definitions/TimeUnit";

export class LeaveServerCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Force Leave Server Command",
                "forceleaveserver",
                ["fls", "leaveserver"],
                "Use this command if you want the bot to leave a particular server.",
                ["forceleaveserver"],
                ["forceleaveserver"],
                0
            ),
            new CommandPermission(
                [],
                [],
                [],
                [],
                false
            ),
            false,
            false,
            true,
            0
        );
    }

    public async executeCommand(
        msg: Message,
        args: string[]
    ): Promise<void> {
        const guilds: Guild[] = msg.client.guilds.cache
            .array();

        const fields: string[] = ArrayUtil.arrayToStringFields<Guild>(
            guilds,
            (i, elem) => `**\`[${i + 1}]\`** ${elem.name} (${elem.id})\n`
        );

        const fieldsToAdd: EmbedFieldData[] = [];
        for (const field of fields) {
            fieldsToAdd.push({
                name: "Servers",
                value: field
            });
        }

        let botMsg: Message | null = null;
        let indexToRemove: number = -1;
        let hasReactedToMessage: boolean = false;
        while (true) {
            const embed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author)
                .setTitle("Administrative: Leave Server")
                .setDescription(`Selected Server: ${indexToRemove === -1 ? "None." : `${guilds[indexToRemove].name} (${guilds[indexToRemove].id})`}\n\nI am currently in \`${guilds.length}\` servers. Please select the server that you want me to leave.\n\n⚠️ This list shows all servers that I am in, including servers that are crucial for me to work (like emoji servers). Leaving those servers will result in bot errors or degradation of performance or functionality.\n\n⇒ React with ✅ if you are sure you want to leave the server shown above. There will be no additional confirmation.\n⇒ React with ❌ to stop this process.`)
                .addFields(fieldsToAdd)
                .setFooter(`${guilds.length} Servers.`);

            botMsg = botMsg === null
                ? await msg.channel.send(embed)
                : await botMsg.edit(embed);

            const response: number | Emoji | "CANCEL_CMD" | "TIME_CMD" = await new GenericMessageCollector<number>(
                msg,
                { embed: embed },
                2,
                TimeUnit.MINUTE
            ).sendWithReactCollector(GenericMessageCollector.getNumber(msg.channel, 1), {
                reactions: ["✅", "❌"],
                cancelFlag: "-cancel",
                reactToMsg: !hasReactedToMessage,
                deleteMsg: false,
                removeAllReactionAfterReact: false,
                oldMsg: botMsg
            });

            if (hasReactedToMessage) {
                hasReactedToMessage = !hasReactedToMessage;
            }

            if (response instanceof Emoji) {
                if (response.name === "❌") {
                    await botMsg.delete().catch(e => { });
                    return;
                }
                else {
                    if (indexToRemove !== -1) {
                        await botMsg.delete().catch(e => { });
                        break;
                    }
                }
            }
            else {
                if (response === "CANCEL_CMD" || response === "TIME_CMD") {
                    await botMsg.delete().catch(e => { });
                    return;
                }

                if (0 <= (response - 1) && (response - 1) < guilds.length) {
                    indexToRemove = response - 1;
                }
            }
        }

        await botMsg.reactions.removeAll().catch(e => { });

        let isGone: boolean = true;
        const selectedGuild: Guild = guilds[indexToRemove];
        try {
            await selectedGuild.leave();
        }
        catch (e) {
            isGone = false;
        }

        const confirmEmbed: MessageEmbed = MessageUtil.generateBlankEmbed(msg.author);
        if (isGone) {
            confirmEmbed
                .setTitle(`Left Server: ${selectedGuild.name}`)
                .setDescription(`I have successfully left the server \`${selectedGuild.name}\` with ID \`${selectedGuild.id}\`.`)
                .setFooter("🟢 Left Server Successfully.");
        }
        else {
            confirmEmbed
                .setTitle(`Failed to Leave Server: ${selectedGuild.name}`)
                .setDescription(`I was unable to leave the server \`${selectedGuild.name}\` with ID \`${selectedGuild.id}\`.`)
                .setFooter("🔴 Left Server Failed.");
        }

        MessageUtil.send({ embed: confirmEmbed }, msg.channel);
    }
}