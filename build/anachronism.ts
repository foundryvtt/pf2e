import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { ancestryTraits, classTraits } from "@scripts/config/traits.ts";
import { objectHasKey, recursiveReplaceString, sluggify } from "@util/misc.ts";
import fs from "fs";
import path from "path";
import * as R from "remeda";
import url from "url";
import yargs, { Argv } from "yargs";
import pf2eAnachronismManifest from "../module.pf2e-anachronism.json" with { type: "json" };
import sf2eAnachronismManifest from "../module.sf2e-anachronism.json" with { type: "json" };
import langEn from "../static/lang/en.json" with { type: "json" };
import pf2eManifest from "../system.pf2e.json" with { type: "json" };
import sf2eManifest from "../system.sf2e.json" with { type: "json" };
import duplicates from "./duplicates.json" with { type: "json" };
import { CompendiumPack, isItemSource } from "./lib/compendium-pack.ts";
import { PackError } from "./lib/helpers.ts";
import { LevelDatabase } from "./lib/level-database.ts";
import { PackEntry } from "./lib/types.ts";
import pf2eRedirects from "./uuid-redirects/pf2e.json" with { type: "json" };
import sf2eRedirects from "./uuid-redirects/sf2e.json" with { type: "json" };

type ModuleId = `${SystemId}-anachronism`;
const argv = yargs(process.argv.slice(2)) as Argv<{ module: ModuleId | "both"; json: boolean }>;
const args = argv
    .command("$0 [system] [json]", "Build one or both the anachronism modules", () => {
        argv.option("module", {
            describe: "The FVTT module to create",
            type: "string",
            choices: ["pf2e-anachronism", "sf2e-anachronism", "both"],
            default: "both",
        });
    })
    .help(false)
    .version(false)
    .parseSync();

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const logsDir = path.join(__dirname, "logs");
const distDir = path.resolve(__dirname, "..", "dist");
const contentSystems: SystemId[] =
    args.module === "both" ? (["pf2e", "sf2e"] as const) : [args.module === "pf2e-anachronism" ? "pf2e" : "sf2e"];
console.log(`Building Modules: ${contentSystems.map((c) => `${c}-anachronism`)}`);

/** Root module file contents of anachronism. This should be moved to a file somewhere. */
const moduleSourceContents = String.raw`
import UUID_REDIRECTS from "./uuid-redirects.json" with { type: "json" };
for (const [from, to] of Object.entries(UUID_REDIRECTS)) {
    CONFIG.compendium.uuidRedirects[from] = to;
}
`;

console.log("Starting build, loading compendiums for both systems");
const pf2eInDir = path.join(__dirname, "../packs/pf2e");
const sf2eInDir = path.join(__dirname, "../packs/sf2e");
const pf2ePacks = fs
    .readdirSync(pf2eInDir)
    .map((p) => CompendiumPack.loadJSON(path.join(pf2eInDir, p), { systemId: "pf2e" }));
console.log("PF2e Packs Loaded");
const sf2ePacks = fs
    .readdirSync(sf2eInDir)
    .map((p) => CompendiumPack.loadJSON(path.join(sf2eInDir, p), { systemId: "sf2e" }));
console.log("SF2e Packs Loaded");

