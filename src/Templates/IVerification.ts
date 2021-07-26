export interface IVerification {
    /**
     * Whether to check any requirements.
     */
    checkRequirements: boolean; 
    
    /**
     * Minimum stars required for membership.
     */
    stars: {
        required: boolean;
        minimum: number;
    };

    /**
     * Minimum alive fame required for membership.
     */
    aliveFame: {
        required: boolean;
        minimum: number;
    };

    /**
     * Minimum character points required for membership.
     */
    maxedStats: {
        required: boolean;
        statsReq: [number, number, number, number, number, number, number, number, number]; // [0/8, 1/8, 2/8, 3/8, 4/8, 5/8, 6/8, 7/8, 8/8]
    };
}