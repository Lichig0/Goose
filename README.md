# Goose
- [Description](#description)
    - [Origin](#origin)
    - [Evolution](#evolution)
    - [Future Ideas](#future-ideas)
- [Where does my data go?](#where-does-the-data-go)
- [Developers](#developers)
    - [Requirements](#requirements)
    - [Install](#install--setup)
---
## Description
Goose, Goose bot, Bruce, or Groose are all identities of this bot. This codebase has served bots with various identities which has left it with an identity crysis, but Goose is the OG.

### **Origin**
Goose is originially written as a utility bot for Discord for my own administration, such as kicking, auto-sending invites, "cursing" to make people unable to speak, anncouncing departures from a server, alerting of someone deleting to gas light, etc.

### **Evolution**
Goose has since evolved into a Markov chain chat bot, and functions mostly on RNG with some additions to add a little more personality and patterns of life. It has grown to have different behaviors as to what I feel like doing with it at any given time. Perhapse they can be enumerated sometime in the future.

As it is at the time of writing, it is made so that each instance has some core internal set of strings added to the corpus before fetching as much history as possible from all Discord guilds' channels as possible. Each guild has it's own corpus to not spill any data elsewhere unexpectedly. As Goose has spread to new and different servers, data collecting has become a concern, so [there is a table that describes what data/where is collected/held/stored](#data-table)

### **Future ideas?**
Some ideas I am looking to explore
- [ ] Make the chatter activity into different *cores* so different libraries or techniques can be used for the chat features. Adding "actual" machine learning to learn behaviors of a Guild, and more intelligently reply. This may be too much for a Raspberry Pi?
- [ ] Add a way to ingest text blocks as a file. Discord seems to plan to add attachments as an argument to Slash Command interactions, so pehapse wait for that.
- [ ] Separate the chatter cores/features from the commands and corpus; that way updating chat behavior and commands does not restart the entire application and restart the history reading process. Perhapse a first step for this could be live-refreshing commands?
- [ ] Make a GUI for the settings. (Maybe move them to the DB)
- [ ] Build task to minify/optimize for "prod"
---
## Where does the data go?
For the sake of privacy, everything that can sensibliy be held in memory, ~~should~~ will be. If it is not, it should be fixed. Everytime the bot gets shut down, host loses power, or even when it crashes, everything in memory has to be re-fetched from Discord Servers. Goose's knowledge of you is only a subset of what is already on Discord's servers, and less so if restricted with Guild/Role/User permisisons in any one Guild.

| Type | Location | Crosses Guilds |
|------|----------|----------------|
| Guild Chat History | Volitile Memory | False |
| Guild Emoji | Volitile Memory | **True** |
| Attachments | Volitile Memory | False |
| QDB | **Disc Storage/Sqlite** | False |
| Insults | **Disc Storage/Sqlite** | False |
| Weather (Location) | **Disc Storage/Sqlite** | **True** |
| Opt Out | **Disc Storage/Sqlite** | **True** |
---
## Developers
### Requirements
- Dependencies
    - sqlite3 3.27.2
    - NodeJS 16 (16.9.0)
        - See `package.json` for additional deps
- API Keys (*TODO: add links to sign up for tokens/keys*)
    - Discord Bot API Token
    - Twitter API key
    - Your Discord User Snowflake **(Optional)**
    - Giant Bomb Token **(Optional)**
    - OpenWeather API Token **(Optional)**
        - MapBox Token **(Required if OpenWeather is provided)**
    <!-- - Twitter Access Token -->
    <!-- - Twitter Bearer Token -->
### Install & Setup
Ceck versions match requirements above
```
node --version
```
> v16.9.0
```
sqlite3 --version
```
> 3.27.2


At the top level of the project, run:
```
npm install
```
You may run into issues with `sqlite3` in which case refer to their [documentation](#https://www.npmjs.com/package/sqlite3). You may need to install sqlite a different way, or you may need to use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to install nodejs 14

**Setup Environment**

- Setup your `.env` file with necessary tokens. [See Requrements](#requirements)

    ex:
    ```
    BOT_TOKEN=AD1SC0RDB0TTOK3N
    OWNER=123456789012345678
    GIANT_BOMB_KEY=GIANTBOMBTOKEN
    OPEN_WEATHER_TOKEN=t0k3n
    TWITTER_API_KEY=asdfASDFqwertQWERTYwasd
    TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAA
    TWITTER_ACCESS_TOKEN=987wasd654asdf321
    NODE_OPTIONS=--max-old-space-size=3840
    ```
- Copy `example_settings.json` to `settings.json`
    -Turn some knobs.
- Run code???
    - Run dev:
        - >npm run dev
    - Run not dev(but not prod):
        - >npm run start

*TODO.... validate steps above... make more friendly*

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/donate/?business=DEY2DJJ8WZ2SL&no_recurring=0&currency_code=USD&item_name=GOOSE+BOT)
