import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import Datastore from "nedb-promises";
import yargs from "yargs";
import { JSDOM } from "jsdom";
import type { ActorPF2e } from "@actor/base";
import type { ItemPF2e } from "@item/base";
import { sluggify } from "@module/utils";
import systemJSON from "system.json";
import templateJSON from "static/template.json";

declare global {
    interface Global {
        document: Document;
        window: Window;
        navigator: Navigator;
    }
}
const { window } = new JSDOM();
global.document = window.document;
global.window = global.document.defaultView!;
import $ from "jquery";
import { ActionSource, ItemSourcePF2e, MeleeSource, SpellSource } from "@item/data";
import { NPCSystemData } from "@actor/npc/data";
import { isActorSource, isItemSource } from "./packman/compendium-pack";

// show error message without needless traceback
const PackError = (message: string) => {
    console.error(`Error: ${message}`);
    process.exit(1);
};

interface ExtractArgs {
    packDb: string;
    foundryConfig?: string;
    disablePresort?: boolean;
    logWarnings?: boolean;
}

const args = (yargs(process.argv.slice(2)) as yargs.Argv<ExtractArgs>)
    .command(
        "$0 <packDb> [foundryConfig] [disablePresort] [logWarnings]",
        "Extract one or all compendium packs to packs/data",
        () => {
            yargs
                .positional("packDb", {
                    describe: 'A compendium pack filename (*.db) or otherwise "all"',
                })
                .positional("foundryConfig", {
                    describe: "The path to your local Foundry server's config.json file",
                    default: ".\\foundryconfig.json",
                })
                .option("disablePresort", {
                    describe: "Turns off data item presorting.",
                    type: "boolean",
                    default: false,
                })
                .option("logWarnings", {
                    describe: "Turns on logging out warnings about extracted data.",
                    type: "boolean",
                    default: true,
                })
                .example([
                    ["npm run $0 spells.db /path/to/foundryvtt/Config/options.json"],
                    ["npm run $0 spells.db C:\\Users\\me\\this\\way\\to\\options.json"],
                    ["npm run $0 spells.db # copy of config at ./foundryconfig.json or otherwise using dist/"],
                    ["npm run $0 all       # same"],
                ]);
        }
    )
    .check((argv) => {
        if (
            typeof argv.foundryConfig === "string" &&
            !(fs.existsSync(argv.foundryConfig) && fs.statSync(argv.foundryConfig).isFile())
        ) {
            argv.foundryConfig = undefined;
        }
        return true;
    })
    .help(false)
    .version(false)
    .parse();

const packsPath = (() => {
    try {
        const content = fs.readFileSync(args.foundryConfig ?? "", { encoding: "utf-8" });
        return path.join(JSON.parse(content).dataPath, "Data/systems/pf2e/packs");
    } catch (_error) {
        return path.join(process.cwd(), "dist/packs");
    }
})();

const tempDataPath = path.resolve(process.cwd(), "packs/temp-data");
const dataPath = path.resolve(process.cwd(), "packs/data");
const packsMetadata = systemJSON.packs as unknown as CompendiumMetadata[];

const npcSystemKeys = new Set(Object.keys({ ...templateJSON.Actor.templates.common, ...templateJSON.Actor.npc }));

const idsToNames: Map<string, Map<string, string>> = new Map();

const linkPatterns = {
    world: /@(?:Item|JournalEntry|Actor)\[[^\]]+\]|@Compendium\[world\.[^\]]+\]/g,
    compendium: /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<entityName>[^\]]+)\]\{?/g,
    components: /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<entityName>[^\]]+)\]\{?/,
};

type CompendiumDocumentPF2e = ActorPF2e | ItemPF2e | JournalEntry | Macro | RollTable;
type PackEntry = CompendiumDocumentPF2e["data"]["_source"];

function assertEntityIdSame(newEntity: PackEntry, jsonPath: string): void {
    if (fs.existsSync(jsonPath)) {
        const oldEntity = JSON.parse(fs.readFileSync(jsonPath, { encoding: "utf-8" })) as PackEntry;
        if (oldEntity._id !== newEntity._id) {
            throw PackError(
                `The ID of entity "${newEntity.name}" (${newEntity._id}) does not match the current ID ` +
                    `(${oldEntity._id}). Entities that are already in the system must keep their current ID.`
            );
        }
    }
}

