import { IBaseRealmEyeResponse } from "./IBaseRealmEyeResponse";

export interface IPlayerData extends IBaseRealmEyeResponse {
    name: string;
    characterCount: number;
    skins: number;
    fame: number;
    exp: number;
    rank: number;
    accountFame: number;
    guild: string;
    guildRank: string;
    firstSeen: string | null;
    created: string | null;
    lastSeen: string;
    description: string[];
    characters: ICharacterEntry[];
}

export interface ICharacterEntry {
    activePetId: number;
    characterType: string;
    level: number;
    classQuestsCompleted: number;
    fame: number;
    experience: number;
    place: number;
    equipmentData: string[];
    hasBackpack: boolean;
    stats: IStats;
    statsMaxed: number;
}

export interface IStats {
    health: number;
    magic: number;
    attack: number;
    defense: number;
    speed: number;
    vitality: number;
    wisdom: number;
    dexterity: number;
}