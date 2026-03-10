import path from "node:path";
import { fileURLToPath } from "node:url";

const supportDir = path.dirname(fileURLToPath(import.meta.url));
const e2eDir = path.resolve(supportDir, "..");

export const authDir = path.join(e2eDir, ".auth");
export const bootstrapStatePath = path.join(authDir, "bootstrap.json");
export const memberStorageStatePath = path.join(authDir, "member.json");
export const ownerStorageStatePath = path.join(authDir, "owner.json");
