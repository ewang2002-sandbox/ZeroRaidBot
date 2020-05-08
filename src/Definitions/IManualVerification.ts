import { INameHistory } from "./ICustomREVerification";

export interface IManualVerification {
    /**
     * The Discord account that wants to verify.
     */
    userId: string; 

    /**
     * The in-game name.
     */
    inGameName: string;

    /**
     * Current stars.
     */
    rank: number;

    /**
     * Alive fame.
     */
    aFame: number;

    /**
     * Name History.
     */
    nameHistory: INameHistory[];

    /**
     * The ID of the message corresponding to the message in the manual verification channel.
     */
    msgId: string;

    /**
     * The ID of the manual verification channel.
     */
    manualVerificationChannel: string;
}