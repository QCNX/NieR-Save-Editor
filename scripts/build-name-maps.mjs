/**
 * Build runtime Chinese name maps from checked-in vanilla IDs + Dragon extracted strings.
 *
 * Inputs (not required at editor runtime once maps exist):
 *   - scripts/vendor-ids/{inventory,weapons,chips,pods}.json
 *   - extracted string JSON via env NIER_EXTRACTED_STRINGS, or auto-discovered under
 *     the workspace parent as <patch-dir>/extracted_strings (directory name may be Chinese)
 *
 * Outputs:
 *   - src/data/{items,weapons,chips,pods}.json   id → { en, zh }
 *   - src/data/_unmatched-report.md
 *
 * Usage: npm run build:name-maps
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const vendorDir = path.join(__dirname, "vendor-ids");
const outDir = path.join(repoRoot, "src", "data");

/** Chip type → CORE_PSV_SKILL_NAME base index (level 0 / no +N). */
const CHIP_TYPE_TO_SKILL_INDEX = {
  0x01: 1,
  0x02: 10,
  0x03: 19,
  0x04: 28,
  0x05: 37,
  0x06: 46,
  0x07: 55,
  0x08: 64,
  0x09: 73,
  0x0a: 82,
  0x0b: 91,
  0x0c: 100,
  0x0d: 109,
  0x0e: 118,
  0x0f: 127,
  0x10: 136,
  0x11: 145,
  0x12: 154,
  0x13: 163,
  0x14: 172,
  0x15: 181,
  0x16: 190,
  0x17: 199,
  0x18: 217,
  0x19: 226,
  0x1a: 235,
  0x1b: 244,
  0x1d: 262,
  0x1e: 289,
  0x1f: 298,
  0x22: 325,
  0x23: 208,
  0x26: 334,
  0x27: 335,
  0x28: 336,
  0x29: 337,
  0x2a: 338,
  0x2c: 339,
  0x2d: 340,
  0x2e: 341,
  0x2f: 342,
  0x30: 343,
  0x31: 344,
  0x32: 345,
  0x33: 346,
  0x34: 347,
  0x35: 348,
  0x36: 349,
  0x37: 350,
  0x3a: 353,
  0x3b: 354,
  0x3c: 355,
  0x3d: 356,
  0x3e: 357,
  0x3f: 358,
};

/** Weapon save id → CORE_WP_NAME key suffix (DLC / special keys). */
const WEAPON_ID_TO_WP_KEY = {
  0x753: "00f0", // Engine Blade
  0x754: "00f1", // Cypress Stick
};

