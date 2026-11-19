// Remove dist/ before a build. Needed because the SPA now builds into dist/app
// (vite only empties that subdir), so stale dist-root files must be cleared.
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

rmSync(join(dirname(fileURLToPath(import.meta.url)), "..", "dist"), {
  recursive: true,
  force: true,
});
