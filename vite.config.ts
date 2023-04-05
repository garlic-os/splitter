import fs from "node:fs";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, type UserConfigExport } from "vite";
import * as Config from "./config";


const viteConfig: UserConfigExport = {
	plugins: [sveltekit()],
};


if (Config.sslKeyPath && Config.sslCertPath) {
	viteConfig.server = {
		https: {
			key: fs.readFileSync(Config.sslKeyPath),
			cert: fs.readFileSync(Config.sslCertPath),
		},
	};
}


export default defineConfig(viteConfig);