/** Manual zh fill when catalog has no entry (confirmed in Dragon extract README). */
const ITEM_MANUAL_ZH = {
  0x3d8: "年轻人套装", // Young Man's Outfit
  0x3d9: "毁灭者套装", // Destroyer Outfit
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function resolveExtractedStringsDir() {
  if (process.env.NIER_EXTRACTED_STRINGS) {
    const envPath = path.resolve(process.env.NIER_EXTRACTED_STRINGS);
    if (!fs.existsSync(path.join(envPath, "CORE_ITEM_NAME.json"))) {
      throw new Error(
        `NIER_EXTRACTED_STRINGS does not contain CORE_ITEM_NAME.json: ${envPath}`,
      );
    }
    return envPath;
  }

  const parent = path.resolve(repoRoot, "..");
  const entries = fs.readdirSync(parent, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(parent, entry.name, "extracted_strings");
    if (fs.existsSync(path.join(candidate, "CORE_ITEM_NAME.json"))) {
      return candidate;
    }
  }

  throw new Error(
    "Could not find extracted_strings. Set NIER_EXTRACTED_STRINGS to the directory containing CORE_ITEM_NAME.json (sibling of this repo under the workspace).",
  );
}

function lookupPadded(table, id, widths = [0, 2, 3, 4]) {
  for (const w of widths) {
    const key = w === 0 ? String(id) : String(id).padStart(w, "0");
    if (Object.prototype.hasOwnProperty.call(table, key) && table[key]) {
      return { key, zh: table[key] };
    }
  }
  return null;
}

function resolveItemZh(id, tables) {
  if (id >= 0x1f41) {
    const fish = lookupPadded(tables.fish, id - 0x1f40, [2, 0]);
    if (fish) return { ...fish, source: "CORE_FISH" };
  }
  if (id === 0x2e3) {
    const dog = lookupPadded(tables.items, 740, [3, 0]);
    if (dog) return { ...dog, source: "CORE_ITEM_NAME" };
  }
  const hit = lookupPadded(tables.items, id, [0, 3, 4]);
  if (hit) return { ...hit, source: "CORE_ITEM_NAME" };
  if (Object.prototype.hasOwnProperty.call(ITEM_MANUAL_ZH, id)) {
    return { key: "MANUAL", zh: ITEM_MANUAL_ZH[id], source: "manual" };
  }
  return null;
}

function resolveWeaponZh(id, tables) {
  const special = WEAPON_ID_TO_WP_KEY[id];
  if (special && tables.weapons[special]) {
    return { key: special, zh: tables.weapons[special], source: "CORE_WP_NAME" };
  }
  const hit = lookupPadded(tables.weapons, id, [0, 3, 4]);
  if (hit) return { ...hit, source: "CORE_WP_NAME" };
  const hexKey = id.toString(16).padStart(4, "0");
  if (tables.weapons[hexKey]) {
    return { key: hexKey, zh: tables.weapons[hexKey], source: "CORE_WP_NAME" };
  }
  return null;
}

function resolveChipZh(type, tables) {
  const index = CHIP_TYPE_TO_SKILL_INDEX[type];
  if (index == null) return null;
  const hit = lookupPadded(tables.chips, index, [3, 0]);
  if (hit) return { ...hit, source: "CORE_PSV_SKILL_NAME" };
  return null;
}

function resolvePodZh(id, tables) {
  const idx = id - 2000;
  if (idx > 0) {
    const hit = lookupPadded(tables.pods, idx, [2, 0]);
    if (hit) return { ...hit, source: "CORE_ACT_SKILL_NAME" };
  }
  return null;
}

function toSortedMap(entries) {
  const sorted = [...entries].sort((a, b) => a.id - b.id);
  const out = {};
  for (const e of sorted) {
    out[String(e.id)] = { en: e.en, zh: e.zh };
  }
  return out;
}

function main() {
  const stringsDir = resolveExtractedStringsDir();
  const tables = {
    items: readJson(path.join(stringsDir, "CORE_ITEM_NAME.json")),
    weapons: readJson(path.join(stringsDir, "CORE_WP_NAME.json")),
    chips: readJson(path.join(stringsDir, "CORE_PSV_SKILL_NAME.json")),
    pods: readJson(path.join(stringsDir, "CORE_ACT_SKILL_NAME.json")),
    fish: readJson(path.join(stringsDir, "CORE_FISH.json")),
  };

  const inventory = readJson(path.join(vendorDir, "inventory.json"));
  const weapons = readJson(path.join(vendorDir, "weapons.json"));
  const chips = readJson(path.join(vendorDir, "chips.json"));
  const pods = readJson(path.join(vendorDir, "pods.json"));

  const unmatched = [];
  const itemEntries = [];
  for (const row of inventory) {
    const hit = resolveItemZh(row.id, tables);
    if (!hit) {
      unmatched.push({
        category: "items",
        id: row.id,
        idHex: `0x${row.id.toString(16).toUpperCase()}`,
        enumName: row.enumName,
        en: row.en,
      });
      continue;
    }
    itemEntries.push({ id: row.id, en: row.en, zh: hit.zh });
  }

  const weaponEntries = [];
  for (const row of weapons) {
    const hit = resolveWeaponZh(row.id, tables);
    if (!hit) {
      unmatched.push({
        category: "weapons",
        id: row.id,
        idHex: `0x${row.id.toString(16).toUpperCase()}`,
        enumName: row.enumName,
        en: row.en,
      });
      continue;
    }
    weaponEntries.push({ id: row.id, en: row.en, zh: hit.zh });
  }

  const chipEntries = [];
  for (const row of chips) {
    const hit = resolveChipZh(row.type, tables);
    if (!hit) {
      unmatched.push({
        category: "chips",
        id: row.baseId,
        idHex: `0x${row.baseId.toString(16).toUpperCase()}`,
        enumName: row.enumName,
        en: row.en,
        type: row.type,
      });
      continue;
    }
    chipEntries.push({ id: row.baseId, en: row.en, zh: hit.zh });
  }

  const podEntries = [];
  for (const row of pods) {
    const hit = resolvePodZh(row.id, tables);
    if (!hit) {
      unmatched.push({
        category: "pods",
        id: row.id,
        idHex: `0x${row.id.toString(16).toUpperCase()}`,
        enumName: row.enumName,
        en: row.en,
      });
      continue;
    }
    podEntries.push({ id: row.id, en: row.en, zh: hit.zh });
  }

  fs.mkdirSync(outDir, { recursive: true });
  writeJson(path.join(outDir, "items.json"), toSortedMap(itemEntries));
  writeJson(path.join(outDir, "weapons.json"), toSortedMap(weaponEntries));
  writeJson(path.join(outDir, "chips.json"), toSortedMap(chipEntries));
  writeJson(path.join(outDir, "pods.json"), toSortedMap(podEntries));

  const counts = {
    items: { matched: itemEntries.length, total: inventory.length },
    weapons: { matched: weaponEntries.length, total: weapons.length },
    chips: { matched: chipEntries.length, total: chips.length },
    pods: { matched: podEntries.length, total: pods.length },
  };

  const reportLines = [
    "# Unmatched Chinese name-map report",
    "",
    "Generated by `npm run build:name-maps`. Lists vanilla IDs with no Dragon catalog hit after bridging rules.",
    "",
    "## Coverage",
    "",
    `| Category | Matched | Total |`,
    `| --- | ---: | ---: |`,
    `| items | ${counts.items.matched} | ${counts.items.total} |`,
    `| weapons | ${counts.weapons.matched} | ${counts.weapons.total} |`,
    `| chips | ${counts.chips.matched} | ${counts.chips.total} |`,
    `| pods | ${counts.pods.matched} | ${counts.pods.total} |`,
    `| **unmatched** | | **${unmatched.length}** |`,
    "",
  ];

  if (unmatched.length === 0) {
    reportLines.push("No unmatched IDs in the four MVP categories.");
    reportLines.push("");
  } else {
    reportLines.push("## Unmatched");
    reportLines.push("");
    reportLines.push("| Category | id | idHex | enum | en |");
    reportLines.push("| --- | ---: | --- | --- | --- |");
    for (const row of unmatched) {
      reportLines.push(
        `| ${row.category} | ${row.id} | ${row.idHex} | ${row.enumName} | ${row.en} |`,
      );
    }
    reportLines.push("");
  }

  fs.writeFileSync(path.join(outDir, "_unmatched-report.md"), reportLines.join("\n"), "utf8");

  // Privacy: never print absolute source paths.
  console.log(
    `name-maps: items ${counts.items.matched}/${counts.items.total}, weapons ${counts.weapons.matched}/${counts.weapons.total}, chips ${counts.chips.matched}/${counts.chips.total}, pods ${counts.pods.matched}/${counts.pods.total}, unmatched ${unmatched.length}`,
  );
}

main();
