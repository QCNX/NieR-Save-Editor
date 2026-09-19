/**
 * Re-export vanilla ID tables from NieREdit Kotlin into scripts/vendor-ids/.
 *
 * Source root (read-only): env NIER_VANILLA_ID_ROOT, or ../NieREdit/.../domain/id
 * relative to this repo. Does not modify NieREdit.
 *
 * Usage: node scripts/export-vendor-ids.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(__dirname, "vendor-ids");

function parseHexOrInt(s) {
  return s.startsWith("0x") || s.startsWith("0X")
    ? parseInt(s.slice(2), 16)
    : parseInt(s, 10);
}

function titleCaseEnum(name) {
  return name
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function parseNameIdFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const rx = /([A-Z0-9_]+)\(\s*(0x[0-9A-Fa-f]+|-?\d+)\s*,\s*"([^"]*)"/g;
  const list = [];
  let m;
  while ((m = rx.exec(content))) {
    if (m[1] === "EMPTY") continue;
    list.push({ enumName: m[1], id: parseHexOrInt(m[2]), en: m[3] });
  }
  return list;
}

function parseChipFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const rx =
    /([A-Z0-9_]+)\(\s*(0x[0-9A-Fa-f]+)\s*,\s*(0x[0-9A-Fa-f]+)\s*,\s*(0x[0-9A-Fa-f]+)/g;
  const list = [];
  let m;
  while ((m = rx.exec(content))) {
    if (m[1] === "EMPTY") continue;
    list.push({
      enumName: m[1],
      baseCode: parseHexOrInt(m[2]),
      baseId: parseHexOrInt(m[3]),
      type: parseHexOrInt(m[4]),
      en: titleCaseEnum(m[1]),
    });
  }
  return list;
}

function resolveIdRoot() {
  if (process.env.NIER_VANILLA_ID_ROOT) {
    return path.resolve(process.env.NIER_VANILLA_ID_ROOT);
  }
  return path.join(
    repoRoot,
    "..",
    "NieREdit",
    "composeApp",
    "src",
    "jvmMain",
    "kotlin",
    "net",
    "mxnier",
    "nieredit",
    "domain",
    "id",
  );
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const idRoot = resolveIdRoot();
if (!fs.existsSync(path.join(idRoot, "vanilla", "VanillaInventoryItemIds.kt"))) {
  throw new Error(
    "Vanilla ID root not found. Set NIER_VANILLA_ID_ROOT to NieREdit domain/id (read-only).",
  );
}

const inventory = parseNameIdFile(
  path.join(idRoot, "vanilla", "VanillaInventoryItemIds.kt"),
);
const weapons = parseNameIdFile(
  path.join(idRoot, "vanilla", "VanillaWeaponItemIds.kt"),
);
const pods = parseNameIdFile(path.join(idRoot, "PodProgramId.kt")).filter(
  (p) => p.en,
);
const chips = parseChipFile(
  path.join(idRoot, "vanilla", "VanillaPluginChipIds.kt"),
);

fs.mkdirSync(outDir, { recursive: true });
writeJson(path.join(outDir, "inventory.json"), inventory);
writeJson(path.join(outDir, "weapons.json"), weapons);
writeJson(path.join(outDir, "pods.json"), pods);
writeJson(path.join(outDir, "chips.json"), chips);

console.log(
  `vendor-ids: inventory ${inventory.length}, weapons ${weapons.length}, pods ${pods.length}, chips ${chips.length}`,
);
