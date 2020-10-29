import { IBaseRealmEyeResponse } from "./IBaseRealmEyeResponse";
import { IStats } from "./IPlayerData";

export interface IExaltationData extends IBaseRealmEyeResponse {
    exaltations: IExaltationEntry[];
}

export interface IExaltationEntry {
    class: string;
    exaltationAmount: string; 
    exaltationStats: IStats; 
}