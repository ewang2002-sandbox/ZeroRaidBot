import { IBaseRealmEyeResponse } from "./IBaseRealmEyeResponse";

export interface IPetYardData extends IBaseRealmEyeResponse {
    pets: IPetEntry[];
}

export interface IPetEntry {
    activePetId: number;
    name:string;
    rarity: string;
    family:string;
    place: number;
    petAbilities: IPetAbilityData[];
    maxLevel: number;
}

export interface IPetAbilityData {
    isUnlocked: boolean;
    abilityName: string;
    level: string;
    isMaxed: boolean;
}