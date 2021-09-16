# ZeroRaidBot
An open-source [Realm of the Mad God](https://www.realmofthemadgod.com/) (RotMG) Discord Bot designed for cross-server verification, moderation, and raid management.

## Notice
With numerous API changes that are soon about to be made on Discord's side, along with the lack of maintainability of this project, I have decided to put this project in maintenance mode with the intention of shutting *this* project down. I will only provide critical fixes as needed. 

ZeroRaidBot's rewrite (i.e ZeroRaidBot 2.0) is almost complete. After I finish a few things, the rewrite will be ready for testing. Once the testing period is over, the bot will be released for production use and its repository will be public. 

**As such, unless significant issues arise, this repository will be archived on the 30th of September. The official instance of Zero will be turned off on the 30th of September.**


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
- [RealmEyeSharper](https://github.com/ewang2002/RealmEyeSharper/)
    - An ASP.NET Core API that scrapes RealmEye and also provides some basic parsing support.

## Current Features

<details>
<summary>Click Here</summary>
<br>
  
Some of the bot's features include, but aren't limited to, the following.
- **Verification:** Using a public API, the bot is able to get informaton about a RotMG player and is able to link a Discord account to a RotMG account. Verification requirements can be customized to suit your server's needs.
- **Raid Management:** The ability for raid leaders to start AFK checks and headcounts for various dungeons, including Lost Halls, Shatters, Oryx 3, and 30 other dungeons. As opposed to having 5+ different comments, raid leaders will use a control panel to access all commands and information about a raid. 
- **Customization:** Server administrators are able to customize channels and roles according to their needs through the Configure Section command.
- **Sections:** Server administrators are able to set up sections. Sections are essentially "parts" of a server with separate (from the main server) verification requirements, roles, channels, and permitted dungeons (that a leader can run). You can have up to 8 sections
- **Moderation:** This bot includes simple moderation commands such as mute, suspend, and blacklist. I plan on adding a warning system later. The idea behind not adding a full-blown moderation system is that there are other bots that can do that better (like Dyno).
- **Logging/Quota System:** Leaders are able to log the dungeons that they have completed. Furthermore, leaders can log key pops, giving the players that contribute keys credit. There is also a quota system that administrators can set up to ensure all leaders are doing the requirement number of runs. 
- **User/Member Manager**: Every person is given a profile (one person = one Discord account). Within a profile, the person can add alternative accounts, and can make minor changes to their profile. 
- **Moderation Mail**: A simple-to-use moderation mail system! Members can simply DM this bot their message and the bot will direct it to the appropriate place.
</details>

## Project Layout
- [`master`](https://github.com/DungeoneerExalt/ZeroRaidBot/tree/master) - The developer's branch. Incomplete, unstable, and untested code will live here. 
- [`stable`](https://github.com/DungeoneerExalt/ZeroRaidBot/tree/stable) - Safe for production code. Code that is *generally* tested will live here. 
- [`preview`](https://github.com/DungeoneerExalt/ZeroRaidBot/tree/preview) - Similar to the `master` branch, but code that is in this branch should be able to compile. This branch contains preview features (testing features) that will probably make it to the `stable` branch. 

**NOTE:** If you intend on self-hosting, please read the link in `Setup Guide`.

## Setup Guide
A setup guide can be foud [here](https://github.com/DungeoneerExalt/ZeroRaidBot/blob/master/md_img/SETUP.md). If you need more help, please submit a Github issue.

## Support the Project
The best way to support this project is to star (⭐) it. Stars make me happy. 

## Similar Projects
These projects all serve very similar purposes to Zero. You may find them to be just as good or even better than what I have to offer.

- [Ooga-Booga](https://github.com/Jacobvs/Rotmg-Discord-Bot) by [Darkmattr](https://github.com/Jacobvs). 
- [GalaxyRaider](https://github.com/theurul/GalaxyRaider) by [theurul](https://github.com/theurul).
- [IrisBot](https://github.com/flanigana/IrisBot) by [flanigana](https://github.com/flanigana).

## License
MIT License.