export interface IKeyPops {
    server: string;
    keysPopped: number;
}

export interface IVoidVials {
    /**
     * Amount of vials popped for this server.
     */
    popped: number;

    /**
     * Amount of vials stored for this server. 
     */
    stored: number;

    /**
     * server
     */
    server: string;
}

export interface IWineCellarOryx {
    wcIncs: {
        amt: number;
        popped: number;
    };
    swordRune: {
        amt: number;
        popped: number;
    };
    shieldRune: {
        amt: number;
        popped: number;
    };
    helmRune: {
        amt: number;
        popped: number;
    };

    /**
     * server
     */
    server: string;
}

interface IRuns {
    /**
     * General dungeons (i.e. not endgame)
     */
    general: number;

    /**
     * Endgame dungeons. These are defined as 
     * - Cult
     * - Void
     * - Fungal/Crystal Cavern
     * - O3 (soon)     */
    endgame: number;

    /**
     * Realm clearing led
     */
    realmClearing: number;
}

export interface ICompletedRuns extends IRuns {
    /**
     * server
     */
    server: string;
}

export interface ILeaderRuns extends IRuns {
    /**
     * server
     */
    server: string;
}