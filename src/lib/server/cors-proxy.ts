import corsProxy from "cors-anywhere";
import * as Config from "$config";

export const server = corsProxy.createServer({
	originWhitelist: [Config.webappURL],
});

server.listen(Config.corsProxyPort, "127.0.0.1", () => {
	console.log(`CORS bypass proxy listening on port ${Config.corsProxyPort}`);
});
