import { Zero } from "../Zero";

// Any specific classes.
export const RushingClass: string = "585616161878835220";
export const Paladin: string = "585616162163916800";
export const Warrior: string = "585616162407186433";
export const Knight: string = "585616162189213696";
export const Samurai: string = "585616163078275102";
export const Priest: string = "585616162411249691";
export const Mystic: string = "585616161773977621";
export const Trickster: string = "585616162415575060";
export const Bard: string = "714015181679624203";

// Any specific status effects.
export const Paralyze: string = "678792068906352642";
export const Slow: string = "678792068965072906";
export const Daze: string = "678792068948295686";
export const ArmorBreak: string = "561334399635816448";
export const MSeal: string = "678792284682190884";
export const ScholarSeal: string = "678792068935450634";
export const BrainPrism: string = "708927848076935218";

// reactions i guess
export const AllEmoji: string = "561605182153031680";
export const NitroEmoji: string = "706246225200152656";
export const SnakeOilEmoji: string = "733724221137616920"; 


/**
 * Emojis and their definitions.
 */
export function getEmojiData(): string[][] {
	return [
		// classes
		[
			RushingClass,
			`**React** with ${Zero.RaidClient.emojis.cache.get(RushingClass)} if you are planning to rush in this dungeon.`
		],
		[
			Paladin,
			`**React** with ${Zero.RaidClient.emojis.cache.get(Paladin)} if you are bringing a Paladin with a Tier 4+ Seal and can actively buff surrounding players.`
		],
		[
			Warrior,
			`**React** with ${Zero.RaidClient.emojis.cache.get(Warrior)} if you are bringing a Warrior with a Tier 4+ Helm and can actively buff surrounding players.`
		],
		[
			Knight,
			`**React** with ${Zero.RaidClient.emojis.cache.get(Knight)} if you are bringing a Knight that can actively stun enemies.`
		],
		[
			Samurai,
			`**React** with ${Zero.RaidClient.emojis.cache.get(Samurai)} if you are bringing a Samurai that can actively expose enemies.`
		],
		[
			Priest,
			`**React** with ${Zero.RaidClient.emojis.cache.get(Priest)} if you are bringing a Priest with a Tier 4+ Tome and can actively heal.`
		],
		[
			Mystic,
			`**React** with ${Zero.RaidClient.emojis.cache.get(Mystic)} if you are bringing a Mystic that can actively stasis enemies.`
		],
		[
			Trickster,
			`**React** with ${Zero.RaidClient.emojis.cache.get(Trickster)} if you are bringing a Trickster that can actively decoy enemies.`
		],
		// status effects
		[
			Paralyze,
			`**React** with ${Zero.RaidClient.emojis.cache.get(Paralyze)} if you are bringing a character or pet that can actively paralyze enemies.`
		],
		[
			Slow,
			`**React** with ${Zero.RaidClient.emojis.cache.get(Slow)} if you are bringing a character that can actively slow enemies.`
		],
		[
			Daze,
			`**React** with ${Zero.RaidClient.emojis.cache.get(Daze)} if you are bringing a character that can actively daze enemies.`
		],
		[
			ArmorBreak,
			`**React** with ${Zero.RaidClient.emojis.cache.get(ArmorBreak)} if you are bringing a character that can actively armor break enemies.`
		],
		[
			MSeal,
			`**React** with ${Zero.RaidClient.emojis.cache.get(MSeal)} if you are bringing a paladin that has a Marble Seal.`
		],
		[
			ScholarSeal,
			`**React** with ${Zero.RaidClient.emojis.cache.get(ScholarSeal)} if you are bringing a paladin that has a Scholar's Seal.`
		]
	];
}