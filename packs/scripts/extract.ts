import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import Datastore from "nedb-promises";
import yargs from "yargs";
import { JSDOM } from "jsdom";
import type { ActorPF2e } from "@actor/base";
import type { ItemPF2e } from "@item/base";
import { isObject, sluggify } from "@util";
import systemJSON from "system.json";
import templateJSON from "static/template.json";
import { ActionSource, ItemSourcePF2e, MeleeSource, SpellSource } from "@item/data";
import { NPCSystemData } from "@actor/npc/data";
import { CompendiumPack, isActorSource, isItemSource } from "./packman/compendium-pack";
import { isPhysicalData } from "@item/data/helpers";
import { ActorSourcePF2e } from "@actor/data";

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

// Show error message without needless stack trace
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
                    default: "./foundryconfig.json",
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
    .parseSync();

const packsPath = (() => {
    try {
        const content = fs.readFileSync(args.foundryConfig ?? "", { encoding: "utf-8" });
        const config = JSON.parse(content) ?? {};
        return path.join(config.dataPath, "Data", "systems", config.systemName ?? "pf2e", "packs");
    } catch (_error) {
        return path.join(process.cwd(), "dist", "packs");
    }
})();

const tempDataPath = path.resolve(process.cwd(), "packs/temp-data");
const dataPath = path.resolve(process.cwd(), "packs/data");
const packsMetadata = systemJSON.packs as unknown as CompendiumMetadata[];

const npcSystemKeys = new Set(Object.keys({ ...templateJSON.Actor.templates.common, ...templateJSON.Actor.npc }));

const idsToNames: Map<string, Map<string, string>> = new Map();

