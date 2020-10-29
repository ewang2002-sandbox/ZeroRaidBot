import { IBaseRealmEyeResponse } from "./IBaseRealmEyeResponse";

export interface IGraveyardSummaryData extends IBaseRealmEyeResponse {
    properties: IGraveyardSummaryProperty[]
    technicalProperties: IGraveyardTechnicalProperty[];
    statsCharacters: IMaxedStatsByCharacters[];
}

export interface IMaxedStatsByCharacters {
    characterType: string;
    stats: number[];
    total: number;
}

export interface IGraveyardSummaryProperty {
    achievement: string;
    total: number;
    max: number;
    average: number;
    min: number;
}

export interface IGraveyardTechnicalProperty {
    achievement: string;
    total: string;
    max: string;
    average: string;
    min: string;
}