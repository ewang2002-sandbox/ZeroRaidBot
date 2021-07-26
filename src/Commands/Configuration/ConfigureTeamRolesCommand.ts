import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Guild, Message, Role } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { MongoDbHelper } from "../../Helpers/MongoDbHelper";
import { ArrayUtil } from "../../Utility/ArrayUtil";
import { MessageUtil } from "../../Utility/MessageUtil";
import { UserHandler } from "../../Helpers/UserHandler";

export class ConfigureTeamRolesCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Manage Team Command",
                "configteamroles",
                ["manageteam", "team"],
                "Adds or removes a role from the Team role list. If no arguments are specified, this will instead show all custom team roles.",
                ["configteamroles <Role>"],
                ["configteamroles", "configteamroles @Developer"],
                0
            ),
            new CommandPermission(
                ["KICK_MEMBERS"],
                [],
                ["officer", "moderator", "headRaidLeader"],
                [],
                false
            ),
            true,
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
        if (!guildDb.roles.customTeamRoles) {
            guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
                $set: {
                    "roles.customTeamRoles": []
                }
            }, { returnOriginal: false })).value as IRaidGuild;
        }

        if (args.length === 0) {
            const roles = guildDb.roles.customTeamRoles
                .filter(x => guild.roles.cache.has(x));
            const invalidRoles = guildDb.roles.customTeamRoles
                .filter(x => guild.roles.cache.has(x));


            const embed = MessageUtil.generateBlankEmbed(guild, "RANDOM")
                .setTitle("All Team Roles")
                .setDescription(`There are currently **${roles.length}** custom team roles set. People who get these roles will automatically get the associated Team role, if any.`)
                .setFooter("All Team Roles");
            if (roles.length > 0) {
                const fields = ArrayUtil.arrayToStringFields<string>(
                    roles,
                    (i, elem) => `**\`[${i + 1}]\`** ${elem}\n`
                );

                for (const field of fields) {
                    embed.addField("Roles", field);
                }
            }

            await msg.channel.send(embed).catch();

            if (invalidRoles.length !== roles.length) {
                // overwrite the customTeamRoles array with the valid roles array.
                guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
                    $set: {
                        "roles.customTeamRoles": roles
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

        const resEmbed = MessageUtil.generateBlankEmbed(msg.author, "GREEN");
        const peopleWithThisRole = resolvedRole.members;

        if (guildDb.roles.customTeamRoles.includes(resolvedRole.id)) {
            resEmbed.setTitle("Removed Role")
                .setDescription(`The role, ${resolvedRole}, has been removed from the list of team roles.`)
                .setFooter("Removed");

            guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
                $pull: {
                    "roles.customTeamRoles": resolvedRole.id
                }
            }, { returnOriginal: false })).value as IRaidGuild;
        }
        else {
            resEmbed.setTitle("Added Role")
                .setDescription(`The role, ${resolvedRole}, has been added to the list of team roles.`)
                .setFooter("Added");
            guildDb = (await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.findOneAndUpdate({ guildID: guild.id }, {
                $push: {
                    "roles.customTeamRoles": resolvedRole.id
                }
            }, { returnOriginal: false })).value as IRaidGuild;
        }

        MessageUtil.send({ embed: resEmbed }, msg.channel, 10 * 1000);
        for (const [, member] of peopleWithThisRole) {
            await UserHandler.manageStaffRole(member, guildDb);
        }
    }
}