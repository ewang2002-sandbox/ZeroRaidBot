# ZeroRaidBot
An open-source [Realm of the Mad God](https://www.realmofthemadgod.com/) (RotMG) Discord Bot designed for cross-serververification, moderation, and raid management.

## Requirements (Latest Version)
- [discord.js](https://discord.js.org/#/)
- [axios](https://www.npmjs.com/package/axios)
- [MongoDB](https://www.mongodb.com/)

## Purpose
The main purpose of this bot is to simplify verification and raid management within the the Dungeoneer Exalt Discord server.

## Current Features
Some of the bot's more prominent features include the following.
- **Verification:** Using a public API, the bot is able to get informaton about a RotMG player and is able to link a Discord account to a RotMG account. Verification requirements can be customized.
- **Raid Management:** The ability for raid leaders to start AFK checks and headcounts for various dungeons, including Lost Halls, Shatters, Oryx 3, and 30 other dungeons. As opposed to having 5+ different comments, raid leaders will use a control panel to access all commands and information about a raid. 
- **Customization:** Server administrators are able to customize channels and roles according to their needs through the Configure Section command.
- **Sections:** Server administrators are able to set up sections. Sections are essentially "parts" of a server with separate (from the main server) verification requirements, roles, channels, and permitted dungeons (that a leader can run). You can have up to 8 sections! An example layout would be the following.
    - Main (Server)
        - Verification Requirements: 2 6/8s, 1000 Base Fame, 20 Stars.
        - Leader Roles: @Almost Raid Leader, @Raid Leader.
        - Dungeons: Any non-endgame dungeons.
    - Endgame
        - Verification Requirements: 2 8/8s, 2500 Base Fame, 50 Stars.
        - Leader ROles: @Trial Endgame Leader, @Endgame Leader
        - Dungeons: Lost Halls, Shatters, Fungal Caverns
- **Moderation:** This bot includes simple moderation commands such as mute, suspend, and blacklist. I plan on adding a warning system later. The idea behind not adding a full-blown moderation system is that there are other bots that can do that better (like Dyno).
- **Logging/Quota System:** Leaders are able to log the dungeons that they have completed. Furthermore, leaders can log key pops, giving the players that contribute keys credit. There is also a quota system that administrators can set up to ensure all leaders are doing the requirement number of runs. 
- **User/Member Manager**: Every person is given a profile (one person = one Discord account). Within a profile, the person can add or remove* alternative accounts, and can make minor changes to their profile. 


\* - This is still in beta.

## Project Layout
For this repository, the `master` branch is the developer's branch. In other words, the branch where unstable code -- code that either won't compile, has numerous errors, is incomplete, etc. -- will be pushed. 

The `stable` branch is where code that generally has no errors will reside. The code in the `stable` branch have been tested so there should not be any errors. The official, live bot will be using the code in the `stable` branch.

## Setup Guide
Please see this [guide](https://github.com/DungeoneerExalt/ZeroRaidBot/blob/master/md_img/SETUP.md).

## Support the Project
The best way to support this project is to star it. 

## License
Please review the license file in this repository.