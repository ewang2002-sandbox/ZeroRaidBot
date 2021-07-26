import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Guild, Message, Role } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { ArrayUtil } from "../../Utility/ArrayUtil";
import { MessageUtil } from "../../Utility/MessageUtil";

export class ConfigureKeyPoppingRoleCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Key Popping Configure Role Command",
                "configurekeypoprole",
                ["configkeypop", "keypop", "keypoprole"],
                "Configures all key popping rewards role. If an [amount] is not specified or an invalid number is provided, this will attempt to remove the role.",
                ["configurekeypoprole <Role> [Amount: Number]", "configurekeypoprole"],
                ["configurekeypoprole @RoleToRemove", "configurekeypoprole @Key Popper 15", "configurekeypoprole"],
                0
            ),
            new CommandPermission(
                ["BAN_MEMBERS"],
                [],
                ["officer", "headRaidLeader", "moderator"],
                [],
                false
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
        if (!guildDb.roles.optRoles.keyPopperRewards) {
            guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
                $set: {
                    "roles.optRoles.keyPopperRewards": []
                }
            }, { returnOriginal: false })).value as IRaidGuild;
        }

        if (args.length === 0) {
            const roles = guildDb.roles.optRoles.keyPopperRewards
                .filter(x => guild.roles.cache.has(x.role));
            const invalidRoles = guildDb.roles.optRoles.keyPopperRewards
                .filter(x => guild.roles.cache.has(x.role));


            const embed = MessageUtil.generateBlankEmbed(guild, "RANDOM")
                .setTitle("All Key Popper Reward Roles")
                .setDescription(`There are currently **${roles.length}** custom key popper reward roles set. People who meet or exceed the number of key pops will get the associated role, if any.`)
                .setFooter("All Key Popper Roles");
            if (roles.length > 0) {
                const fields = ArrayUtil.arrayToStringFields<string>(
                    roles.map(x => `${guild.roles.cache.get(x.role)} (${x.amt})`),
                    (i, elem) => `**\`[${i + 1}]\`** ${elem}\n`
                );

                for (const field of fields) {
                    embed.addField("Roles", field);
                }
            }

            await msg.channel.send(embed).catch();

            if (invalidRoles.length !== roles.length) {
                // overwrite the keyPopperRewards array with the valid roles array.
                guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
                    $set: {
                        "roles.optRoles.keyPopperRewards": roles
                    }
                }, { returnOriginal: false })).value as IRaidGuild;
            }

            return;
        }

        const role: Role | undefined = msg.mentions.roles.first();
        let resolvedRole: Role;
        if (typeof role === "undefined") {
            let reRo: Role | undefined = (msg.guild as Guild).roles.cache.get(msg.content) as Role | undefined;
            if (typeof reRo === "undefined") {
                await MessageUtil.send(MessageUtil.generateBuiltInEmbed(msg, "INVALID_ID", null, "role"), msg.channel);
                return;
            }
            resolvedRole = reRo;
        }
        else {
            resolvedRole = role;
        }

        let numToSet: number = -1;
        if (args.length >= 2) {
            numToSet = Number.parseInt(args[1]);
            if (Number.isNaN(numToSet)) numToSet = -1;
        }

        const resEmbed = MessageUtil.generateBlankEmbed(msg.author, "GREEN");

        // If role exists, remove it
        if (guildDb.roles.optRoles.keyPopperRewards.some(x => x.role === resolvedRole.id)) {
            resEmbed.setTitle("Removed Role")
                .setDescription(`The role, ${resolvedRole}, has been removed from the list of key popper reward roles. If you meant to **change** the number of key pops needed to earn this role, you need to re-add the role with a number after it; for example, \`;configurekeypoprole @Role 2\`.`)
                .setFooter("Removed");

            guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
                $pull: {
                    "roles.optRoles.keyPopperRewards": {
                        role: resolvedRole.id
                    }
                }
            }, { returnOriginal: false })).value as IRaidGuild;
            MessageUtil.send({ embed: resEmbed }, msg.channel, 10 * 1000);
            return;
        }

        // If an invalid number is provided, then we assume that the person wanted to remove the role. 
        if (numToSet <= 0) {
            MessageUtil.send({
                embed: MessageUtil.generateBlankEmbed(msg.author, "RANDOM")
                    .setTitle("Role Does Not Exist")
                    .setDescription(`The role, ${role}, has not been set as a key popper role reward. If you meant to **add** this role, please include a __positive__ integer *after* the role; for example, \`;configurekeypoprole @Role 2\`.`)
            }, msg.channel, 10 * 1000);
            return;
        }

        resEmbed.setTitle("Added Role")
            .setDescription(`The role, ${resolvedRole}, has been added to the list of key popper roles. Members will need to open at least ${numToSet} keys to earn this role.`)
            .setFooter("Added");
        guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
            $push: {
                "roles.optRoles.keyPopperRewards": {
                    role: resolvedRole.id,
                    amt: numToSet
                }
            }
        }, { returnOriginal: false })).value as IRaidGuild;

        MessageUtil.send({ embed: resEmbed }, msg.channel, 10 * 1000);
    }
}