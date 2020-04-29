import { Collection, VoiceChannel } from "discord.js";

export module OtherUtil {
    /**
     * Gets all the voice channels numbers, sorted. 
     * @param {Collection<string, VoiceChannel>} vcs The voice channels. 
     * @returns {number[]} An array containing all the VC numbers. 
     */
    export function getAllVoiceChannelNumbers(vcs: Collection<string, VoiceChannel>): number[] {
        const nums: number[] = [];
        for (const [, vc] of vcs) {
            // last split arg
            const vcNum: number = Number.parseInt(vc.name.split(" ")[vc.name.split(" ").length - 1]);
            if (Number.isNaN(vcNum)) {
                continue;
            }
            nums.push(vcNum);
        }
        return nums.sort();
    }

}