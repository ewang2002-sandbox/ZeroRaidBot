import { ILeaderLogType } from "./UserDBProps";

export interface IQuotaDbInfo {
    memberId: string;
    endgame: ILeaderLogType;
    general: ILeaderLogType;
    realmClearing: ILeaderLogType;
    lastUpdated: number; // date
}