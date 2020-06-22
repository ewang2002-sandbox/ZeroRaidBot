# ZeroRaidBot ⇒ Setup
The following is a setup guide for this bot. Steps here are most likely incomplete and will be completed in the near future.

## Requirements
- [discord.js](https://discord.js.org/#/)
- [axios](https://www.npmjs.com/package/axios)
- [MongoDB](https://www.mongodb.com/)

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