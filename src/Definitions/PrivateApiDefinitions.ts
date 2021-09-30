export namespace PrivateApiDefinitions {
    export interface IRealmEyePlayerResponse {
        profileIsPrivate: boolean;
        sectionIsPrivate: boolean;
        resultCode: number;
        name: string;
    }

    export interface IApiStatus {
        online: boolean;
    }

    export interface INameHistory extends IRealmEyePlayerResponse {
        nameHistory: {
            name: string;
            from: string;
            to: string;
        }[];
    }

    export interface IRankHistory extends IRealmEyePlayerResponse {
        rankHistory: {
            rank: number;
            achieved: string;
            date: string;
        }[];
    }

    export interface IGuildHistory extends IRealmEyePlayerResponse {
        guildHistory: {
            guildName: string;
            guildRank: string;
            from: string;
            to: string;
        }[];
    }

    export interface IExaltation extends IRealmEyePlayerResponse {
        exaltations: {
            class: string;
            exaltationAmount: string;
            exaltationStats: {
                [s: string]: number;
                health: number;
                magic: number;
                attack: number;
                defense: number;
                speed: number;
                vitality: number;
                wisdom: number;
                dexterity: number;
            };
        }[];
    }

    export interface IGraveyard extends IRealmEyePlayerResponse {
        graveyardCount: number;
        graveyard: {
            diedOn: string;
            character: string;
            level: number;
            baseFame: number;
            totalFame: number;
            experience: number;
            equipment: string[];
            maxedStats: number;
            killedBy: string;
            hadBackpack: boolean;
        }[];
    }

    export interface IGraveyardSummary extends IRealmEyePlayerResponse {
        properties: {
            achievement: string;
            total: number;
            max: number;
            average: number;
            min: number;
        }[];

        technicalProperties: {
            achievement: string;
            total: string;
            max: string;
            average: string;
            min: string;
        }[];

        statsCharacters: {
            characterType: string;
            stats: number[];
            total: number;
        }[];
    }

    export interface IPetYard extends IRealmEyePlayerResponse {
        pets: {
            id: number;
            petSkinName: string;
            name: string;
            rarity: string;
            family: string;
            place: number;
            petAbilities: {
                isUnlocked: boolean;
                abilityName: string;
                level: number;
                isMaxed: boolean;
            }[];
            maxLevel: number;
        }[];
    }

    export interface IPlayerData extends IRealmEyePlayerResponse {
        characterCount: number;
        skins: number;
        fame: number;
        exp: number;
        rank: number;
        accountFame: number;
        guild: string;
        guildRank: string;
        firstSeen?: string;
        created?: string;
        lastSeen: string;
        description: string[];
        characters: {
            pet: {
                name: string;
                id: number;
            };
            characterSkin: {
                clothingDyeId: number;
                clothingDyeName: string;
                accessoryDyeId: number;
                accessoryDyeName: string;
                skinId: number;
            };
            characterType: string;
            level: number;
            classQuestsCompleted: number;
            fame: number;
            experience: number;
            place: number;
            equipmentData: {
                name: string;
                tier: string;
                id: number;
            }[];
            hasBackpack: boolean;
            stats: {
                Health: number;
                Magic: number;
                Attack: number;
                Defense: number;
                Speed: number;
                Vitality: number;
                Wisdom: number;
                Dexterity: number;
            };
            statsMaxed: number;
        }[];
    }

    export interface IParseWhoResult {
        names: string[];
        timeElapsedSec: number;
    }

    export interface IParseJob {
        totalElapsedSec: number;
        concurrElapsedSec: number;
        parseWhoElapsedSec: number;
        completedCount: number;
        failedCount: number;
        input: string[];
        completed: string[];
        failed: string[];
        defaultNames: string[];
        output: IPlayerData[];
    }
}