interface IGeneralPunishment {
    userId: string;
    modId: string;
    reason: string;
    duration: number;
    endsAt: number;
}

export interface IMutedData extends IGeneralPunishment {

}

export interface ISuspendedData extends IGeneralPunishment {
    roles: string[];
}