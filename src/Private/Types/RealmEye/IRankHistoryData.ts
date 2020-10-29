import { IBaseRealmEyeResponse } from "./IBaseRealmEyeResponse";

export interface IRankHistoryData extends IBaseRealmEyeResponse {
    nameHistory: IRankHistoryEntry[];
}

export interface IRankHistoryEntry {
    rank: number;
    achieved: string;
    date: string; 
}