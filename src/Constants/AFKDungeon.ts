import { IDungeonData } from "../Definitions/IDungeonData";
import { RushingClass, Daze, ArmorBreak, Knight, Warrior, Paladin, Priest, Slow, Paralyze, Samurai, Mystic, MSeal, Trickster, Puri, Bard, BrainPrism, SnakeOilEmoji } from "./EmojiData";

export const AFKDungeon: IDungeonData[] = [
	{
		id: 0,
		dungeonName: "Snake Pit",
		portalEmojiID: "561248700291088386",
		keyEmojIDs: [
			{
				keyEmojID: "561248916734083075",
				keyEmojiName: "Snake Pit Key"
			}
		],
		reactions: [
			RushingClass
		],
		portalLink: "https://cdn.discordapp.com/attachments/561245975767941120/561248354173190176/Snake_Pit_Portal.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/Stheno%20the%20Snake%20Queen.png"],
		colors: [
			0x29c71e
		]
	},
	{
		id: 1,
		dungeonName: "Magic Woods",
		portalEmojiID: "561248700870033408",
		keyEmojIDs: [
			{
				keyEmojID: "561248916805386270",
				keyEmojiName: "Magic Woods Key"
			}
		],
		reactions: [
			RushingClass
		],
		portalLink: "https://i.imgur.com/mvUTUNo.png",
		bossLink: ["https://i.imgur.com/jVimXOv.png"],
		colors: [
			0x1fcfcc
		]
	},
	{
		id: 2,
		dungeonName: "Sprite World",
		portalEmojiID: "561249801501540363",
		keyEmojIDs: [
			{
				keyEmojID: "561249834292477967",
				keyEmojiName: "Sprite World Key"
			}
		],
		reactions: [
			RushingClass
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Glowing%20Portal.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/Limon%20the%20Sprite%20God.png"],
		colors: [
			0xffffff,
			0x9f22b3,
			0,
			0xe6df15
		] 
	},
	{
		id: 3,
		dungeonName: "Candyland Hunting Grounds",
		portalEmojiID: "561248700916301825",
		keyEmojIDs: [
			{
				keyEmojID: "561248916989935656",
				keyEmojiName: "Candyland Hunting Grounds Key"
			}
		],
		reactions: [],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Candyland%20Portal.png",
		bossLink: [
			"https://static.drips.pw/rotmg/wiki/Enemies/Gigacorn.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Desire%20Troll.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Spoiled%20Creampuff.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/MegaRototo.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Swoll%20Fairy.png"
		],
		colors: [
			0xde1dc1,
			0xbdf7fc
		]
	},
	{
		id: 4,
		dungeonName: "Cave of a Thousand Treasures",
		portalEmojiID: "561248701809557511",
		keyEmojIDs: [
			{
				keyEmojID: "561248916968964129",
				keyEmojiName: "Cave of a Thousand Treasures Key"
			}
		],
		reactions: [
			RushingClass
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Treasure%20Cave%20Portal.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/Golden%20Oryx%20Effigy.png"],
		colors: [
			0xd1c819,
			0x8a1d1d,
			0x3d3434
		]
	},
	{
		id: 5,
		dungeonName: "Undead Lair",
		portalEmojiID: "561248700601729036",
		keyEmojIDs: [
			{
				keyEmojID: "561248917090729999",
				keyEmojiName: "Undead Lair Key"
			}
		],
		reactions: [
			RushingClass
		],
		portalLink: "https://cdn.discordapp.com/attachments/561245975767941120/561248252310061066/Undead_Lair_Portal.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/Septavius%20the%20Ghost%20God.png"],
		colors: [
			0x3d3434,
			0x2b1e1e,
			0
		]
	},
	{
		id: 39,
		dungeonName: "Heroic Undead Lair",
		portalEmojiID: "711479365602508820",
		keyEmojIDs: [
			{
				keyEmojID: "711444346334871643",
				keyEmojiName: "Heroic Undead Lair Key"
			}
		],
		reactions: [
			Paladin,
			Warrior,
			Priest,
			Puri,
			MSeal,
			Daze,
			ArmorBreak
		],
		portalLink: "https://i.imgur.com/YgiGjh7.gif",
		bossLink: ["https://i.imgur.com/WmL1qda.png"],
		colors: [
			0x4d19d1,
			0xf5d311,
			0x3d3434,
			0x2b1e1e
		]
	},
	{
		id: 6,
		dungeonName: "Abyss of Demons",
		portalEmojiID: "561248700643409931",
		keyEmojIDs: [
			{
				keyEmojID: "561248916624900097",
				keyEmojiName: "Abyss of Demons Key"
			}
		],
		reactions: [
			RushingClass
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Abyss%20of%20Demons%20Portal.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/Archdemon%20Malphas.png"],
		colors: [
			0xe30707,
			0xe09a19
		]
	},
	{
		id: 40,
		dungeonName: "Heroic Abyss of Demons",
		portalEmojiID: "711431861678637129",
		keyEmojIDs: [
			{
				keyEmojID: "711444346263830559",
				keyEmojiName: "Heroic Abyss of Demons Key"
			}
		],
		reactions: [
			Paladin,
			Warrior,
			Priest,
			Puri,
			MSeal,
			Daze,
			ArmorBreak
		],
		portalLink: "https://i.imgur.com/zz6D2lz.png",
		bossLink: ["https://i.imgur.com/LCALe5V.png"],
		colors: [
			0xe30707,
			0xe09a19,
			0xf5d311
		]
	},
	{
		id: 7,
		dungeonName: "Manor of the Immortals",
		portalEmojiID: "561248700337225759",
		keyEmojIDs: [
			{
				keyEmojID: "561248917120090142",
				keyEmojiName: "Manor of the Immortals Key"
			}
		],
		reactions: [
			RushingClass
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Manor%20of%20the%20Immortals%20Portal.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/Lord%20Ruthven.png"],
		colors: [
			0,
			0x4b2078,
			0x8b4fc9,
			0x3f2e52
		]
	},
	{
		id: 8,
		dungeonName: "Puppet Master's Theatre",
		portalEmojiID: "561248700408791051",
		keyEmojIDs: [
			{
				keyEmojID: "561248917065433119",
				keyEmojiName: "Puppet Master's Theatre"
			}
		],
		reactions: [
			RushingClass
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Puppet%20Theatre%20Portal.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/The%20Puppet%20Master.png"],
		colors: [
			0xe31b1f,
			0xad3638
		]
	},
	{
		id: 9,
		dungeonName: "Toxic Sewers",
		portalEmojiID: "561248701213835265",
		keyEmojIDs: [
			{
				keyEmojID: "561248917145124874",
				keyEmojiName: "Toxic Sewers Key"
			}
		],
		reactions: [
			RushingClass
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Toxic%20Sewers%20Portal.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/DS%20Gulpord%20the%20Slime%20God.png"],
		colors: [
			0x074f2a,
			0x228753
		]
	},
	{
		id: 10,
		dungeonName: "Haunted Cemetary",
		portalEmojiID: "561248700693741578",
		keyEmojIDs: [
			{
				keyEmojID: "561248917052981278",
				keyEmojiName: "Haunted Cemetary Key"
			}
		],
		reactions: [],
		portalLink: "https://cdn.discordapp.com/attachments/561245975767941120/561248253836787717/Haunted_Cemetery_Portal.png",
		bossLink: [
			"https://static.drips.pw/rotmg/wiki/Enemies/Troll%203.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Arena%20Ghost%20Bride.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Arena%20Grave%20Caretaker.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Ghost%20of%20Skuld.png"
		],
		colors: [
			0x0e9c53
		]
	},
	{
		id: 11,
		dungeonName: "Mad Lab",
		portalEmojiID: "561248700899262469",
		keyEmojIDs: [
			{
				keyEmojID: "561248917010776065",
				keyEmojiName: "Mad Lab Key"
			}
		],
		reactions: [
			RushingClass
		],
		portalLink: "https://cdn.discordapp.com/attachments/561245975767941120/561248331695915018/Mad_Lab_Portal.png",
		bossLink: [
			"https://static.drips.pw/rotmg/wiki/Enemies/Dr%20Terrible.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Horrific%20Creation.png"
		],
		colors: [
			0x06bd5f,
			0x0db4ba
		]
	},
	{
		id: 12,
		dungeonName: "Parasite Chambers",
		portalEmojiID: "561248700727558144",
		keyEmojIDs: [
			{
				keyEmojID: "561248917115633665",
				keyEmojiName: "Parasite Chambers Key"
			}
		],
		reactions: [
			Knight,
			Warrior,
			Paladin,
			Priest,
			Bard,
			RushingClass,
			Daze,
			ArmorBreak
		],
		portalLink: "https://cdn.discordapp.com/attachments/561245975767941120/561248332635439136/Parasite.png",
		bossLink: ["https://i.imgur.com/zodPEFO.png"],
		colors: [
			0xbf1d4b,
			0x7d1935,
			0xeb1551
		]
	},
	{
		id: 13,
		dungeonName: "Davy Jones's Locker",
		portalEmojiID: "561248700295544883",
		keyEmojIDs: [
			{
				keyEmojID: "561248917086273536",
				keyEmojiName: "Davy Jones's Locker Key"
			}
		],
		reactions: [
			RushingClass
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Davy%20Jones's%20Locker%20Portal.png",
		bossLink: ["https://i.imgur.com/Jc4FERS.png"],
		colors: [
			0x2376a6
		]
	},
	{
		id: 14,
		dungeonName: "Mountain Temple",
		portalEmojiID: "561248700769239076",
		keyEmojIDs: [
			{
				keyEmojID: "561248917027684367",
				// Numeric literals with absolute values equal to 2^53 or greater are too large to be represented accurately as integers.ts(80008)
				// when you do 561248917027684367 instead of "561248917027684367n" -- interesting
				keyEmojiName: "Mountain Temple Key"
			}
		],
		reactions: [
			RushingClass,
			Puri
		],
		portalLink: "https://i.imgur.com/SY0Jtnp.png",
		bossLink: ["https://i.imgur.com/TIektVi.png"],
		colors: [
			0x12634e
		]
	},
	{
		id: 15,
		dungeonName: "Lair of Draconis",
		portalEmojiID: "561248700672901120",
		keyEmojIDs: [
			{
				keyEmojID: "561248916931084320",
				keyEmojiName: "Lair of Draconis"
			}
		],
		reactions: [
			Warrior,
			Paladin,
			Bard,
			Trickster,
			Priest,
			Daze,
			Puri,
			Slow
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Consolation%20of%20Draconis%20Portal.png",
		bossLink: [
			"https://i.imgur.com/vT7wdjb.png",
			"https://i.imgur.com/jQ6IYmy.png",
			"https://i.imgur.com/RLw3xNe.png",
			"https://i.imgur.com/YdDzmMk.png",
			"https://i.imgur.com/beABgum.png"
		],
		colors: [
			0x1ec7b6,
			0x1fab46,
			0xc42727,
			0xffffff,
			0x1e1adb
		]
	},
	{
		id: 16,
		dungeonName: "Deadwater Docks",
		portalEmojiID: "561248700324773909",
		keyEmojIDs: [
			{
				keyEmojID: "561248917052850176",
				keyEmojiName: "Deadwater Docks Key"
			}
		],
		reactions: [
			RushingClass,
			Warrior,
			Paladin
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Deadwater%20Docks.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/Jon%20Bilgewater%20the%20Pirate%20King.png"],
		colors: [
			0xe4e4f5,
			0xded799
		]
	},
	{
		id: 17,
		dungeonName: "Woodland Labyrinth",
		portalEmojiID: "561248701440589824",
		keyEmojIDs: [
			{
				keyEmojID: "561248917115633667",
				keyEmojiName: "Woodland Labyrinth Key"
			}
		],
		reactions: [
			RushingClass,
			Paralyze
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Woodland%20Labyrinth.png",
		bossLink: [
			"https://static.drips.pw/rotmg/wiki/Enemies/Epic%20Larva.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Epic%20Mama%20Megamoth.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Murderous%20Megamoth.png"
		],
		colors: [
			0x31d43c,
			0x3eb847
		]
	},
	{
		id: 18,
		dungeonName: "Crawling Depths",
		portalEmojiID: "561248701591322644",
		keyEmojIDs: [
			{
				keyEmojID: "561248917052719104",
				keyEmojiName: "Crawling Depths Key"
			}
		],
		reactions: [
			RushingClass,
			Paralyze
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/The%20Crawling%20Depths.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/Son%20of%20Arachna.png"],
		colors: [
			0x3eb847,
			0x1dcf2a
		]
	},
	{
		id: 19,
		dungeonName: "Ocean Trench",
		portalEmojiID: "561248700601466891",
		keyEmojIDs: [
			{
				keyEmojID: "561248917048655882",
				keyEmojiName: "Ocean Trench Key"
			}
		],
		reactions: [
			RushingClass,
			Warrior,
			Paladin,
			Knight,
			Bard,
			ArmorBreak,
			Daze
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Ocean%20Trench%20Portal.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/Thessal%20the%20Mermaid%20Goddess.png"],
		colors: [
			0x25c1cc,
			0x188ec4,
			0xd41c78
		]
	},
	{
		id: 20,
		dungeonName: "Ice Cave",
		portalEmojiID: "561248701276880918",
		keyEmojIDs: [
			{
				keyEmojID: "561248916620967949",
				keyEmojiName: "Ice Cave Key"
			}
		],
		reactions: [
			Priest,
			Bard
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Ice%20Cave%20Portal.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/ic%20Esben%20the%20Unwilling.png"],
		colors: [
			0x2491b3,
			0xe1f0f5,
			0x79c7e0
		]
	},
	{
		id: 21,
		dungeonName: "Tomb of the Ancients",
		portalEmojiID: "561248700723363860",
		keyEmojIDs: [
			{
				keyEmojID: "561248916822163487",
				keyEmojiName: "Tomb of the Ancients"
			}
		],
		reactions: [
			RushingClass,
			Warrior,
			Paladin,
			Knight,
			Trickster,
			Paralyze,
			Bard
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Tomb%20of%20the%20Ancients%20Portal.png",
		bossLink: [
			"https://i.imgur.com/phgo7.png",
			"https://i.imgur.com/UQ033.png",
			"https://i.imgur.com/aAhbT.png"
		],
		colors: [
			0xebed55,
			0xc7c91c,
			0x28b84c,
			0x17adab
		]
	},
	{
		id: 22,
		dungeonName: "Lair of Shaitan",
		portalEmojiID: "561248700828090388",
		keyEmojIDs: [
			{
				keyEmojID: "561248917191131152",
				keyEmojiName: "Lair of Shaitan"
			}
		],
		reactions: [
			Warrior,
			Paladin,
			Knight,
			Samurai,
			Priest,
			Bard,
			Puri,
			Daze,
			ArmorBreak
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Lair%20of%20Shaitan%20Portal.png",
		bossLink: ["https://i.imgur.com/azzD6jD.png"],
		colors: [
			0xd92130,
			0xe0912f
		]
	},
	{
		id: 23,
		dungeonName: "Puppet Master's Encore",
		portalEmojiID: "561248700723101696",
		keyEmojIDs: [
			{
				keyEmojID: "561248917082079252",
				keyEmojiName: "Puppet Master's Encore Key"
			}
		],
		reactions: [
			Warrior,
			Paladin,
			Samurai,
			Priest,
			Bard,
			Puri,
			Paralyze,
			Daze
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Puppet%20Encore%20Portal.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/Puppet%20Master%20v2.png"],
		colors: [
			0x912121
		]
	},
	{
		id: 24,
		dungeonName: "Cnidarian Reef",
		portalEmojiID: "561250455284350998",
		keyEmojIDs: [
			{
				keyEmojID: "561251664388947968",
				keyEmojiName: "Cnidarian Reef Key"
			}
		],
		reactions: [
			Warrior,
			Paladin,
			Bard,
			Samurai,
			BrainPrism,
			Slow,
			Daze
		],
		portalLink: "https://i.imgur.com/qjd04By.png",
		bossLink: ["https://i.imgur.com/BF2DclQ.png"],
		colors: [
			0xf5b120,
			0x1980a6
		]
	},
	{
		id: 25,
		dungeonName: "Secluded Thicket",
		portalEmojiID: "561248701402578944",
		keyEmojIDs: [
			{
				keyEmojID: "561248917208039434",
				keyEmojiName: "Secluded Thicket Key"
			}
		],
		reactions: [
			Warrior,
			Paladin,
			Bard,
			Samurai,
			Priest,
			Slow,
			Daze
		],
		portalLink: "https://i.imgur.com/8vEAT8t.png",
		bossLink: [
			"https://i.imgur.com/2zBZOj0.png",
			"https://i.imgur.com/5quZEAa.png",
			"https://i.imgur.com/xFWvgyV.png"
		],
		colors: [
			0x289e67,
			0x14a341
		]
	},
	{
		id: 26,
		dungeonName: "Battle for the Nexus",
		portalEmojiID: "561248700588883979",
		keyEmojIDs: [
			{
				keyEmojID: "561248916570505219",
				keyEmojiName: "Battle for the Nexus Key"
			}
		],
		reactions: [
			Knight,
			Paladin,
			Warrior,
			Bard,
			Priest,
			Trickster
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Battle%20Nexus%20Portal.png",
		bossLink: [
			"https://static.drips.pw/rotmg/wiki/Enemies/Lord%20Ruthven.png",
			"https://i.imgur.com/e4u7pT5.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Archdemon%20Malphas%20Deux.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Stheno%20the%20Snake%20Queen%20Deux.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/NM%20Green%20Dragon%20God.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Oryx%20the%20Mad%20God%202.png"],
		colors: [
			0xdfe30e,
		]
	},
	{ // TODO: update emojis
		id: 27,
		dungeonName: "Belladonna's Garden",
		portalEmojiID: "561248700693741569",
		keyEmojIDs: [
			{
				keyEmojID: "561248916830552067",
				keyEmojiName: "Belladonna's Garden Key"
			}
		],
		reactions: [
			Warrior,
			Paladin,
			Bard,
			Priest,
			Puri
		],
		portalLink: "https://i.imgur.com/VTXGPSy.png",
		bossLink: ["https://i.imgur.com/d7xzYLG.png"],
		colors: [
			0xd42c56,
			0x08d41d
		]
	},
	{
		id: 28,
		dungeonName: "Ice Tomb",
		portalEmojiID: "561248700270116869",
		keyEmojIDs: [
			{
				keyEmojID: "561248917082079272",
				keyEmojiName: "Ice Tomb Key"
			}
		],
		reactions: [
			Warrior,
			Paladin,
			Knight,
			Trickster,
			Paralyze,
			Bard
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Ice%20Tomb%20Portal.png",
		bossLink: [
			"https://static.drips.pw/rotmg/wiki/Enemies/Ice%20Tomb%20Defender.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Ice%20Tomb%20Support.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Ice%20Tomb%20Attacker.png"
		],
		colors: [
			0x1ab8b5,
			0x23deda
		]
	},
	{
		id: 29,
		dungeonName: "Mad God Mayhem",
		portalEmojiID: "561248700647604227",
		keyEmojIDs: [
			{
				keyEmojID: "561248917069496341",
				keyEmojiName: "Mad God Mayhem Key"
			}
		],
		reactions: [],
		portalLink: "https://i.imgur.com/jnHUonE.gif",
		bossLink: [
			"https://static.drips.pw/rotmg/wiki/Enemies/DS%20Gulpord%20the%20Slime%20God.png",
			"https://i.imgur.com/kk4AcxG.png",
			"https://i.imgur.com/prGMIfR.png",
			"https://i.imgur.com/zodPEFO.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Puppet%20Master%20v2.png",
			"https://i.imgur.com/Hn5Ugix.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/Pentaract%20Tower%20Ultra.png"
		],
		colors: [
			0x13a813,
			0x2a852a
		]
	},
	{
		id: 30,
		dungeonName: "Shatters",
		portalEmojiID: "561744041532719115",
		keyEmojIDs: [
			{
				keyEmojID: "561744174152548374",
				keyEmojiName: "Shatters Key"
			}
		],
		reactions: [
			RushingClass,
			Warrior,
			Knight,
			Samurai,
			Paladin,
			Priest,
			Mystic,
			Bard,
			Trickster,
			ArmorBreak,
			BrainPrism,
			Daze
		],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/The%20Shatters.png",
		bossLink: [
			"https://static.drips.pw/rotmg/wiki/Enemies/shtrs%20Bridge%20Sentinel.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/shtrs%20Twilight%20Archmage.png",
			"https://static.drips.pw/rotmg/wiki/Enemies/shtrs%20The%20Forgotten%20King.png"
		],
		colors: [
			0x137d13,
			0x054205
		]
	},
	{
		id: 31,
		dungeonName: "Machine",
		portalEmojiID: "572596351204982784",
		keyEmojIDs: [
			{
				keyEmojID: "572596041526804500",
				keyEmojiName: "Machine Key"
			}
		],
		reactions: [],
		portalLink: "https://i.imgur.com/0PyfYHr.png",
		bossLink: ["https://i.imgur.com/DXIpAWm.png"],
		colors: [
			0x2ade2a,
			0x0ffc0f
		]
	},
	{
		id: 32,
		dungeonName: "Nest",
		portalEmojiID: "585617025909653524",
		keyEmojIDs: [
			{
				keyEmojID: "585617056192266240",
				keyEmojiName: "Nest Key"
			}
		],
		reactions: [
			Warrior,
			Paladin,
			Knight,
			Daze,
			Mystic,
			Priest
		],
		portalLink: "https://i.imgur.com/WQ95Y0j.png",
		bossLink: [
			"https://i.imgur.com/hUWc3IV.png",
			"https://i.imgur.com/Hn5Ugix.png"
		],
		colors: [
			0xed9121,
			0x18c7db,
			0xe3e019,
			0xbd0d30
		]
	},
	{
		id: 33,
		dungeonName: "Cursed Library",
		portalEmojiID: "576610298262454316",
		keyEmojIDs: [
			{
				keyEmojID: "576610460690939914",
				keyEmojiName: "Cursed Library Key"
			}
		],
		reactions: [
			RushingClass
		],
		portalLink: "https://cdn.discordapp.com/attachments/561245975767941120/576610932126515211/LibCursed.gif",
		bossLink: [
			"https://i.imgur.com/DfhWagx.png",
			"https://i.imgur.com/62cghXt.png"
		],
		colors: [
			0x1b8094
		]
	},
	{
		id: 34,
		dungeonName: "Cultist Hideout",
		portalEmojiID: "585613559254482974",
		keyEmojIDs: [
			{
				keyEmojID: "585613660878274571",
				keyEmojiName: "Lost Halls Key"
			}
		],
		reactions: [
			Paladin,
			Warrior,
			Knight,
			RushingClass,
			Trickster,
			Priest,
			Bard,
			Daze,
			MSeal,
			Puri,
			BrainPrism
		],
		portalLink: "https://i.imgur.com/on1ykYB.png",
		bossLink: [
			"https://i.imgur.com/MgFBfJp.png",
			"https://i.imgur.com/eaW9gou.png",
			"https://i.imgur.com/f3SgbCI.png",
			"https://i.imgur.com/oY8zTM2.png",
			"https://i.imgur.com/VpVMTbl.png",
			"https://i.imgur.com/SYTQc3B.png",
			"https://i.imgur.com/bWCxTDu.png",
			"https://i.imgur.com/28HkqUS.png"
		],
		colors: [
			0xcf0c16,
			0x8110c7,
			0xd3d61c,
			0x18adb5,
			0xebf2f2
		]
	},
	{
		id: 35,
		dungeonName: "Void",
		portalEmojiID: "612336193761443900",
		keyEmojIDs: [
			{
				keyEmojID: "585613660878274571",
				keyEmojiName: "Lost Halls Key"
			},
			{
				keyEmojID: "714012990873272321",
				keyEmojiName: "Vial of Pure Darkness"
			}
		],
		reactions: [
			Paladin,
			Warrior,
			Knight,
			RushingClass,
			Trickster,
			Priest,
			Bard,
			MSeal,
			Puri,
			BrainPrism
		],
		portalLink: "https://i.imgur.com/uhDj0M5.png",
		bossLink: ["https://i.imgur.com/kbzthE4.png"],
		colors: [
			0x0810ff
		]
	},
	{
		id: 36,
		dungeonName: "Fungal Cavern",
		portalEmojiID: "609078085945655296",
		keyEmojIDs: [
			{
				keyEmojID: "609078341529632778",
				keyEmojiName: "Fungal Cavern Key"
			}
		],
		reactions: [
			Warrior,
			Paladin,
			Knight,
			Trickster,
			Priest,
			Bard,
			ArmorBreak,
			Daze,
			MSeal,
			Slow,
			BrainPrism
		],
		portalLink: "https://i.imgur.com/fHNesPK.png",
		bossLink: [
			"https://i.imgur.com/5fsTTjQ.png",
			"https://i.imgur.com/ipkXOvt.png",
			"https://i.imgur.com/KNo6oqA.png",
			"https://i.imgur.com/0aRxp9Q.png",
			"https://i.imgur.com/CdoztOb.png",
			"https://i.imgur.com/qc1soWS.png",
			"https://i.imgur.com/kC1mFqy.png"
		],
		colors: [
			0xd9360d,
			0x15a8b0,
			0x24a353,
			0xc71c91
		]
	},
	{
		id: 37,
		dungeonName: "Miscellaneous Dungeon",
		portalEmojiID: "574080648000569353",
		keyEmojIDs: [
			{
				keyEmojID: "572596041526804500",
				keyEmojiName: "Miscellaneous Key"
			}
		],
		reactions: [],
		portalLink: "https://static.drips.pw/rotmg/wiki/Environment/Portals/Pirate%20Cave%20Portal.png",
		bossLink: ["https://static.drips.pw/rotmg/wiki/Enemies/Dreadstump%20the%20Pirate%20King.png"],
		colors: [
			0x1dbfaa
		]
	},
	{
		id: 38,
		dungeonName: "Oryx 3",
		portalEmojiID: "711426860051071067",
		keyEmojIDs: [
			{
				keyEmojID: "708191799750950962",
				keyEmojiName: "Wine Cellar Incantation"
			},
			{
				keyEmojID: "737672554482761739",
				keyEmojiName: "Sword Rune"
			},
			{
				keyEmojID: "737672554642276423",
				keyEmojiName: "Shield Rune"
			},
			{
				keyEmojID: "737673058722250782",
				keyEmojiName: "Helmet Rune"
			}
		],
		reactions: [
			Paladin,
			Knight,
			Warrior,
			Priest,
			Trickster,
			Bard,
			BrainPrism,
			Puri,
			Slow,
			ArmorBreak,
			SnakeOilEmoji
		],
		portalLink: "https://i.imgur.com/nKKvJsv.png",
		bossLink: [
			"https://media.discordapp.net/attachments/561246036870430770/708192230468485150/oryx_3_w.png",
			"https://media.discordapp.net/attachments/561246036870430770/708192231449690172/oryx_3_b.png",
			"https://media.discordapp.net/attachments/561246036870430770/708192325842763836/OryxUnknownAnim.gif",
			"https://media.discordapp.net/attachments/561246036870430770/708192326320783410/oryxSanctuaryObjects16x16_5gif.gif"
		],
		colors: [
			0xb5471b,
			0x000000
		]
	}
];
// max ID: 40 -- heroic abyss