import type { UserConfig } from "vite";

// Have to use normal relative paths here because this file is loaded
// by vite.config.ts before the $config shortcut is loaded.
import * as Config from "../../../config";


export const viteConfig: UserConfig = {
	server: {
		// Bypass CORS on Discord's CDN lmao
		proxy: {
			"^/chunk/.*": {
				target: "https://cdn.discordapp.com",
				changeOrigin: true,
				rewrite: (path) => path.replace(
					"chunk",
					"attachments"
				)
			},
		},
	}
};

if (Config.sslKeyPath && Config.sslCertPath) {
	viteConfig.server!.https = {
		key:  await Bun.file(Config.sslKeyPath).text(),
		cert: await Bun.file(Config.sslCertPath).text(),
	};
	console.debug("Using HTTPS");
} else {
	console.debug("Using HTTP");
}
