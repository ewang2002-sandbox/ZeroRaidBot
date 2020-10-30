export interface IPrivateVerification {
    aliveFame: {
        checkThis: boolean;
        minFame: number;
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
        minRank: number;
    };

    characters: {
        checkThis: boolean;
        statsNeeded: [number, number, number, number, number, number, number, number, number];
        // if true
        // dead characters can fulfil the above reqs
        // must have priv api
        checkPastDeaths: boolean;
    };

    exaltationsBase: {
        checkThis: boolean;
        minimum: number;
    };

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

    graveyardSummary: {
        checkThis: boolean;

        minimum: {
            minOryxKills: number;
            minLostHalls: number;
            minVoids: number;
            minCults: number;
            minNests: number;
            minShatters: number;
            minFungal: number;
            minCrystal: number;
        };
    };
}