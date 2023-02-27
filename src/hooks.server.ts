// Start the bot immediately; it has to be up even before the first request,
// because it may well broker the first request through a /upload command.
import "$lib/server/bot";

// Start the CORS proxy for the GET /file/[fileID]/[filename] route.
import "$lib/server/cors-proxy";