const linkPatterns = {
    world: /@(?:Item|JournalEntry|Actor)\[[^\]]+\]|@Compendium\[world\.[^\]]+\]/g,
    compendium: /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<docName>[^\]]+)\]\{?/g,
    components: /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<docName>[^\]]+)\]\{?/,
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

/** The last actor inspected in `pruneTree` */
let lastActor: ActorSourcePF2e | undefined;

/** Walk object tree and make appropriate deletions */
function pruneTree(docSource: PackEntry, topLevel: PackEntry): void {
    type DocumentKey = keyof PackEntry;
    for (const key in docSource) {
        if (key === "_id") {
            topLevel = docSource;
            delete docSource.folder;

            docSource.img &&= docSource.img.replace(
                "https://assets.forge-vtt.com/bazaar/systems/pf2e/assets/",
                "systems/pf2e/"
            ) as ImagePath;

            if (isObject(docSource.flags?.pf2e) && Object.keys(docSource.flags.pf2e).length === 0) {
                delete docSource.flags.pf2e;
            }
            if (Object.keys(docSource.flags ?? {}).length === 0) {
                delete (docSource as { flags?: object }).flags;
            }

            if ("type" in docSource) {
                if (isActorSource(docSource)) {
                    lastActor = docSource;
                    delete (docSource as { effects?: unknown }).effects;
                    delete (docSource.data as { schema?: unknown }).schema;
                    docSource.name = docSource.name.trim();

                    (docSource.token as Partial<foundry.data.PrototypeTokenSource>) = {
                        disposition: docSource.token.disposition,
                        height: docSource.token.height,
                        img: docSource.token.img.replace(
                            "https://assets.forge-vtt.com/bazaar/systems/pf2e/assets/",
                            "systems/pf2e/"
                        ) as VideoPath,
                        name: docSource.token.name,
                        width: docSource.token.width,
                    };

                    if (docSource.type === "npc") {
                        const { source } = docSource.data.details;
                        source.author = source.author?.trim() || undefined;

                        const { speed } = docSource.data.attributes;
                        speed.details = speed.details?.trim() || undefined;
                    }
                }

                // Prune several common item data defaults
                if (isItemSource(docSource)) {
                    delete (docSource as { effects?: unknown }).effects;
                    delete (docSource.data as { schema?: unknown }).schema;
                    docSource.name = docSource.name.trim();

                    docSource.data.description = { value: docSource.data.description.value };
                    if (isPhysicalData(docSource)) {
                        delete (docSource.data as { identification?: unknown }).identification;
                    } else if (docSource.type === "action" && !docSource.data.deathNote) {
                        delete (docSource.data as { deathNote?: boolean }).deathNote;
                    } else if (docSource.type === "spellcastingEntry" && lastActor?.type === "npc") {
                        delete (docSource.data as { ability?: unknown }).ability;
                    } else if (docSource.type === "feat") {
                        const isFeat = !["ancestryfeature", "classfeature"].includes(docSource.data.featType.value);
                        if (isFeat && docSource.img === "systems/pf2e/icons/default-icons/feat.svg") {
                            docSource.img = "systems/pf2e/icons/features/feats/feats.webp";
                        }
                        if (docSource.data.maxTakable === 1) {
                            delete (docSource.data as { maxTakable?: number }).maxTakable;
                        }
                        if (!docSource.data.onlyLevel1) {
                            delete (docSource.data as { onlyLevel1?: boolean }).onlyLevel1;
                        }
                    }
                }
                if (docSource.type !== "script") {
                    delete (docSource as Partial<PackEntry>).permission;
                }
                if (docSource.type === "npc") {
                    for (const key of Object.keys(docSource.data)) {
                        if (!npcSystemKeys.has(key)) {
                            delete (docSource.data as NPCSystemData & { extraneous?: unknown })[key as "extraneous"];
                        }
                    }
                }
            }
        } else if (["_modifiers", "_sheetTab"].includes(key)) {
            delete docSource[key as DocumentKey];
        } else if (docSource[key as DocumentKey] instanceof Object) {
            pruneTree(docSource[key as DocumentKey] as unknown as PackEntry, topLevel);
        }
    }
}

function sanitizeDocument<T extends PackEntry>(docSource: T, { isEmbedded } = { isEmbedded: false }): T {
    // Clear non-core/pf2e flags
    for (const flagScope in docSource.flags) {
        if (!["core", "pf2e"].includes(flagScope) || !isEmbedded) {
            delete docSource.flags[flagScope];
        }
    }

    if (!isEmbedded) {
        docSource.permission = { default: docSource.permission?.default ?? 0 };
        delete (docSource as Partial<typeof docSource>).sort;

        if (isItemSource(docSource)) {
            const slug = docSource.data.slug;
            if (typeof slug === "string" && slug !== sluggify(docSource.name)) {
                console.warn(
                    `Warning: Name change detected on ${docSource.name}. ` +
                        "Please remember to create a slug migration before next release."
                );
            }

            delete (docSource.data as { slug?: unknown }).slug;
            docSource.flags = docSource.type === "condition" ? { pf2e: { condition: true } } : {};
            if (isPhysicalData(docSource)) {
                delete (docSource.data as { equipped?: unknown }).equipped;
            }
        }
    }

    pruneTree(docSource, docSource);

    // Clean up description HTML
    const cleanDescription = (description: string): string => {
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
                throw PackError(`Failed to parse description of ${docSource.name} (${docSource._id}):\n${description}`);
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
            .replace(/<\/p> ?<p>/g, "</p>\n<p>")
            .replace(/<p>[ \r\n]+/g, "<p>")
            .replace(/[ \r\n]+<\/p>/g, "</p>")
            .replace(/<(?:b|strong)>\s*/g, "<strong>")
            .replace(/\s*<\/(?:b|strong)>/g, "</strong>")
            .replace(/(<\/strong>)(\w)/g, "$1 $2")
            .replace(/(<p><\/p>)/g, "")
            .trim();
    };

    if ("data" in docSource && "description" in docSource.data) {
        const description = docSource.data.description;
        description.value = cleanDescription(description.value);
    } else if ("content" in docSource) {
        docSource.content = cleanDescription(docSource.content);
    }

    return docSource;
}

const newDocIdMap: Record<string, string> = {};

function convertLinks(docSource: PackEntry, packName: string): PackEntry {
    newDocIdMap[docSource._id] = docSource.name;

    const sanitized = sanitizeDocument(docSource);
    if (isActorSource(sanitized)) {
        sanitized.items = sanitized.items.map((itemData) => sanitizeDocument(itemData, { isEmbedded: true }));
    }

    if (isItemSource(sanitized)) {
        CompendiumPack.convertRuleUUIDs(sanitized, { to: "names", map: idsToNames });
    }

    const docJSON = JSON.stringify(sanitized);

    // Link checks
    const worldItemLinks = Array.from(docJSON.matchAll(linkPatterns.world));
    if (worldItemLinks.length > 0) {
        const linkString = worldItemLinks.map((match) => match[0]).join(", ");
        console.warn(`${docSource.name} (${packName}) has links to world items: ${linkString}`);
    }

    const compendiumLinks = Array.from(docJSON.matchAll(linkPatterns.compendium)).map((match) => match[0]);

    // Convert links by ID to links by name
    const notFound: string[] = [];
    const convertedJson = compendiumLinks.reduce((partiallyConverted, linkById) => {
        const parts = linkPatterns.components.exec(linkById);
        if (!Array.isArray(parts)) {
            throw PackError("Unexpected error parsing compendium link");
        }
        const [packId, docId] = parts.slice(1, 3);
        const packMap = idsToNames.get(packId);
        if (packMap === undefined) {
            throw PackError(`Pack ${packId} has no ID-to-name map.`);
        }

        const docName = packMap.get(docId) ?? newDocIdMap[docId];
        if (docName === undefined) {
            notFound.push(parts[0].replace(/\{$/, ""));
            return partiallyConverted;
        }

        const replacePattern = new RegExp(`(?<!"_?id":")${docId}(?=\\])`, "g");
        return partiallyConverted.replace(replacePattern, docName);
    }, docJSON);

    // In case some new items with links to other new items weren't found
    if (notFound.length > 0) {
        const idsNotFound = notFound.join(", ");
        console.debug(
            `Warning: Unable to find names for the following links in ${docSource.name} ` +
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

function sortDataItems(docSource: PackEntry): ItemSourcePF2e[] {
    const itemTypeList: string[] = [
        "spellcastingEntry",
        "spell",
        "weapon",
        "armor",
        "equipment",
        "consumable",
        "treasure",
        "backpack",
        "condition",
        "effect",
        "melee",
        "action",
        "lore",
        "formula",
    ];
    if (!("items" in docSource)) {
        return [];
    }

    const ownedItems = docSource.items;
    const groupedItems: Map<string, Set<ItemSourcePF2e>> = new Map();

    // Separate the data items into type collections.
    for (const item of ownedItems) {
        if (!groupedItems.has(item.type)) {
            groupedItems.set(item.type, new Set<ItemSourcePF2e>());
        }

        const itemGroup = groupedItems.get(item.type);
        if (itemGroup) {
            itemGroup.add(item);
        }
    }

    // Create new array of items.
    const sortedItems: ItemSourcePF2e[] = new Array(ownedItems.length);
    let itemIndex = 0;
    itemTypeList.forEach((itemType) => {
        if (groupedItems.has(itemType) && groupedItems.size > 0) {
            const itemGroup = groupedItems.get(itemType);
            if (itemGroup) {
                let items: ItemSourcePF2e[];
                switch (itemType) {
                    case "spellcastingEntry":
                        items = sortSpellcastingEntries(docSource.name, itemGroup);
                        break;
                    case "spell":
                        items = sortSpells(itemGroup);
                        break;
                    case "action":
                        items = sortActions(docSource.name, itemGroup);
                        break;
                    case "lore":
                        items = Array.from(itemGroup).sort((a, b) => a.name.localeCompare(b.name));
                        break;
                    case "melee":
                        items = sortAttacks(docSource.name, itemGroup);
                        break;
                    default:
                        items = Array.from(itemGroup);
                }

                for (const item of items) {
                    sortedItems[itemIndex] = item;
                    itemIndex += 1;
                    item.sort = 100000 * itemIndex;
                }
            }
        }
    });

    // Make sure to add any items that are of a type not defined in the list.
    for (const [key, itemSet] of groupedItems) {
        if (!itemTypeList.includes(key)) {
            if (args.logWarnings) {
                console.log(
                    `Warning in ${docSource.name}: Item type '${key}' is currently unhandled in sortDataItems. Consider adding.`
                );
            }
            for (const item of itemSet) {
                sortedItems[itemIndex] = item;
                itemIndex += 1;
                item.sort = 100000 * itemIndex;
            }
        }
    }

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

function sortActionsWithOverrides(
    entityName: string,
    actions: Array<ActionSource>,
    overrides: Map<RegExp, string>
): Array<ItemSourcePF2e> {
    const topActions = new Array<ItemSourcePF2e>();
    const middleActions = new Array<ItemSourcePF2e>();
    const bottomActions = new Array<ItemSourcePF2e>();

    overrides.forEach((overrideArray, overrideRegex) => {
        const interaction = actions.find((action) => overrideRegex.exec(action.name));
        if (interaction) {
            if (overrideArray === "top") {
                topActions.push(interaction);
            } else if (overrideArray === "bottom") {
                bottomActions.push(interaction);
            } else {
                if (args.logWarnings) {
                    console.log(
                        `Warning in ${entityName}: Override item '${overrideRegex}' has undefined override section '${overrideArray}', should be top or bottom!`
                    );
                }
            }
        }
    });

    actions.forEach((interaction) => {
        if (!topActions.includes(interaction) && !bottomActions.includes(interaction)) {
            middleActions.push(interaction);
        }
    });

    return topActions.concat(middleActions, bottomActions);
}

function sortSpellcastingEntries(entityName: string, actions: Set<ItemSourcePF2e>): Array<ItemSourcePF2e> {
    const overrides = new Map<RegExp, string>([
        [new RegExp("Prepared Spells"), "top"],
        [new RegExp("Spontaneous Spells"), "top"],
        [new RegExp("Innate Spells"), "top"],
        [new RegExp("Ritual Spells"), "top"],
    ]);

    const castActions = new Array<ActionSource>();
    actions.forEach((x) => castActions.push(x as ActionSource));
    return sortActionsWithOverrides(entityName, castActions, overrides);
}

function sortInteractions(entityName: string, actions: Array<ActionSource>): Array<ItemSourcePF2e> {
    const overrides = new Map<RegExp, string>([
        [new RegExp("Low-Light Vision"), "top"],
        [new RegExp("^Darkvision"), "top"],
        [new RegExp("Greater Darkvision"), "top"],
        [new RegExp("Tremorsense"), "top"],
        [new RegExp("Scent"), "top"],
        [new RegExp("Telepathy"), "top"],
        [new RegExp("At-Will Spells"), "bottom"],
        [new RegExp("Constant Spells"), "bottom"],
    ]);

    return sortActionsWithOverrides(entityName, actions, overrides);
}

function sortDefensiveActions(entityName: string, actions: Array<ActionSource>): Array<ItemSourcePF2e> {
    const overrides = new Map<RegExp, string>([
        [new RegExp("All-Around Vision"), "top"],
        [
            new RegExp(
                "(\\+|\\-)\\d+ (Status|Circumstance) (Bonus )?(to|on) ((All|Fortitude|Reflex|Will) )?Saves",
                "i"
            ),
            "top",
        ],
        [new RegExp("Fast Healing"), "top"],
        [new RegExp("Negative Healing"), "top"],
        [new RegExp("Regeneration"), "top"],
        [new RegExp("Swarm Mind"), "top"],
    ]);

    return sortActionsWithOverrides(entityName, actions, overrides);
}

function sortOffensiveActions(entityName: string, actions: Array<ActionSource>): Array<ItemSourcePF2e> {
    const overrides = new Map<RegExp, string>([
        [new RegExp("^Grab"), "bottom"],
        [new RegExp("Improved Grab"), "bottom"],
        [new RegExp("^Knockdown"), "bottom"],
        [new RegExp("Improved Knockdown"), "bottom"],
        [new RegExp("^Push"), "bottom"],
        [new RegExp("Improved Push"), "bottom"],
    ]);

    return sortActionsWithOverrides(entityName, actions, overrides);
}

function sortActions(entityName: string, actions: Set<ItemSourcePF2e>): ItemSourcePF2e[] {
    const notActions = new Array<[string, string]>(
        ["Innate Spells", "spellcastingEntry"],
        ["Prepared Spells", "spellcastingEntry"],
        ["Ritual Spells", "spellcastingEntry"],
        ["Spontaneous Spells", "spellcastingEntry"]
    );
    const actionsMap = new Map<string, Array<ActionSource>>([
        ["interaction", new Array<ActionSource>()],
        ["defensive", new Array<ActionSource>()],
        ["offensive", new Array<ActionSource>()],
        ["other", new Array<ActionSource>()],
    ]);

    Array.from(actions)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((action) => {
            const actionData = action as ActionSource;
            const notActionMatch = notActions.find((naName) => actionData.name.match(naName[0]));
            if (notActionMatch) {
                console.log(
                    `Error in ${entityName}: ${notActionMatch[0]} has type action but should be type ${notActionMatch[1]}!`
                );
            }
            if (!actionData.data.actionCategory?.value) {
                if (args.logWarnings) {
                    console.log(
                        `Warning in ${entityName}: Action item '${actionData.name}' has no actionCategory defined!`
                    );
                }
                actionsMap.get("other")!.push(actionData);
            } else {
                let actionCategory = actionData.data.actionCategory.value;
                if (!actionsMap.has(actionCategory)) {
                    actionCategory = "other";
                }
                actionsMap.get(actionCategory)!.push(actionData);
            }
        });

    const sortedInteractions = sortInteractions(entityName, actionsMap.get("interaction")!);
    const sortedDefensive = sortDefensiveActions(entityName, actionsMap.get("defensive")!);
    const sortedOffensive = sortOffensiveActions(entityName, actionsMap.get("offensive")!);

    return sortedInteractions.concat(sortedDefensive, sortedOffensive, actionsMap.get("other")!);
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
            if (levelDiff !== 0) {
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
                    if (error instanceof Error) {
                        throw PackError(`File at ${filePath} could not be parsed: ${error.message}`);
                    }
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
    await fs.promises.rm(tempDataPath, { recursive: true, force: true });
    await fs.promises.mkdir(tempDataPath);

    populateIdNameMap();

    // Silly windows users
    args.packDb = args.packDb.toLowerCase();

    const foundryPacks = (args.packDb === "all" ? fs.readdirSync(packsPath) : [args.packDb])
        .filter((filename) => filename !== ".gitkeep")
        .map((filename) => path.resolve(packsPath, filename));

    return (
        await Promise.all(
            foundryPacks.map(async (filePath) => {
                const dbFilename = path.basename(filePath);

                if (!dbFilename.endsWith(".db")) {
                    throw PackError(`Pack file is not a DB file: "${dbFilename}"`);
                }
                if (!fs.existsSync(filePath)) {
                    throw PackError(`File not found: "${dbFilename}"`);
                }

                const outDirPath = path.resolve(dataPath, dbFilename);
                const tempOutDirPath = path.resolve(tempDataPath, dbFilename);

                await fs.promises.mkdir(tempOutDirPath);

                const entityCount = await extractPack(filePath, dbFilename);

                // Move ./packs/temp-data/[packname].db/ to ./packs/data/[packname].db/
                fs.rmSync(outDirPath, { recursive: true, force: true });
                await fs.promises.rename(tempOutDirPath, outDirPath);

                console.log(`Finished extracting ${entityCount} entities from pack ${dbFilename}`);
                return entityCount;
            })
        )
    ).reduce((runningTotal, entityCount) => runningTotal + entityCount, 0);
}

extractPacks()
    .then((grandTotal) => {
        fs.rmSync(tempDataPath, { recursive: true, force: true });
        console.log(`Extraction complete (${grandTotal} total entities).`);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
