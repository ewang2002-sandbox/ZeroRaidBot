import { Role, TextChannel, GuildMember } from "discord.js"
import { BotConfiguration } from "../Configuration/Config";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { MuteCommand } from "../Commands/Moderator/MuteCommand";
import { SuspendCommand } from "../Commands/Moderator/SuspendCommand";

export async function onRoleDelete(role: Role): Promise<void> {
	if (role.guild === null) {
		return;
	}

	if (BotConfiguration.exemptGuild.includes(role.guild.id)) {
		return;
	}

    const guildDb: IRaidGuild = await new MongoDbHelper.MongoDbGuildManager(role.guild.id).findOrCreateGuildDb();
    
    // reset all muted users
    if (role.id === guildDb.roles.optRoles.mutedRole) {
        await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: role.guild.id }, {
            $set: {
                "moderation.mutedUsers": []
            }
        });

        for (const timeout of MuteCommand.currentTimeout) {
            clearTimeout(timeout.timeout);
        }

        MuteCommand.currentTimeout = [];
    }

    // reset all suspended users
    if (role.id === guildDb.roles.suspended) {
        for (const suspendedUser of guildDb.moderation.suspended) {
            let member: GuildMember | undefined;
            try {
                member = await role.guild.members.fetch(suspendedUser.userId);
            }
            finally {
                if (typeof member !== "undefined") {
                    await member.roles.set(suspendedUser.roles).catch(console.error);
                }
            }
        }

        await MongoDbHelper.MongoDbGuildManager.MongoGuildClient.updateOne({ guildID: role.guild.id }, {
            $set: {
                "moderation.suspended": []
            }
        });

        for (const timeout of SuspendCommand.currentTimeout) {
            clearTimeout(timeout.timeout);
        }

        SuspendCommand.currentTimeout = [];
    }
}