import { VoiceState } from "discord.js";
import { SilencedUsers } from "./MessageEvent";

export async function onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    // Originally not in channel, now in channel = joined
    if (!oldState.channel && newState.channel) {
        const member = newState.member;
        if (!member) return; 
        if (SilencedUsers.has(member.guild.id) && (SilencedUsers.get(member.guild.id) as string[]).includes(member.id)) {
            await member.voice.kick("Silenced").catch();
        }
    }
}