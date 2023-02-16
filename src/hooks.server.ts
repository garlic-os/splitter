// Initialize these modules immediately; do not wait for the web app to
// lazy load them.
import "$lib/server/database";
import "$lib/server/bot";
import "$lib/server/cors-proxy";
