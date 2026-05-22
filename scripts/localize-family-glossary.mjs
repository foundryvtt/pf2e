/**
 * Apply bestiary-family-ability-glossary name localization for local testing.
 *
 * - Prepends an ItemAlteration rule that overrides each ability's display name
 * - Adds PF2E.NPCAbility.<Family>.<Ability>.Name entries to static/lang/re-en.json
 * - Ability keys use the pack name after the parenthetical prefix
 *   (e.g. "(Vampire, Jiang-Shi, Minister) Dark Enlightenment" → DarkEnlightenment)
 *
 * Usage: node scripts/localize-family-glossary.mjs [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";

const dryRun = process.argv.includes("--dry-run");
const glossaryRoot = path.resolve("packs/pf2e/bestiary-family-ability-glossary");
const langPath = path.resolve("static/lang/re-en.json");

function pascalCaseSlug(slug) {
    return slug
        .split("-")
        .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
        .join("");
}

function abilityKeyFromLocalizedName(localizedName) {
    return localizedName
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join("");
}

function sortByKeys(obj) {
    return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

function walkJsonFiles(dir, files = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkJsonFiles(full, files);
        else if (entry.name.endsWith(".json") && entry.name !== "_folders.json") files.push(full);
    }
    return files;
}

function collectEntries() {
    const entries = [];
    for (const file of walkJsonFiles(glossaryRoot)) {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        const nameMatch = data.name?.match(/^\([^)]+\)\s*(.*)$/);
        if (!nameMatch) throw new Error(`Unexpected name format: ${data.name} (${file})`);

        const family = pascalCaseSlug(path.basename(path.dirname(file)));
        const abilityKey = abilityKeyFromLocalizedName(nameMatch[1]);

        entries.push({
            file,
            data,
            family,
            abilityKey,
            localizedName: nameMatch[1],
            i18nKey: `PF2E.NPCAbility.${family}.${abilityKey}.Name`,
        });
    }
    return entries;
}

function applyPack(entry) {
    const rules = entry.data.system?.rules ?? [];
    const nameRule = {
        itemId: "{item|id}",
        key: "ItemAlteration",
        mode: "override",
        property: "name",
        value: entry.i18nKey,
    };

    const existing = rules.find(
        (rule) =>
            rule.key === "ItemAlteration" &&
            rule.mode === "override" &&
            rule.property === "name" &&
            rule.itemId === "{item|id}",
    );

    entry.data.system.rules = existing
        ? rules.map((rule) => (rule === existing ? { ...rule, value: entry.i18nKey } : rule))
        : [nameRule, ...rules];

    if (!dryRun) {
        fs.writeFileSync(entry.file, `${JSON.stringify(entry.data, null, 4)}\n`, "utf8");
    }
}

function applyLang(npcAbility, entries) {
    for (const { family, abilityKey, localizedName } of entries) {
        if (!npcAbility[family]) npcAbility[family] = {};

        const existing = npcAbility[family][abilityKey];
        if (existing === undefined) {
            npcAbility[family][abilityKey] = { Name: localizedName };
        } else if (typeof existing === "string") {
            throw new Error(`Cannot set Name on ${family}.${abilityKey}: existing string entry`);
        } else {
            existing.Name = localizedName;
        }
    }

    for (const family of new Set(entries.map((entry) => entry.family))) {
        npcAbility[family] = sortByKeys(npcAbility[family]);
    }
}

const entries = collectEntries();

for (const entry of entries) {
    applyPack(entry);
}

const lang = JSON.parse(fs.readFileSync(langPath, "utf8"));
applyLang(lang.PF2E.NPCAbility, entries);
lang.PF2E.NPCAbility = sortByKeys(lang.PF2E.NPCAbility);

if (!dryRun) {
    fs.writeFileSync(langPath, `${JSON.stringify(lang, null, 4)}\n`, "utf8");
}

console.log(`Processed ${entries.length} abilities in ${new Set(entries.map((e) => e.family)).size} families`);
if (dryRun) console.log("(dry run — no files written)");
