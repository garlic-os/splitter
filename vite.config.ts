import fs from "node:fs";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import * as Config from "./config";


export default defineConfig({
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
		https: Config.sslKeyPath && Config.sslCertPath ? {
			key: fs.readFileSync(Config.sslKeyPath),
			cert: fs.readFileSync(Config.sslCertPath),
		} : undefined,
	}
});
