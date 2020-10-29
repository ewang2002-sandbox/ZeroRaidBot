export interface IBaseVerification {
    aliveFame: {
        checkThis: boolean;

        minimum: number;
    };

    guild: {
        checkThis: boolean;

        guildName: {
            checkThis: boolean;
            // must be in this guild
            name: string;
        };

        guildRank: {
            checkThis: boolean;
            minRank: string; 
        };
    };

    lastSeen: {
        mustBeHidden: boolean;
    };

    rank: {
        checkThis: boolean;
        minimum: number;
    };

    characters: {
        checkThis: boolean;
        statsNeeded: [number, number, number, number, number, number, number, number, number];
    };

    exaltationsBase: {
        checkThis: boolean;
        minimum: number; 
    };
}

export interface IPrivateVerification extends IBaseVerification {
    exaltations: {
        checkThis: boolean;
        minimum: {
            hp: number;
            mp: number;
            def: number;
            att: number;
            dex: number;
            spd: number;
            vit: number;
            wis: number;
        };

        // if true, all "minimum" must be
        // achieved. otherwise, only 1.
        requireAll: boolean;
    };
}
