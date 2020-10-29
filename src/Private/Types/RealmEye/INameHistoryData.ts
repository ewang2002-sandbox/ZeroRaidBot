import { IBaseRealmEyeResponse } from "./IBaseRealmEyeResponse";

export interface INameHistoryData extends IBaseRealmEyeResponse {
    nameHistory: INameHistoryEntry[];
}

export interface INameHistoryEntry {
    name: string;
    to: string;
    from: string;
}