import { IBaseRealmEyeResponse } from "./IBaseRealmEyeResponse";

export interface IGraveyardData extends IBaseRealmEyeResponse {
    graveyardCount: number;
    graveyard: IGraveyardEntry[];
}

export interface IGraveyardEntry {
    diedOn: string;
    charater: string;
    level: number;
    baseFame: number;
    totalFame: number;
    experience: number;
    equipment: string[];
    maxedStats: number;
    killedBy: string;
    hadBackpack: boolean;
}