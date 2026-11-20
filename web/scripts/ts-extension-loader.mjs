import { access } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !specifier.match(/\.[a-z]+$/i) && context.parentURL?.startsWith("file:")) {
    const candidate = resolvePath(dirname(fileURLToPath(context.parentURL)), `${specifier}.ts`);
    try {
      await access(candidate);
      return nextResolve(pathToFileURL(candidate).href, context);
    } catch {
      // Let Node report the original resolution error.
    }
  }
  return nextResolve(specifier, context);
}
