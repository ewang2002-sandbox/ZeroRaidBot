# ZeroRaidBot ⇒ Setup
The following is a setup guide for this bot. Steps here are most likely incomplete and will be completed in the near future.

## Requirements
- [discord.js](https://discord.js.org/#/)
- [axios](https://www.npmjs.com/package/axios)
- [MongoDB](https://www.mongodb.com/)

## Installation Guide
**Creating the Bot Application**
1. Head over [here](https://discordapp.com/developers/applications/) and click "New Application."
2. Configure the bot's name, profile picture, and description.
3. Go to `Bot` and click `Add Bot`. Then, click `Yes, do it!` to the prompt.
4. Configure your bot's username.
5. Right below `TOKEN`, click `Copy`. Keep this token in a safe place and DO NOT GIVE THIS TOKEN TO OTHER PEOPLE.
6. Go back to the Developer page and go to the `OAuth` tab. Under `SCOPES`, check `bot`. Then, under `BOT PERMISSIONS`, check `Administrator`. After you did this, copy the invite link. This is how you will invite the bot.

**MongoDB Configuration**

For the purpose of this guide, I will be using a free service online. 
1. Head over to the official MongoDB website, which you can find [here](https://www.mongodb.com/).
![Step 1](https://github.com/DungeoneerExalt/ZeroRaidBot/blob/master/md_img/1.PNG)
2. Click on "Start free." Create a new account.
3. Now, click "Create a cluster" (below the free tier).
![Step 3](https://github.com/DungeoneerExalt/ZeroRaidBot/blob/master/md_img/2.PNG)
4. Configure the `Cloud Provider` & Region and `Cluster Name`. Leave `Cluster Tier` and `Additional Settings` alone as you may have to pay. 
	- For `Cloud Provider`, pick the region that is closest to your general location. 
	- For `Cluster Name`, please pick a name that you don't mind using forever. For the purpose of this guide, I will name the cluster `DiscordBot`. 
![Step 4](https://github.com/DungeoneerExalt/ZeroRaidBot/blob/master/md_img/3.PNG)
5. Click `Create Cluster`. 
6. You should be presented with a Control Panel-like interface. First, let's begin by making sure you can access the database. Go to `Network Access`. 
![Step 6](https://github.com/DungeoneerExalt/ZeroRaidBot/blob/master/md_img/4.PNG)
7. Let's add an IP address. Click `Add IP Address`.
8. Select `ALLOW ACCESS FROM ANYWHERE`. Then, click `Confirm`. 
![Step 8](https://github.com/DungeoneerExalt/ZeroRaidBot/blob/master/md_img/5.PNG)
9. Now, let's move on to making a new user. Go to `Database Access`. Then, click `Add New Database User`. 
![Step 9](https://github.com/DungeoneerExalt/ZeroRaidBot/blob/master/md_img/6.PNG)
10. Create a new account by typing a username and password. In my case, I will do `raidbot` as my username.
	- Make sure this user can read and write to any database (below `Database User Privileges`). 
![Step 10](https://github.com/DungeoneerExalt/ZeroRaidBot/blob/master/md_img/7.PNG)
11. Go back to `Clusters`. Then, below your cluster, click `CONNECT`. 
![Step 11](https://github.com/DungeoneerExalt/ZeroRaidBot/blob/master/md_img/8.PNG)
12. A popup should show up with the title `Connect to <Cluster Name>`, where `<Cluster Name>` is the name of the cluster that you specified in step 4. Click `Connect your application`. 
![Step 12](https://github.com/DungeoneerExalt/ZeroRaidBot/blob/master/md_img/9.PNG)
13. Your `DRIVER` should be `Node.js` and your `VERSION` should be the latest. 
	- Copy the connection string.
	- Once you are done, click `Close`. 
![Step 13](https://github.com/DungeoneerExalt/ZeroRaidBot/blob/master/md_img/10.PNG)
14. Your connection string is going to look something like this: `mongodb+srv://raidbot:<password>@discordbot.ghgy8.mongodb.net/<dbname>?retryWrites=true&w=majority`.
	- You will be removing everything past `.net/` (or something equivalent). In other words, remove `<dbname>` and anything past it. In our case, the connection string will look like this: `mongodb+srv://raidbot:<password>@discordbot.ghgy8.mongodb.net/`. **Keep the `/`**. 
15.  With your connection string, replace `<password>` with the password specified in step 10.
	- For example, if my password is `1234`, my connection string would look like this: `mongodb+srv://raidbot:1234@discordbot.ghgy8.mongodb.net/`.
15. Head over to the next section! Note that I'll be using my examples here in the `Getting the Bot Files` section. 

**Download Node.JS**
- Download Node.JS from https://nodejs.org/en/. 
- Go with the LTS download. 
- Follow all directions with installation. 

**Getting the Bot Files**
1. Download or clone this repository. To make it easier, click `Clone or download` to open a dropdown menu. Then, click `Donwload ZIP`. Extract the downloaded files.
2. In the root directory (where the `src` folder and `package.json` file exists) of the bot files, open your terminal or command prompt and run `npm i`. This will install all required dependencies.
3. Look for the folder containing the code. Go to the bot's configuration folder ("./src/Configuration") and look for the `Config.Example.ts` file. Fill out all applicable information there. Rename the file to `Config.ts`. 
	- See the `Config.Example.ts` file for more information. 
	- Using the example from `MongoDB Configuration`, and assuming we want to name our database `rotmgbot`, our configuration file will look something like this:
```
export const BotConfiguration: IConfigurationSettings = PRODUCTION_BOT
    ? {
        token: "9-0i4c23jmur3w9e039wef04e3irfem,te0t", 
        dbURL: "mongodb+srv://raidbot:1234@discordbot.ghgy8.mongodb.net/",
        dbName: "rotmgbot",
        userCollectionName: "",
        guildCollectionName: "",
        botCollectionName: "",
        botOwners: [],
        botColors: []
    } : {
        token: "",
        dbURL: "",
        dbName: "",
        userCollectionName: "",
        guildCollectionName: "",
        botCollectionName: "",
        botOwners: [],
        botColors: []
    };
```
4. Now, head over to `./src/Constants/AFKDungeon.ts`. This file contains all of the dungeons that the bot currently supports. For each element (dungeon data), change the value of `portalEmojiID` to the ID of the emoji of the dungeon's portal (you will need to add your own emojis on your own server). You also want to go to `keyEmojIDs`, and for each element in this array, change the value of `keyEmojID` to the ID of the dungeon key. FAILURE TO DO THIS WILL RESULT IN ERRORS! 
5. In your terminal or command prompt, run `npm run start`. This will compile and, hopefully, run the file.