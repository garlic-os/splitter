import fs from "node:fs";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import * as Config from "./config";


export default defineConfig({
	plugins: [sveltekit()],
	server: {
		// Bypass CORS on Discord file downloads lmao
		proxy: {
			"^/chunk/.*": {
				target: Config.webappURL,
				changeOrigin: true,
				rewrite: (path) => path.replace(
					/^.*chunk/,
					`${Config.corsProxyURL}/https://cdn.discordapp.com/attachments`
				),
			},
		},
		https: Config.sslKeyPath && Config.sslCertPath ? {
			key: fs.readFileSync(Config.sslKeyPath),
			cert: fs.readFileSync(Config.sslCertPath),
		} : undefined,
	}
});
