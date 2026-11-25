// SPDX-License-Identifier: Apache-2.0
import fs from "node:fs";

export async function resolve(specifier, context, nextResolve) {
  const target = specifier;

  if (target.startsWith("@/")) {
    const sub = target.slice(2);
    const basePath = new URL(`../src/${sub}`, import.meta.url);
    const filePath = basePath.pathname;
    let finalPath = basePath.href;
    if (!fs.existsSync(filePath)) {
      if (fs.existsSync(filePath + ".ts")) {
        finalPath = basePath.href + ".ts";
      } else if (fs.existsSync(filePath + ".tsx")) {
        finalPath = basePath.href + ".tsx";
      } else if (fs.existsSync(filePath + "/index.ts")) {
        finalPath = basePath.href + "/index.ts";
      }
    }
    return nextResolve(finalPath, context);
  }

  if ((target.startsWith("./") || target.startsWith("../")) && context.parentURL) {
    const parent = new URL(context.parentURL);
    const resolved = new URL(target, parent);
    const filePath = resolved.pathname;
    if (!fs.existsSync(filePath)) {
      if (fs.existsSync(filePath + ".ts")) {
        return nextResolve(resolved.href + ".ts", context);
      } else if (fs.existsSync(filePath + ".tsx")) {
        return nextResolve(resolved.href + ".tsx", context);
      } else if (fs.existsSync(filePath + "/index.ts")) {
        return nextResolve(resolved.href + "/index.ts", context);
      }
    }
  }

  return nextResolve(target, context);
}
