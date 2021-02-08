import { PartialDMChannel, Channel, DMChannel, GuildChannel, Guild, Role } from "discord.js";
import { BotConfiguration } from "../Configuration/Config";
import { IRaidGuild } from "../Templates/IRaidGuild";
import { MongoDbHelper } from "../Helpers/MongoDbHelper";
import { OtherUtil } from "../Utility/OtherUtil";

export async function onChannelCreate(channel: Channel | PartialDMChannel): Promise<void> {    
    // we only care if it's a guild channel
    if (channel instanceof DMChannel || !(channel instanceof GuildChannel)) {
        return;
    }

    const guild: Guild = channel.guild;

    if (BotConfiguration.exemptGuild.includes(guild.id)) {
        return;
    }

    const guildDb: IRaidGuild = await new MongoDbHelper.MongoDbGuildManager(guild.id)
        .findOrCreateGuildDb();

    const mutedRole: Role | undefined = guild.roles.cache.get(guildDb.roles.optRoles.mutedRole);

    if (typeof mutedRole === "undefined") {
        return;
    }

    await OtherUtil.waitFor(1000);

    // add muted role override 
    await channel.createOverwrite(mutedRole, {
        SEND_MESSAGES: false, // can't send msgs, obviously.
        ADD_REACTIONS: false, // can't add reactions.
        CONNECT: false, // can't connect to vc.
        SPEAK: false, // can't speak in vc (if they can connect).
        MANAGE_CHANNELS: false // can't manage channel (so they can't just bypass).
    }).catch(console.error);
}