// Assemble pack pairs, which are used to detect duplicates and overlaps
const allPackDirs = R.unique([...pf2eManifest.packs, ...sf2eManifest.packs].map((p) => path.basename(p.path)));
const packPairs = allPackDirs.map((dir) => {
    const pf2e = pf2ePacks.find((p) => p.dirName === dir);
    const sf2e = sf2ePacks.find((p) => p.dirName === dir);
    const manifestData =
        pf2eManifest.packs.find((p) => p.name === pf2e?.id) ?? sf2eManifest.packs.find((p) => p.name === sf2e?.id);
    const duplicated = duplicates.flatMap((group) => {
        const entries: Record<string, string[] | undefined> = group.entries;
        return entries[dir] ?? [];
    });
    if (!manifestData) throw new Error(`Failed to find manifest pack data for directory ${dir}`);

    const pf2eDataWithId = pf2e?.data.filter((p): p is PackEntry & { _id: string } => !!p._id) ?? [];
    const sf2eDataWithId = sf2e?.data.filter((p): p is PackEntry & { _id: string } => !!p._id) ?? [];
    const pf2eMap = {
        ...R.mapToObj(pf2eDataWithId, (d) => [d._id, d]),
        ...R.mapToObj(pf2eDataWithId, (d) => [d.name, d]),
    };
    const sf2eMap = {
        ...R.mapToObj(sf2eDataWithId, (d) => [d._id, d]),
        ...R.mapToObj(sf2eDataWithId, (d) => [d.name, d]),
    };

    // Get all overlaps between the two systems, which we need to redirect and not export
    // An overlap is either a name or an id. Some actor types never overlap.
    const overlaps: Set<string> = new Set();
    if (!["JournalEntry", "Actor"].includes(manifestData.type) && pf2e && sf2e) {
        for (const pf2eData of pf2e.data ?? []) {
            const sf2eData = sf2e.data.find((d) => d.name === pf2eData.name || d._id === pf2eData._id);
            if (!sf2eData || !("type" in pf2eData) || !("type" in sf2eData) || pf2eData.type !== sf2eData.type) {
                continue;
            }

            // Never treat certain types of items as overlaps
            // Despite being in both systems, "Armored Coat" and "Courier" are not considered to be the same thing.
            // Actual reprints (listed in duplicates) are still filtered out through other means
            const isItem = isItemSource(pf2eData) && sf2eData && isItemSource(sf2eData);
            if (isItem && itemIsOfType(pf2eData, "background", "physical")) continue;

            if (isItem && itemIsOfType(pf2eData, "feat") && itemIsOfType(sf2eData, "feat")) {
                const allTraits = [...pf2eData.system.traits.value, ...sf2eData.system.traits.value];

                // The category must match to be considered an overlap.
                if (pf2eData.system.category !== sf2eData.system.category) continue;

                // Class features and class feats for classes are also never overlaps
                if (pf2eData.system.category === "classfeature") continue;
                if (pf2eData.system.category === "class" && allTraits.some((t) => t in classTraits)) continue;

                // If both are ancestry feats but the traits don't have overlap, we should export even if the name matches
                // A duplicate in such scenarios won't lead to dupe feats in a character's feat search
                const pf2eAncestryTraits = pf2eData.system.traits.value.filter((t) => t in ancestryTraits);
                const sf2eAncestryTraits = sf2eData.system.traits.value.filter((t) => t in ancestryTraits);
                const hasAncestryTraits = pf2eAncestryTraits.length > 0 || sf2eAncestryTraits.length > 0;
                if (hasAncestryTraits && !R.intersection(pf2eAncestryTraits, sf2eAncestryTraits).length) {
                    continue;
                }
            }

            // Add to overlaps based on if its a name or id overlap
            if (pf2eData.name === sf2eData.name) {
                overlaps.add(pf2eData.name);
            } else if (pf2eData._id && pf2eData._id === sf2eData._id) {
                overlaps.add(pf2eData._id);
            }
        }
    }

    return {
        packName: sf2e?.id ?? pf2e?.id ?? dir,
        documentName: manifestData.type,
        pf2e,
        sf2e,
        duplicated: new Set(duplicated),
        overlaps,
        get: (system: SystemId, idOrName: string): PackEntry | null => {
            const mapping = system === "pf2e" ? pf2eMap : sf2eMap;
            return mapping[idOrName] ?? null;
        },
    };
});
const packPairsById = R.mapToObj(packPairs, (p) => [p.packName, p]);

// Clean output directories for the system we are building
for (const system of contentSystems) {
    await fs.promises.rm(path.join(distDir, `${system}-anachronism`), { recursive: true, force: true });
    await fs.promises.mkdir(path.join(distDir, `${system}-anachronism/packs`), { recursive: true });
}

