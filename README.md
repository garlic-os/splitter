# Splitter
<!-- Invite link here eventually -->
[Project progress](https://github.com/users/garlic-os/projects/4/views/1?query=is%3Aopen+sort%3Aupdated-desc&layout=board)

Splitter lets you upload big files to Discord.  
Unlike third-party file-sharing services (Google Drive, file.io, etc.), Splitter integrates with Discord to make it seamless and free forever.

1. **Nearly everything happens from within Discord.** Start in Discord, upload your file in the minimal webapp, then go right back.
2. **No extra accounts.** You're already logged into Discord and that's good enough!
3. **Your files stay on Discord.** Behind the scenes, Splitter _splits_ large files and stores them on Discord in chunks.
4. **It's free.** No Nitro, no storage fees, no subscription.

## Getting started
Once Splitter is closer to completion I'll have an instance running for you to invite to your own servers. For now if you want to try it out you will have to host your own instance.

## Host your own instance
Splitter runs on [Bun](https://bun.sh/).

To install your dependencies and add Splitter's slash commands to its bot account:
```bash
$ bun install
$ bun --bun run register-commands
```

### Development
```bash
$ bun --bun run dev -- --open
```
_(A quirk in Vite makes it so you have to open the webapp once for the bot to start while in dev mode)_

### Production
```bash
$ bun --bun run host
```


---
Upload icon from [visualpharm.com](https://www.visualpharm.com/)  
Scissors icon from [svgrepo.com](https://www.svgrepo.com/svg/479957/scissors)
