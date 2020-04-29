export interface ITiffitRealmEyeProfile {
    /**
     * Name of the person.
     */
    name: string;

    /**
     * -1 if characters are hidden. Otherwise, amount of characters RealmEye shows.
     */
    characterCount: number;

    /**
     * -1 if skins are hidden. Otherwise, a count of all skins unlocked.
     */
    skins: number;

    /**
     * Total alive fame.
     */
    fame: number;

    /**
     * Total alive EXP.
     */
    xp: number;

    /**
     * Current rank of the player.
     */
    rank: number;

    /**
     * Total account fame.
     */
    account_fame: number;

    /**
     * Current guild. "N/A" if no guild.
     */
    guild: string;

    /**
     * Guild rank. "N/A" if no guild.
     */
    guild_rank: string;

    /**
     * Account creation time.
     */
    created: string;

    /**
     * Last seen. "hidden" if last seen information isn't available.
     */
    last_seen: string;

    /**
     * Description. Empty array if no description.
     */
    description: string[];

    /**
     * Current characters. 
     */
    characters: ITiffitCharacterData[];
}

export interface ITiffitCharacterData {
    /**
     * The class.
     */
    class: string;

    /**
     * Character level.
     */
    level: number;

    /**
     * Total CQC completed. Should be "x/5" where x = number of class quests completed.
     */
    class_quests_completed: number;

    /**
     * Current amount of fame on the character.
     */
    fame: 1487;

    /**
     * Current amount of XP on the character.
     */
    xp: number;

    /**
     * The character's rank.
     */
    place: number;

    /**
     * Current equipment.
     * `equipment[0]` = weapon.
     * `equipment[1]` = ability.
     * `equipment[2]` = armor.
     * `equipment[3]` = ring.
     * `equipment[4]` = backpack (if equipped).
     */
    equipment: string[];

    /**
     * Current stats maxed. Should be "x/8" where x = stats maxed.
     */
    stats_maxed: string,

    /**
     * Stats of the character (EXCLUDING bonuses from gear).
     */
    stats: {
        hp: number;
        mp: number;
        attack: number;
        defense: number;
        speed: number;
        vitality: number;
        wisdom: number;
        dexterity: number;
    }
}

export interface ITiffitNoUser {
    error: string;
    suggestions: string[];
}