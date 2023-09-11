import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, type UserConfig } from "vite";

// Have to use regular relative path here because the dollar-sign
// shortcuts aren't loaded yet
import * as CorsProxy from "./src/lib/server/cors-proxy";

const viteConfig: UserConfig = {
	plugins: [sveltekit()],
};

Object.assign(viteConfig, CorsProxy.viteConfig);

export default defineConfig(viteConfig);
