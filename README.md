# Zero
**NOTE: This repository is a newer repository; the older one is currently not public due to some sensitive credentials being leaked (we have since changed the passwords). If you would like to view the original repository, please submit an issue. Thanks.**

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

## Use of Source Code
Since this is an open-source project, I don't generally mind, or care, about how you use this bot. However, I would *greatly* appreciate it if you used this bot in a private manner. 

I encourage you to use the bot's source code for the following:
- For the use of guild verification/runs.
- Server of friends.

I do not encourage (in fact, I will frown upon) the use of the bot's source code for the following:
- To start a public server (think Fungal, Pub Halls, Dungeoneer).

## Project Layout
For this repository, the `master` branch is the developer's branch. In other words, the branch where unstable code -- code that either won't compile, has numerous errors, is incomplete, etc. -- will be pushed. 

The `stable` branch is where code that generally has no errors will reside. The code in the `stable` branch have been tested so there should not be any errors. The official, live bot will be using the code in the `stable` branch.

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
3. Look for the folder containing the code. Go to the bot's configuration folder ("./src/Configuration") and look for the `Config.Example.ts` file. Fill out all applicable information there. Rename the file to `Config.ts`. 
4. Now, head over to `./src/Constants/AFKDungeon.ts`. This file contains all of the dungeons that the bot currently supports. For each element (dungeon data), change the value of `portalEmojiID` to the ID of the emoji of the dungeon's portal (you will need to add your own emojis on your own server). You also want to go to `keyEmojIDs`, and for each element in this array, change the value of `keyEmojID` to the ID of the dungeon key. FAILURE TO DO THIS WILL RESULT IN ERRORS! 
5. In your terminal or command prompt, run `npm run start`. This will compile and, hopefully, run the file.

## Support
I will be more than happy to help you setup the bot. However, this does come at a cost -- I would like to know how you plan on using this bot. 

Please remember that this bot was created in mind for a particular server; however, this bot is cross-compatible, meaning it will work across any server(s) it is in. I will provide very limited support, if any at all, if your question in mind has to do with altering/removing a particular feature that was designed for the server.

Eventually, if the demand arises, I'll make a support server for this bot. 

## Other Stuff
This [repository](https://github.com/DungeoneerExalt/ZeroRaidBot) represents the OFFICIAL repository of Zero. All code written and published in this repository were written by members of the [organization](https://github.com/DungeoneerExalt) unless otherwise said. 

## Support the Project
The best way to support this project is to star it! And if you'd like, submit an issue describing what you will be using the bot for. I am very interested in seeing how the community uses this bot.

## License
Copyright (c) 2020 Edward Wang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.