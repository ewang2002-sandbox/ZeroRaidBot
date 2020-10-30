export interface IBaseVerification {
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
        minimum: number;
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

export function getDefaultVerification(): IPrivateVerification {
    return {
        aliveFame: {
            checkThis: false,
            minFame: 0
        },
        guild: {
            checkThis: false,
            guildName: {
                checkThis: false,
                // must be in this guild
                name: ""
            },
            guildRank: {
                checkThis: false,
                minRank: "",
            },
        },
        lastSeen: {
            mustBeHidden: false
        },
        rank: {
            checkThis: false,
            minimum: 0
        },
        characters: {
            checkThis: false,
            statsNeeded: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            // if true
            // dead characters can fulfil the above reqs
            // must have priv api
            checkPastDeaths: false,
        },
        exaltationsBase: {
            checkThis: false,
            minimum: 0
        },
        exaltations: {
            checkThis: false,
            minimum: {
                hp: 0,
                mp: 0,
                def: 0,
                att: 0,
                dex: 0,
                spd: 0,
                vit: 0,
                wis: 0,
            },
            // if true, all "minimum" must be
            // achieved. otherwise, only 1.
            requireAll: false
        },
        graveyardSummary: {
            checkThis: false,

            minimum: {
                minOryxKills: 0,
                minLostHalls: 0,
                minVoids: 0,
                minCults: 0,
                minNests: 0,
                minShatters: 0,
                minFungal: 0,
                minCrystal: 0,
            },
        }
    };
}