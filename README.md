# Splitter
[Project progress](https://github.com/users/garlic-os/projects/4/views/1?query=is%3Aopen+sort%3Aupdated-desc&layout=board)

Splitter is a Discord bot that offers one utility: upload files larger than the server's file size limit.
There are plenty of ways to do this already: split it with 7-Zip and upload the several chunks one at a time, or just upload it somewhere else then post the link, etc. But all the solutions out there make it a fair bit more complicated for you and/or whoever wants to open it than if it were just a regular file in Discord.

Splitter aims to provide a standard way for users to do this on Discord as easily as possible.
With Splitter,
1. You don't split files yourself. Splitter splits them for you and uploads the chunks to Discord in the background.
2. You don't need to paste a download link. When the upload is done, the link is posted for you.
3. You barely need to leave Discord at all. Start in Discord, click your link and upload to Splitter's minimal webapp, then go right back to Discord.
4. When someone wants to download your file, they click the link, the webapp reconstitutes the file, and it shows up in the browser.

Splitter aims to make the experience as close as can be to just uploading any regular file to Discord. Except your file can be ten gigabytes.

## Setup
Install your dependencies with `npm install` (or `pnpm install` or `yarn`), then register the bot's slash commands:
```bash
npm run register-commands
```
You only need to register the slash commands once per bot account.

## Development
```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```
When in dev mode, a quirk in Vite makes it so you have to open the webapp once for the bot to start.

## Production
```bash
npm run host
```

Public bot instance coming maybe?

---
Upload icon from [visualpharm.com](https://www.visualpharm.com/)  
Scissors icon from [svgrepo.com](https://www.svgrepo.com/svg/479957/scissors)