/** Walk object tree and make appropriate deletions */
function pruneTree(entityData: PackEntry, topLevel: PackEntry): void {
    type DocumentKey = keyof PackEntry;
    for (const key in entityData) {
        if (key === "_id") {
            topLevel = entityData;
            delete entityData.folder;
            if ("type" in entityData) {
                if (isActorSource(entityData)) {
                    delete (entityData.data as { schema?: unknown }).schema;

                    (entityData.token as Partial<foundry.data.PrototypeTokenSource>) = {
                        disposition: entityData.token.disposition,
                        height: entityData.token.height,
                        img: entityData.token.img,
                        name: entityData.token.name,
                        width: entityData.token.width,
                    };
                }
                if (isItemSource(entityData)) {
                    delete (entityData.data as { schema?: unknown }).schema;
                    entityData.data.description = { value: entityData.data.description.value };
                }
                if (entityData.type !== "script") {
                    delete (entityData as Partial<PackEntry>).permission;
                }
                if (entityData.type === "npc") {
                    for (const key of Object.keys(entityData.data)) {
                        if (!npcSystemKeys.has(key)) {
                            delete (entityData.data as NPCSystemData & { extraneous?: unknown })[key as "extraneous"];
                        }
                    }
                }
            }
        } else if (["_modifiers", "_sheetTab"].includes(key)) {
            delete entityData[key as DocumentKey];
        } else if (entityData[key as DocumentKey] instanceof Object) {
            pruneTree(entityData[key as DocumentKey] as PackEntry, topLevel);
        }
    }
}

function sanitizeDocument<T extends PackEntry>(entityData: T, { isEmbedded } = { isEmbedded: false }): T {
    // Clear non-core/pf2e flags
    for (const flagScope in entityData.flags) {
        if (!["core", "pf2e"].includes(flagScope) || !isEmbedded) {
            delete entityData.flags[flagScope];
        }
    }

    if (!isEmbedded) {
        entityData.permission = { default: entityData.permission?.default ?? 0 };
        delete (entityData as Partial<typeof entityData>).sort;

        if (isItemSource(entityData)) {
            const slug = entityData.data.slug;
            if (typeof slug === "string" && slug !== sluggify(entityData.name)) {
                console.warn(
                    `Warning: Name change detected on ${entityData.name}. ` +
                        "Please remember to create a slug migration before next release."
                );
            }

            delete (entityData.data as { slug?: unknown }).slug;
            entityData.flags = entityData.type === "condition" ? { pf2e: { condition: true } } : {};
        }

        if (isActorSource(entityData)) {
            if (!entityData.effects.some((effect) => effect.origin?.startsWith("Actor."))) {
                for (const effect of entityData.effects) {
                    effect.origin = "";
                }
            }
        }
    }

    pruneTree(entityData, entityData);

    // Clean up description HTML
    const cleanDescription = (description: string) => {
        if (!description) {
            return "";
        }

        const $description = ((): JQuery => {
            try {
                return $(
                    description.startsWith("<p>") && /<\/(?:p|ol|ul|table)>$/.test(description)
                        ? description
                        : `<p>${description}</p>`
                );
            } catch (error) {
                console.error(error);
                throw PackError(
                    `Failed to parse description of ${entityData.name} (${entityData._id}):\n${description}`
                );
            }
        })();

        // Strip out span tags from AoN copypasta
        const selectors = ["span#ctl00_MainContent_DetailedOutput", "span.fontstyle0"];
        for (const selector of selectors) {
            $description.find(selector).each((_i, span) => {
                $(span)
                    .contents()
                    .unwrap(selector)
                    .each((_j, node) => {
                        if (node.nodeName === "#text") {
                            node.textContent = node.textContent!.trim();
                        }
                    });
            });
        }

        // Sometimes Foundry's conversion of entity links to anchor tags makes it into an export: convert them back
        const $anchors = $description.find("a.entity-link");
        $anchors.each((_i, anchor) => {
            const $anchor = $(anchor);
            const label = $anchor.text().trim();
            const packName = $anchor.attr("data-pack");
            const entityId = $anchor.attr("data-id");
            $anchor.text(`@Compendium[${packName}.${entityId}]{${label}}`);
            $anchor.contents().unwrap();
        });

        return $("<div>")
            .append($description)
            .html()
            .replace(/<([hb]r)>/g, "<$1 />") // Prefer self-closing tags
            .replace(/&nbsp;/g, " ")
            .replace(/ {2,}/g, " ")
            .replace(/<p> ?<\/p>/g, "")
            .replace(/<\/p> ?<p>/g, "</p><p>")
            .replace(/<p>[ \r\n]+/g, "<p>")
            .replace(/[ \r\n]+<\/p>/g, "</p>")
            .replace(/<(?:b|strong)>\s*/g, "<strong>")
            .replace(/\s*<\/(?:b|strong)>/g, "</strong>")
            .replace(/(<\/strong>)(\w)/g, "$1 $2")
            .replace(/(<p><\/p>)/g, "")
            .trim();
    };

    if ("data" in entityData && "description" in entityData.data) {
        const description = entityData.data.description;
        description.value = cleanDescription(description.value);
    }

    return entityData;
}

