// SPDX-License-Identifier: Apache-2.0
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > -1) {
      const k = trimmed.slice(0, idx).trim();
      let v = trimmed.slice(idx + 1).trim();
      if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("\x27") && v.endsWith("\x27"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  }
}

register("./alias-loader.mjs", import.meta.url);
