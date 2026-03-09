import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
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

export default http;