const packRegexp = /\bCompendium\.(?:pf2e|sf2e)\.(?<packName>[^.]+)\.(?<docType>\w+)\.(?<docNameOrId>[^.\b\]"]+)/g;

// Certain pf2e compendiums have outdated map names. We make a thing to remap them to a more standardized form
const compendiumRemap = (() => {
    const sf2eCompendiumRemap: Record<string, string> = {};
    for (const { name, path } of pf2eManifest.packs) {
        const match = sf2eManifest.packs.find((p) => p.path === path);
        if (match) sf2eCompendiumRemap[name] = match.name;
    }
    return sf2eCompendiumRemap;
})();

// Store the ones successfully outputed per system
for (const contentSystem of contentSystems) {
    const outDir = path.resolve(distDir, `${contentSystem}-anachronism`);
    const targetSystem = contentSystem === "pf2e" ? "sf2e" : "pf2e";
    const contentPacks: CompendiumPack[] = [];
    console.log(`Starting ${contentSystem}-anachronism build`);

    /**
     * Creates a resolver to convert pack/doctype/doc name data for the build
     * It checks in the existing system first in case the entry was either an overlap or a duplicate.
     * This means that an sf2e reference for heal will become a pf2e reference for one.
     */
    const uuidRemapper: UUIDRemapper = ({ packName, docType, docNameOrId }) => {
        const normalizedPackId = compendiumRemap[packName] ?? packName;
        const pair = packPairsById[normalizedPackId];
        if (!pair) return null;

        // Pull the entry in the target and content systems, prioritizing target system variants
        // Note that in the case of duplicates, sf2e does not contain the item, so we may need to fetch from pf2e
        // This is only important for the target system, since we want to redirect content to target if it exists
        const entryInContentSystem = pair.get(contentSystem, docNameOrId);
        const entryInTargetSystem =
            pair.get(targetSystem, docNameOrId) ??
            (entryInContentSystem && pair.duplicated.has(entryInContentSystem.name) ? entryInContentSystem : null);
        const id = entryInTargetSystem?._id ?? entryInContentSystem?._id;
        const name = entryInTargetSystem?.name ?? entryInContentSystem?.name;
        if (!name || !id) return null;

        const duplicated = targetSystem === "sf2e" && pair.duplicated.has(name);
        const useTargetSystem =
            !!entryInTargetSystem &&
            (!entryInContentSystem || pair.overlaps.has(id) || pair.overlaps.has(name) || duplicated);
        const packageId = useTargetSystem ? targetSystem : `${contentSystem}-anachronism`;
        const packId = useTargetSystem ? pair[targetSystem]!.id : pair[contentSystem]!.dirName;
        const resolvedEntry = useTargetSystem ? entryInTargetSystem : entryInContentSystem;
        if (!resolvedEntry) throw Error("Unexpected missing resolved entry");

        return {
            uuid: `Compendium.${packageId}.${packId}.${docType}.${resolvedEntry._id}`,
            name: resolvedEntry.name,
        };
    };

    const remapUuid = (uuid: string) => {
        const matches = [...uuid.matchAll(packRegexp)];
        if (matches.length !== 1) return uuid;
        const [_, packName, docType, docNameOrId] = matches[0];
        return uuidRemapper({ packName, docType, docNameOrId })?.uuid ?? uuid;
    };

    // Process Entries
    for (const packPair of packPairs) {
        const { packName } = packPair;
        const pack = packPair[contentSystem];
        if (!pack) continue;

        const data = pack.data
            .filter((d) => {
                if (!d._id) return false;
                const isOverlap = packPair.overlaps.has(d.name) || packPair.overlaps.has(d._id);
                return !isOverlap && !packPair.duplicated.has(d.name);
            })
            .map((entry) => {
                entry = recursiveReplaceString(entry, (s) => {
                    s = s.replaceAll(`systems/${contentSystem}`, `systems/${targetSystem}`);
                    s = s.replace(/\bflags\.(?:sf2e|pf2e)\./g, `flags.${targetSystem}.`);
                    s = s.replaceAll(packRegexp, (match, packId, docType, docNameOrId) => {
                        return uuidRemapper({ packName: packId, docType, docNameOrId })?.uuid ?? match;
                    });

                    const replace = (match: string, packId: string, docType: string, docNameOrId: string): string => {
                        if (match.includes("JournalEntryPage")) return match;
                        const sourceId = uuidRemapper({ packName: packId, docType, docNameOrId });
                        if (!sourceId) throw PackError(`Failed to remap  ${match}`);
                        const labelBraceOrFullLabel = match.endsWith("{") ? "{" : `{${sourceId.name}}`;
                        return `@UUID[${sourceId.uuid}]${labelBraceOrFullLabel}`;
                    };

                    return s
                        .replace(CompendiumPack.LINK_PATTERNS.uuid, replace)
                        .replace(CompendiumPack.LINK_PATTERNS.compendium, replace);
                });

                if (entry.flags && entry.flags[contentSystem]) {
                    entry.flags[targetSystem] = entry.flags[contentSystem];
                    delete entry.flags[contentSystem];
                }

                return entry;
            });
        if (data.length === 0) continue;

        // Create a new content pack from the adjusted data, with its new id
        const newPack = new CompendiumPack({
            id: packName,
            documentName: pack.documentName,
            dirName: packName,
            data,
            folders: pack.folders,
            systemId: targetSystem,
        });
        contentPacks.push(newPack);
    }
    console.log(`Finished transforming entries for ${contentSystem}'s content pack`);

    // Create root module file
    await fs.promises.writeFile(path.join(outDir, "anachronism.mjs"), moduleSourceContents, "utf8");

    // Create uuid redirects. We need to remap uuids per pack, as well as any missing item.
    // Redirects also resolve from least specific to most specific, so we need to remap the imported remaps.
    // We remap per pack because pf2e has some outdated pack names.
    const baseRedirects: Record<string, string> = contentSystem === "pf2e" ? pf2eRedirects : sf2eRedirects;
    const uuidRedirects = {
        // Get full compendium redirects first
        ...packPairs.reduce(
            (result, pair) => {
                if (pair[contentSystem]) {
                    result[`Compendium.${contentSystem}.${pair[contentSystem].id}`] =
                        `Compendium.${contentSystem}-anachronism.${pair.packName}`;
                }
                return result;
            },
            {} as Record<string, string>,
        ),
        // Redirect unexported overlaps to the main system. If it is a duplicate, we might have to check the other system for a result
        ...packPairs.reduce(
            (result, pair) => {
                const contentPack = pair[contentSystem];
                const targetPack = pair[targetSystem];
                if (!contentPack || !targetPack) return result;
                for (const overlap of pair.overlaps) {
                    const docType = pair.documentName;
                    const originId = (
                        contentPack.data.find((d) => d.name === overlap) ??
                        targetPack.data.find((d) => d.name === overlap)
                    )?._id;
                    const targetId = (
                        targetPack.data.find((d) => d.name === overlap) ??
                        contentPack.data.find((d) => d.name === overlap)
                    )?._id;
                    const originUUID = `Compendium.${contentSystem}.${contentPack.id}.${docType}.${originId}`;
                    const targetUUID = `Compendium.${targetSystem}.${targetPack.id}.${docType}.${targetId}`;
                    result[originUUID] = targetUUID;
                }
                return result;
            },
            {} as Record<string, string>,
        ),
        ...R.mapValues(baseRedirects, (value) => remapUuid(value)),
    };
    // Detect a "chain redirect" (A -> B -> C). Foundry can't handle those. If one occurs, we should consolidate (doesn't exist yet).
    if (Object.values(uuidRedirects).some((v) => v in uuidRedirects)) {
        throw new Error("Unexpected unhandled redirect chain.");
    }
    await fs.promises.writeFile(
        path.join(outDir, "uuid-redirects.json"),
        JSON.stringify(uuidRedirects, null, 4),
        "utf8",
    );

    // Create Manifest. The PF2e anachronism manifest needs data from the actual pf2e system manifest
    const contentSystemManifest = contentSystem === "pf2e" ? pf2eManifest : sf2eManifest;
    const mainManifest = contentSystem === "pf2e" ? pf2eAnachronismManifest : sf2eAnachronismManifest;
    const outputManifest = {
        ...R.clone(mainManifest),
        packs: contentPacks.map(({ id, dirName }) => {
            const original = contentSystemManifest.packs.find((p) => (compendiumRemap[p.name] ?? p.name) === id);
            if (!original) {
                throw PackError(`Failed to pack data in manifest for ${id} in content system ${contentSystem}`);
            }
            return {
                ...original,
                name: compendiumRemap[original.name] ?? original.name,
                path: `packs/${dirName}`,
                system: targetSystem,
                banner: original?.banner.replace(/systems\/(?:pf2e|sf2e)/g, `systems/${targetSystem}`),
            };
        }),
        packFolders: [
            {
                name: contentSystem === "pf2e" ? "PF2e Anachronism" : "SF2e Anachronism",
                sorting: "m",
                color: contentSystem === "pf2e" ? "#5e0000" : "#1d3c53",
                folders: recursiveReplaceString(contentSystemManifest.packFolders, (s) => compendiumRemap[s] ?? s),
            },
        ],
    };
    await fs.promises.writeFile(path.join(outDir, "module.json"), JSON.stringify(outputManifest, null, 4));
    console.log(`Manifest created for ${contentSystem}-anachronism`);

    // Write pack files to Database
    for (const pack of contentPacks) {
        const db = await LevelDatabase.connect(path.join(outDir, `packs/${pack.dirName}`), {
            packName: pack.id,
            manifest: outputManifest,
        });
        await db.createPack(pack.finalizeAll({ remap: false }), pack.folders);
        await db.close();
    }

    // Get a log of all items that were excluded from exports
    // These do not include intentional duplicates from dupicates.json, only overlaps
    const getObjectProp = <T extends object, K extends string | null>(obj: T, key: K) => {
        return objectHasKey(obj, key) ? obj[key] : undefined;
    };
    const exportLog = R.pipe(
        packPairs.filter((p) => p.documentName === "Item"),
        R.flatMap(({ overlaps, ...data }) => {
            // From the pack, get all overlaps, but make sure we *actually* excluded it
            const registeredDupes = [...overlaps].map(
                (idOrName) =>
                    data[contentSystem]?.data.find((d) => d.name === idOrName || d._id === idOrName) ??
                    data[targetSystem]?.data.find((d) => d.name === idOrName || d._id === idOrName),
            );
            const outputPack = contentPacks.find((p) => p.id === data[contentSystem]?.id);
            const outputtedIds = new Set(outputPack?.data.map((d) => d._id) ?? []);
            return registeredDupes.filter(
                (d): d is ItemSourcePF2e => !!d && isItemSource(d) && !outputtedIds.has(d._id),
            );
        }),
        R.groupBy((i) => (itemIsOfType(i, "feat") ? `feat-${i.system.category}` : i.type)),
        R.entries(),
        R.map(([key, value]) => {
            const featCategorySlug = key.startsWith("feat-")
                ? sluggify(key.replace("feat-", ""), { camel: "bactrian" }).replace("feature", "Feature")
                : null;
            const featCategoryLabel =
                getObjectProp(langEn.PF2E.Item.Feat.Category, featCategorySlug) ?? featCategorySlug;
            const itemType = featCategorySlug ? "Feat/Feature" : (getObjectProp(langEn.TYPES.Item, key) ?? key);
            const title = featCategoryLabel ? `${itemType} (${featCategoryLabel})` : itemType;
            return [`### ${title}`, ...R.sortBy(value, (v) => v.name).map((v) => `- [${v._id}] ${v.name}`)];
        }),
        R.sortBy((values) => values[0]),
        R.flat(),
    ).join("\n");
    await fs.promises.mkdir(logsDir, { recursive: true });
    await fs.promises.writeFile(path.join(logsDir, `exclusions-${contentSystem}-anachronism.md`), exportLog, "utf8");

    console.log(`Finished building ${contentSystem}-anachronism`);
}

/** A simple uuid remapper function */
type UUIDRemapper = (props: {
    packName: string;
    docType: string;
    docNameOrId: string;
}) => { uuid: string; name: string } | null;
