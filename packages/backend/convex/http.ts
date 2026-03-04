import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { githubCallback, githubInitiate } from "./gitConnections";
import { githubWebhookHandler } from "./webhooks";

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
	path: "/api/webhooks/github",
	method: "POST",
	handler: githubWebhookHandler,
});

export default http;
