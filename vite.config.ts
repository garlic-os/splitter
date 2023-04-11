import fs from "node:fs";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, type UserConfig } from "vite";
import * as Config from "./config";


const viteConfig: UserConfig = {
	plugins: [sveltekit()],
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
		port: 80
	}
};

viteConfig.server = viteConfig.server ?? {};

if (Config.sslKeyPath && Config.sslCertPath) {
	viteConfig.server.https = {
		key: fs.readFileSync(Config.sslKeyPath),
		cert: fs.readFileSync(Config.sslCertPath)
	};
	viteConfig.server.port = 443;
}

export default defineConfig(viteConfig);
