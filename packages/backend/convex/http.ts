import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { bootstrap, reset } from "./e2e";
import { githubCallback, githubInitiate } from "./gitConnections";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

http.route({
	path: "/api/github/connect",
	method: "GET",
	handler: githubInitiate,
});

http.route({
	path: "/api/github/callback",
	method: "GET",
	handler: githubCallback,
});

http.route({
	path: "/api/e2e/bootstrap",
	method: "POST",
	handler: bootstrap,
});

http.route({
	path: "/api/e2e/reset",
	method: "POST",
	handler: reset,
});

export default http;
