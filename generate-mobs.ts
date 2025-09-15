// gen-mobs.ts
// Usage:
//   bun gen-mobs.ts                 # newest supported PC version from minecraft-data
//   bun gen-mobs.ts 1.21.4          # pin to specific version
//
// Output: mobs.ts with namespace `Mobs`
// - PascalCase constants (e.g., Zombie = "ZOMBIE")
// - `export type ID = ...` union of all constants

import fs from "node:fs";
import path from "node:path";

// Load minecraft-data in Bun/ESM/CJS safe way
async function loadMinecraftData(): Promise<any> {
  try {
    const esm = await import("minecraft-data");
    return esm.default ?? esm;
  } catch {
    // @ts-ignore
    return require("minecraft-data");
  }
}

const toCaps = (id: string) => id.toUpperCase();
const toPascal = (id: string) =>
  id
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");

const uniq = <T>(arr: T[]) => Array.from(new Set(arr));
const sortLex = (arr: string[]) => [...arr].sort((a, b) => a.localeCompare(b));

function emitMobsNamespace(ids: string[]): string {
  const consts = ids
    .map((id) => `  export const ${toPascal(id)} = "${id}";`)
    .join("\n");
  const type =
    `  export type ID =\n` +
    ids.map((id) => `    | typeof ${toPascal(id)}`).join("\n") +
    ";";
  return `export namespace Mobs {\n${consts}\n\n${type}\n}\n`;
}

async function main() {
  const lib = await loadMinecraftData();

  const requested = process.argv[2];
  const pcVersions: Array<{ version: string }> = lib?.versions?.pc ?? [];
  if (pcVersions.length === 0) {
    throw new Error(
      "minecraft-data: couldn't read versions.pc. Is the package installed?"
    );
  }
  const newestPc = pcVersions[pcVersions.length - 1]?.version;
  const versionToUse = requested || newestPc;

  // Get callable loader across envs
  const loader: any =
    typeof lib === "function"
      ? lib
      : typeof (lib as any)?.default === "function"
      ? (lib as any).default
      : lib;

  const data = loader(versionToUse);
  if (!data)
    throw new Error(`Unsupported or unrecognized version "${versionToUse}".`);

  // Normalize entities source (array vs object)
  const entitiesSrc: any[] =
    (data.entitiesArray as any[] | undefined) ??
    (Array.isArray(data.entities)
      ? data.entities
      : Object.values(data.entities ?? {}));

  // Filter to living mobs only (exclude objects/projectiles/minecarts, etc.)
  const mobNames: string[] = (entitiesSrc ?? [])
    .filter((e: any) => e && typeof e.name === "string" && e.type === "mob")
    .map((e: any) => e.name); // e.g. "zombie", "elder_guardian", "warden"

  // Transform to ALL_CAPS, de-dup, sort
  const MOB_IDS = sortLex(uniq(mobNames.map(toCaps)));

  const outPath = path.join(process.cwd(), "mobs.ts");
  const now = new Date().toISOString();
  const mcVersion = data?.version?.minecraftVersion ?? versionToUse;

  const file = `/* eslint-disable */
// AUTO-GENERATED FILE — do not edit by hand.
// Generated: ${now}
// Source: minecraft-data (${mcVersion})
// Style: PascalCase constants, values are ALL_CAPS strings.

${emitMobsNamespace(MOB_IDS)}
`;

  fs.writeFileSync(outPath, file, "utf8");
  console.log(`Wrote ${outPath} (version ${mcVersion})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