const newEntityIdMap: Record<string, string> = {};

function convertLinks(entityData: PackEntry, packName: string): PackEntry {
    newEntityIdMap[entityData._id] = entityData.name;

    const sanitized = sanitizeDocument(entityData);
    if (isActorSource(sanitized)) {
        sanitized.items = sanitized.items.map((itemData) => sanitizeDocument(itemData, { isEmbedded: true }));
    }
    const entityJson = JSON.stringify(sanitized);

    // Link checks

    const worldItemLinks = Array.from(entityJson.matchAll(linkPatterns.world));
    if (worldItemLinks.length > 0) {
        const linkString = worldItemLinks.map((match) => match[0]).join(", ");
        console.warn(`${entityData.name} (${packName}) has links to world items: ${linkString}`);
    }

    const compendiumLinks = Array.from(entityJson.matchAll(linkPatterns.compendium)).map((match) => match[0]);
    const linksLackingLabels = compendiumLinks.filter((link) => !link.endsWith("{"));
    if (linksLackingLabels.length > 0) {
        const linkString = linksLackingLabels.map((match) => match[0]).join(", ");
        throw PackError(`${entityData.name} (${packName}) has links with no labels: ${linkString}`);
    }

    // Convert links by ID to links by name

    const notFound: string[] = [];
    const convertedJson = compendiumLinks.reduce((partiallyConverted, linkById) => {
        const match = linkPatterns.components.exec(linkById);
        if (!Array.isArray(match)) {
            throw PackError("Unexpected error looking for compendium link");
        }
        const [packId, entityId] = match.slice(1, 3);
        const packMap = idsToNames.get(packId);
        if (packMap === undefined) {
            throw PackError(`Pack ${packId} has no ID-to-name map.`);
        }

        const entityName = packMap.get(entityId) ?? newEntityIdMap[entityId];
        if (entityName === undefined) {
            notFound.push(match[0].replace(/\{$/, ""));
            return partiallyConverted;
        }

        const replacePattern = new RegExp(`(?<!"_?id":")${entityId}`, "g");
        return partiallyConverted.replace(replacePattern, entityName);
    }, entityJson);

    // In case some new items with links to other new items weren't found
    if (notFound.length > 0) {
        const idsNotFound = notFound.join(", ");
        console.debug(
            `Warning: Unable to find names for the following links in ${entityData.name} ` +
                `(${packName}): ${idsNotFound}`
        );
    }

    return JSON.parse(convertedJson) as PackEntry;
}

async function getAllData(filename: string): Promise<PackEntry[]> {
    const packDB = Datastore.create({ filename, corruptAlertThreshold: 10 });
    await packDB.load();

    return packDB.find({}) as Promise<PackEntry[]>;
}

function sortDataItems(entityData: PackEntry): any[] {
    const itemTypeList: string[] = [
        "spellcastingEntry",
        "spell",
        "weapon",
        "armor",
        "equipment",
        "consumable",
        "treasure",
        "melee",
        "action",
        "lore",
        "formula",
    ];
    if (!("items" in entityData)) {
        return [];
    }

    const entityItems: ItemSourcePF2e[] = entityData.items;
    const groupedItems: Map<string, Set<ItemSourcePF2e>> = new Map();

    // Separate the data items into type collections.
    entityItems.forEach((item) => {
        if (!item?.type) {
            return;
        }

        if (!groupedItems.has(item.type)) {
            groupedItems.set(item.type, new Set<ItemSourcePF2e>());
        }

        const itemGroup = groupedItems.get(item.type);
        if (itemGroup) {
            itemGroup.add(item);
        }
    });

    // Create new array of items.
    const sortedItems: any[] = new Array(entityItems.length);
    let itemIndex = 0;
    itemTypeList.forEach((itemType) => {
        if (groupedItems.has(itemType) && groupedItems.size > 0) {
            const itemGroup = groupedItems.get(itemType);
            if (itemGroup) {
                let items: ItemSourcePF2e[];
                switch (itemType) {
                    case "spell":
                        items = sortSpells(itemGroup);
                        break;
                    case "action":
                        items = sortActions(entityData.name, itemGroup);
                        break;
                    case "lore":
                        items = Array.from(itemGroup).sort((a, b) => a.name.localeCompare(b.name));
                        break;
                    case "melee":
                        items = sortAttacks(entityData.name, itemGroup);
                        break;
                    default:
                        items = Array.from(itemGroup);
                }

                items.forEach((item) => {
                    sortedItems[itemIndex] = item;
                    itemIndex += 1;
                    item.sort = 100000 * itemIndex;
                });
            }
        }
    });

    // Make sure to add any items that are of a type not defined in the list.
    groupedItems.forEach((itemGroup, key) => {
        if (!itemTypeList.includes(key)) {
            if (args.logWarnings) {
                console.log(
                    `Warning in ${entityData.name}: Item type '${key}' is currently unhandled in sortDataItems. Consider adding.`
                );
            }
            Array.from(itemGroup).forEach((item) => {
                sortedItems[itemIndex] = item;
                itemIndex += 1;
                item.sort = 100000 * itemIndex;
            });
        }
    });

    return sortedItems;
}

function sortAttacks(entityName: string, attacks: Set<ItemSourcePF2e>): ItemSourcePF2e[] {
    attacks.forEach((attack) => {
        const attackData = attack as MeleeSource;
        if (!attackData.data.weaponType?.value && args.logWarnings) {
            console.log(`Warning in ${entityName}: Melee item '${attackData.name}' has no weaponType defined!`);
        }
    });
    return Array.from(attacks).sort((a, b) => {
        const attackA = a as MeleeSource;
        const attackB = b as MeleeSource;
        if (attackA.data.weaponType?.value) {
            if (!attackB.data.weaponType?.value) {
                return -1;
            }

            return attackA.data.weaponType.value.localeCompare(attackB.data.weaponType.value);
        } else if (attackB.data.weaponType?.value) {
            return 1;
        }

        return 0;
    });
}

function sortActions(entityName: string, actions: Set<ItemSourcePF2e>): ItemSourcePF2e[] {
    actions.forEach((action) => {
        const actionData = action as ActionSource;
        if (!actionData.data.actionCategory?.value && args.logWarnings) {
            console.log(`Warning in ${entityName}: Action item '${actionData.name}' has no actionCategory defined!`);
        }
    });
    return Array.from(actions).sort((a, b) => {
        const actionA = a as ActionSource;
        const actionB = b as ActionSource;
        const aActionCategory = actionA.data.actionCategory.value;
        const bActionCategory = actionB.data.actionCategory.value;
        if (aActionCategory && !bActionCategory) {
            return -1;
        } else if (!aActionCategory && bActionCategory) {
            return 1;
        } else {
            if (aActionCategory == bActionCategory) {
                return 0;
            }

            if (aActionCategory == "interaction") {
                return -1;
            }

            if (bActionCategory == "interaction") {
                return 1;
            }

            if (aActionCategory == "defensive") {
                return -1;
            }

            return 1;
        }
    });
}

function sortSpells(spells: Set<ItemSourcePF2e>): SpellSource[] {
    return Array.from(spells).sort((a, b) => {
        const spellA = a as SpellSource;
        const spellB = b as SpellSource;
        const aLevel = spellA.data.level;
        const bLevel = spellB.data.level;
        if (aLevel && !bLevel) {
            return -1;
        } else if (!aLevel && bLevel) {
            return 1;
        } else if (aLevel && bLevel) {
            const levelDiff = bLevel.value - aLevel.value;
            if (levelDiff != 0) {
                return levelDiff;
            }
        }

        return a.name.localeCompare(b.name);
    }) as SpellSource[];
}

async function extractPack(filePath: string, packFilename: string) {
    console.log(`Extracting pack: ${packFilename} (Presorting: ${args.disablePresort ? "Disabled" : "Enabled"})`);
    const outPath = path.resolve(tempDataPath, packFilename);

    const packEntities = await getAllData(filePath);
    const idPattern = /^[a-z0-9]{20,}$/g;

    for await (const entityData of packEntities) {
        // Remove or replace unwanted values from the entity
        const preparedEntity = convertLinks(entityData, packFilename);
        if ("items" in preparedEntity && preparedEntity.type === "npc" && !args.disablePresort) {
            preparedEntity.items = sortDataItems(preparedEntity);
        }

        // Pretty print JSON data
        const outData = (() => {
            const allKeys: Set<string> = new Set();
            const idKeys: string[] = [];

            JSON.stringify(preparedEntity, (key, value) => {
                if (idPattern.test(key)) {
                    idKeys.push(key);
                } else {
                    allKeys.add(key);
                }

                return value;
            });

            const sortedKeys = Array.from(allKeys).sort().concat(idKeys);

            const newJson = JSON.stringify(preparedEntity, sortedKeys, 4);
            return `${newJson}\n`;
        })();

        // Remove all non-alphanumeric characters from the name
        const slug = sluggify(entityData.name);
        const outFileName = `${slug}.json`;
        const outFilePath = path.resolve(outPath, outFileName);

        if (fs.existsSync(outFilePath)) {
            throw PackError(`Error: Duplicate name "${entityData.name}" in pack: ${packFilename}`);
        }

        assertEntityIdSame(preparedEntity, outFilePath);

        // Write the JSON file
        await fs.promises.writeFile(outFilePath, outData, "utf-8");
    }

    return packEntities.length;
}

function populateIdNameMap() {
    const packDirs = fs.readdirSync(dataPath);

    for (const packDir of packDirs) {
        const metadata = packsMetadata.find((pack) => path.basename(pack.path) === packDir);
        if (metadata === undefined) {
            throw PackError(`Compendium at ${packDir} has metadata in the local system.json file.`);
        }

        const packMap: Map<string, string> = new Map();
        idsToNames.set(metadata.name, packMap);

        const filenames = fs.readdirSync(path.resolve(dataPath, packDir));
        const filePaths = filenames.map((filename) => path.resolve(dataPath, packDir, filename));

        for (const filePath of filePaths) {
            const jsonString = fs.readFileSync(filePath, "utf-8");
            const entityData = (() => {
                try {
                    return JSON.parse(jsonString);
                } catch (error) {
                    throw PackError(`File at ${filePath} could not be parsed: ${error.message}`);
                }
            })();
            packMap.set(entityData._id, entityData.name);
        }
    }
}

// Extract one or all packs
async function extractPacks() {
    if (!fs.existsSync(dataPath)) {
        await fs.promises.mkdir(dataPath);
    }
    if (!fs.existsSync(packsPath)) {
        throw Error("Foundry directory not found! Check your foundryconfig.json.");
    }

    console.log("Cleaning up old temp data...");
    await fs.promises.rmdir(tempDataPath, { recursive: true });
    await fs.promises.mkdir(tempDataPath);

    populateIdNameMap();

    const foundryPacks = (args.packDb === "all" ? fs.readdirSync(packsPath) : [args.packDb])
        .filter((filename) => filename !== "Spells (SRD) - LICENSE")
        .map((filename) => path.resolve(packsPath, filename));

    return (
        await Promise.all(
            foundryPacks.map(async (filePath) => {
                const dbFilename = path.basename(filePath);

                if (!dbFilename.endsWith(".db")) {
                    throw PackError(`Pack file is not a DB file: '${dbFilename}'`);
                }
                if (!fs.existsSync(filePath)) {
                    throw PackError(`File not found: '${dbFilename}'`);
                }

                const outDirPath = path.resolve(dataPath, dbFilename);
                const tempOutDirPath = path.resolve(tempDataPath, dbFilename);

                await fs.promises.mkdir(tempOutDirPath);

                const entityCount = await extractPack(filePath, dbFilename);

                // Move ./packs/temp-data/[packname].db/ to ./packs/data/[packname].db/
                fs.rmdirSync(outDirPath, { recursive: true });
                await fs.promises.rename(tempOutDirPath, outDirPath);

                console.log(`Finished extracting ${entityCount} entities from pack ${dbFilename}`);
                return entityCount;
            })
        )
    ).reduce((runningTotal, entityCount) => runningTotal + entityCount, 0);
}

extractPacks()
    .then((grandTotal) => {
        fs.rmdirSync(tempDataPath, { recursive: true });
        console.log(`Extraction complete (${grandTotal} total entities).`);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
