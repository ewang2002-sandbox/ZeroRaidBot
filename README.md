# ZeroRaidBot
An open-source [Realm of the Mad God](https://www.realmofthemadgod.com/) (RotMG) Discord Bot designed for cross-server verification, moderation, and raid management.

## Purpose
The main purpose of this bot is to simplify verification and raid management within the the [Dungeoneer Exalt Discord server](https://discord.com/invite/o3). This bot, which represents a huge overhaul of the original Dungeoneer bot, is designed to be easier to use for everyone. 

## Technologies
- [TypeScript](https://www.typescriptlang.org/)
- [Node.JS](https://nodejs.org/en/)
- [MongoDB](https://www.mongodb.com/)

## Requirements (Latest Version)
- [discord.js](https://discord.js.org/#/)
- [axios](https://www.npmjs.com/package/axios)
- [MongoDB](https://www.mongodb.com/)

## APIs Used
- [RealmEye API](https://github.com/Nightfirecat/RealmEye-API)
    - A private instance of this API is being used for the private version of the bot. 

## Current Features

<details>
<summary>Click Here</summary>
<br>
  
Some of the bot's more prominent features include the following.
- **Verification:** Using a public API, the bot is able to get informaton about a RotMG player and is able to link a Discord account to a RotMG account. Verification requirements can be customized to suit your server's needs.
- **Raid Management:** The ability for raid leaders to start AFK checks and headcounts for various dungeons, including Lost Halls, Shatters, Oryx 3, and 30 other dungeons. As opposed to having 5+ different comments, raid leaders will use a control panel to access all commands and information about a raid. 
- **Customization:** Server administrators are able to customize channels and roles according to their needs through the Configure Section command.
- **Sections:** Server administrators are able to set up sections. Sections are essentially "parts" of a server with separate (from the main server) verification requirements, roles, channels, and permitted dungeons (that a leader can run). You can have up to 8 sections
- **Moderation:** This bot includes simple moderation commands such as mute, suspend, and blacklist. I plan on adding a warning system later. The idea behind not adding a full-blown moderation system is that there are other bots that can do that better (like Dyno).
- **Logging/Quota System:** Leaders are able to log the dungeons that they have completed. Furthermore, leaders can log key pops, giving the players that contribute keys credit. There is also a quota system that administrators can set up to ensure all leaders are doing the requirement number of runs. 
- **User/Member Manager**: Every person is given a profile (one person = one Discord account). Within a profile, the person can add alternative accounts, and can make minor changes to their profile. 
- **Moderation Mail**: A simple-to-use moderation mail system! Members can simply DM this bot their message and the bot will direct it to the appropriate place.
- **Application System**: Imagine using a Google Forms for your Trial Raid Leader applications. This bot has its own application system, where Head Leaders can put up to 35 questions. The bot will record how long they take to respond to each answer, giving you an idea of how much effort they put.
</details>

## Project Layout
- [`master`](https://github.com/DungeoneerExalt/ZeroRaidBot/tree/master) - The developer's branch. Incomplete, unstable, and untested code will live here. 
- [`stable`](https://github.com/DungeoneerExalt/ZeroRaidBot/tree/stable) - Safe for production code. Code that is *generally* tested will live here. 
- [`preview`](https://github.com/DungeoneerExalt/ZeroRaidBot/tree/preview) - Similar to the `master` branch, but code that is in this branch should be able to compile. This branch contains preview features (testing features) that will probably make it to the `stable` branch. 

**NOTE:** If you intend on self-hosting, please read the link in `Setup Guide`. There is some important information.

## Setup Guide
Please read this [first](https://github.com/DungeoneerExalt/ZeroRaidBot/blob/master/md_img/AGREEMENT.md). Once you do, there will be instructions on how to set this project up.

## Support the Project
The best way to support this project is to star (⭐) it. Stars make me happy. 

Additionally, if you host your own instance of this bot and someone asks where they can get their own instance of this bot, tell them about this Github. :)

## Similar Projects
- [Ooga-Booga](https://github.com/Jacobvs/Rotmg-Discord-Bot) by [Darkmattr](https://github.com/Jacobvs). 

## License
Please review the license file in this repository.