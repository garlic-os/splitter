import corsProxy from "cors-anywhere";
import * as Config from "../../../config";

export const server = corsProxy.createServer({
	originWhitelist: [
		`http://127.0.0.1:${Config.webappPort}`,
		`http://localhost:${Config.webappPort}`,
	],
});

server.listen(Config.corsProxyPort, "127.0.0.1", () => {
	console.log(`CORS bypass proxy listening on port ${Config.corsProxyPort}`);
});
