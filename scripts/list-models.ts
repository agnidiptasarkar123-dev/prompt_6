// SPDX-License-Identifier: Apache-2.0
import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const match = envContent.match(/GEMINI_API_KEY=([^\r\n]+)/);
const apiKey = match && match[1] ? match[1].replace(/["'\r\n]/g, "").trim() : "";

async function main() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json() as { models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }> };
  console.log(`Found ${data.models?.length || 0} models:`);
  for (const m of data.models || []) {
    if (m.supportedGenerationMethods?.includes("generateContent")) {
      console.log(`${m.name} | ${m.displayName}`);
    }
  }
}

main().catch(console.error);
