// generate-materials.ts
// Usage:
//   bun generate-materials.ts             # newest PC version
//   bun generate-materials.ts 1.21.4      # specific version
//
// Output: material.ts with namespace Material.Blocks.* and Material.Items.*

import fs from "node:fs";
import path from "node:path";

async function loadMinecraftData(): Promise<any> {
  try {
    // @ts-expect-error minecraft-data ESM
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

function emitNamespace(name: string, ids: string[]): string {
  const consts = ids
    .map((id) => {
      const pascal = toPascal(id);
      return `    export const ${pascal} = "${id}";`;
    })
    .join("\n");
  const type =
    `    export type ID =\n` +
    ids.map((id) => `      | typeof ${toPascal(id)}`).join("\n") +
    ";";
  return `  export namespace ${name} {\n${consts}\n\n${type}\n  }`;
}

async function main() {
  const lib = await loadMinecraftData();

  const requested = process.argv[2];
  const pcVersions: Array<{ version: string }> = lib?.versions?.pc ?? [];
  const newestPc = pcVersions[pcVersions.length - 1]?.version;
  const versionToUse = requested || newestPc;

  const loader: any =
    typeof lib === "function"
      ? lib
      : typeof lib?.default === "function"
      ? lib.default
      : lib;

  const data = loader(versionToUse);
  if (!data) throw new Error(`Unsupported version: ${versionToUse}`);

  const blocksSrc: any[] =
    (data.blocksArray as any[] | undefined) ??
    (Array.isArray(data.blocks)
      ? data.blocks
      : Object.values(data.blocks ?? {}));
  const itemsSrc: any[] =
    (data.itemsArray as any[] | undefined) ??
    (Array.isArray(data.items) ? data.items : Object.values(data.items ?? {}));

  const blocks = blocksSrc.map((b: any) => b?.name).filter(Boolean);
  const items = itemsSrc.map((i: any) => i?.name).filter(Boolean);

  const BLOCKS = sortLex(uniq(blocks.map(toCaps)));
  const ITEMS = sortLex(uniq(items.map(toCaps)));

  const outPath = path.join(process.cwd(), "material.ts");
  const now = new Date().toISOString();
  const mcVersion = data?.version?.minecraftVersion ?? versionToUse;

  const file = `/* eslint-disable */
// AUTO-GENERATED FILE — do not edit by hand.
// Generated: ${now}
// Source: minecraft-data (${mcVersion})
// Style: PascalCase constants, values are ALL_CAPS strings.

export namespace Material {
${emitNamespace("Blocks", BLOCKS)}

${emitNamespace("Items", ITEMS)}

  /** Any block or item ID */
  export type ID = Blocks.ID | Items.ID;
}
`;

  fs.writeFileSync(outPath, file, "utf8");
  console.log(`Wrote ${outPath} (version ${mcVersion})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
