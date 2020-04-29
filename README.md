# Zero
⚠️ Yes, I deleted the bot's original repository -- the one with 100+ commits -- because I might have accidently uploaded some sensitive information. Sorry about that.

A [Realm of the Mad God](https://www.realmofthemadgod.com/) Discord Bot designed for verification, moderation, and raid management.

Looking through the internet, I was unable to find many open source RotMG Discord bots related to raid management; however, there are numerous raid management bots out there -- most of them, superior to mine -- that are not open source. 

This project is centered around a few major goals.
- Clear, concise, and complete documentation: To ensure the intent and purpose of various functions, constants, and properties are clear.
- Fast, efficient, and easy-to-use: To ensure the bot will not only be good at what it does, but also easy for server owners to configure.
- Unique: To ensure the bot stands out from the crowd.

I hope to make a bot that is not only efficient and good at its job, but also open source so the community can contribute to its development. 

## Purpose
The main purpose of this bot is for the Dungeoneer Exalt Discord server, where I will be the co-owner and Administrator. This server is a complete rework of the original Dungeoneer server. 

I am working very closely with both the server's other co-owner and staff members. REMEMBER that this bot was created in mind for a particular server -- the Dungeoneer Exalt server. This server is also being created under the assumption that there will be a network; that is, a group of servers under one or more owner(s) working together towards a common goal.

THEREFORE, there will be no official public version of this bot.

## Project Layout
For this repository, the `master` branch is the developer's branch. In other words, the branch where unstable code -- code that either won't compile, has numerous errors, is incomplete, etc. -- will be pushed. 

The `stable` branch is where code that generally has no errors will reside. The code in the `stable` branch have been tested so there should not be any errors. NOTE: for the first few days this system is in place, this may not be the case; that is, code in the `stable` branch may not compile or may have runtime errors. 

## Installation Guide
**Creating the Bot Application**
1. Head over to `https://discordapp.com/developers/applications/` and click "New Application."
2. Configure the bot's name, profile picture, and description.
3. Go to `Bot` and click `Add Bot`. Then, click `Yes, do it!` to the prompt.
4. Configure your bot's username.
5. Right below `TOKEN`, click `Copy`. Keep this token in a safe place and DO NOT GIVE THIS TOKEN TO OTHER PEOPLE.
6. Go back to the Developer page and go to the `OAuth` tab. Under `SCOPES`, check `bot`. Then, under `BOT PERMISSIONS`, check `Administrator`. After you did this, copy the invite link. This is how you will invite the bot.

**MongoDB Configuration**
- You will need to configure MongoDB. More information will come later.

**Download Node.JS**
- Download Node.JS from https://nodejs.org/en/. Go with the LTS download. Follow all directions.

**Getting the Bot Files**
1. Download or clone this repository. To make it easier, click `Clone or download` to open a dropdown menu. Then, click `Donwload ZIP`. Extract the downloaded files.
2. In the root directory (where the `src` folder and `package.json` file exists) of the bot files, open your terminal or command prompt and run `npm i`. This will install all required dependencies.
3. Look for the folder containing the code. Go to the bot's configuration folder ("./src/Configuration") and look for the `Config.Example.ts` file. Fill out all applicable information there.
4. Now, head over to `./src/Constants/AFKDungeon.ts`. This file contains all of the dungeons that the bot currently supports. For each element (dungeon data), change the value of `portalEmojiID` to the ID of the emoji of the dungeon's portal (you will need to add your own emojis on your own server). You also want to go to `keyEmojIDs`, and for each element in this array, change the value of `keyEmojID` to the ID of the dungeon key. FAILURE TO DO THIS WILL RESULT IN ERRORS! 
5. In your terminal or command prompt, run `npm run start`. This will compile and, hopefully, run the file.

## Support
Unfortunately, I will be providing very __limited__ support when it comes to setting up the bot. However, if there are issues with the code itself (notably, errors), or have questions in general, please feel free to open a new issue.

Please remember that this bot was created in mind for a particular server; however, this bot is cross-compatible, meaning it will work across any server(s) it is in. I will provide very limited support, if any at all, if your question in mind has to do with altering/removing a particular feature that was designed for the server.

Eventually, if the demand arises, I'll make a support server for this bot. 

## Other Stuff
This [repository](https://github.com/ewang20027/ZeroRaidBot) represents the OFFICIAL repository of Zero. All code written and published in this repository were written by me unless otherwise said. 