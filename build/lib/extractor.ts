import type { ActorSourcePF2e } from "@actor/data/index.ts";
import type { NPCAttributesSource, NPCSystemSource } from "@actor/npc/data.ts";
import { isPhysicalData } from "@item/data/helpers.ts";
import { ActionItemSource, ItemSourcePF2e, MeleeSource, SpellSource } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { isObject, sluggify } from "@util/index.ts";
import fs from "fs";
import { JSDOM } from "jsdom";
import path from "path";
import process from "process";
import systemJSON from "../../static/system.json" assert { type: "json" };
import templateJSON from "../../static/template.json" assert { type: "json" };
import { CompendiumPack, isActorSource, isItemSource } from "./compendium-pack.ts";
import { PackError, getFilesRecursively } from "./helpers.ts";
import { PackEntry } from "./types.ts";
import { DBFolder, LevelDatabase } from "./level-database.ts";

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
const $ = (await import("jquery")).default;

interface ExtractArgs {
    packDb: string;
    disablePresort?: boolean;
    logWarnings?: boolean;
}

class PackExtractor {
    /** The DB file to extract, with a special value of "all" */
    readonly packDB: string;
    /** Whether to emit warnings on some events */
    readonly emitWarnings: boolean;

    readonly dataPath: string;
    readonly tempDataPath: string;
    readonly packsMetadata: CompendiumMetadata[];

    /** The last actor inspected in `pruneTree` */
    #lastActor: ActorSourcePF2e | null = null;
    readonly #newDocIdMap: Record<string, string> = {};

    readonly #idsToNames: {
        [K in Extract<CompendiumDocumentType, "Actor" | "Item" | "JournalEntry" | "Macro" | "RollTable">]: Map<
            string,
            Map<string, string>
        >;
    } & Record<string, Map<string, Map<string, string>> | undefined> = {
        Actor: new Map(),
        Item: new Map(),
        JournalEntry: new Map(),
        Macro: new Map(),
        RollTable: new Map(),
    };

    #folderPathMap = new Map<string, string>();

    #npcSystemKeys = new Set([
        ...Object.keys(templateJSON.Actor.templates.common),
        ...Object.keys(templateJSON.Actor.npc),
        "spellcasting",
    ]);

    disablePresort: boolean;

    constructor(params: ExtractArgs) {
        this.emitWarnings = !!params.logWarnings;
        this.packDB = params.packDb;
        this.disablePresort = !!params.disablePresort;

        this.tempDataPath = path.resolve(process.cwd(), "packs-temp");
        this.dataPath = path.resolve(process.cwd(), "packs");
        this.packsMetadata = systemJSON.packs as unknown as CompendiumMetadata[];
    }

    /** Extract one or all packs */
    async run(): Promise<number> {
        if (!fs.existsSync(this.dataPath)) {
            await fs.promises.mkdir(this.dataPath);
        }

        const packsPath = path.join(process.cwd(), "dist", "packs");

        if (!fs.existsSync(packsPath)) {
            throw Error("`dist/` directory not found! Build first if you haven't.");
        }

        console.log("Cleaning up old temp data...");
        await fs.promises.rm(this.tempDataPath, { recursive: true, force: true });
        await fs.promises.mkdir(this.tempDataPath);

        this.#populateIdNameMap();

        const foundryPacks = (this.packDB === "all" ? fs.readdirSync(packsPath) : [this.packDB])
            .filter((f) => f !== ".gitkeep")
            .map((f) => path.resolve(packsPath, f));

        return (
            await Promise.all(
                foundryPacks.map(async (filePath) => {
                    const dbDirectory = path.basename(filePath);

                    if (!fs.existsSync(filePath)) {
                        throw PackError(`Directory not found: "${dbDirectory}"`);
                    }

                    const outDirPath = path.resolve(this.dataPath, dbDirectory);
                    const tempOutDirPath = path.resolve(this.tempDataPath, dbDirectory);

                    await fs.promises.mkdir(tempOutDirPath);

                    const sourceCount = await this.extractPack(filePath, dbDirectory);

                    // Move ./packs-temp/[packname]/ to ./packs/[packname]/
                    fs.rmSync(outDirPath, { recursive: true, force: true });
                    await fs.promises.rename(tempOutDirPath, outDirPath);

                    console.log(`Finished extracting ${sourceCount} documents from pack ${dbDirectory}`);
                    return sourceCount;
                })
            )
        ).reduce((runningTotal, count) => runningTotal + count, 0);
    }

    async extractPack(filePath: string, packDirectory: string): Promise<number> {
        console.log(`Extracting pack: ${packDirectory} (Presorting: ${this.disablePresort ? "Disabled" : "Enabled"})`);
        const outPath = path.resolve(this.tempDataPath, packDirectory);

        const db = new LevelDatabase(filePath, { packName: packDirectory });
        const { packSources, folders } = await db.getEntries();

        // Prepare subfolder data
        if (folders.length) {
            const getFolderPath = (folder: DBFolder, parts: string[] = []): string => {
                if (parts.length > 3) {
                    throw PackError(
                        `Error: Maximum folder depth exceeded for "${folder.name}" in pack: ${packDirectory}`
                    );
                }
                parts.unshift(sluggify(folder.name));
                if (folder.folder) {
                    // This folder is inside another folder
                    const parent = folders.find((f) => f._id === folder.folder);
                    if (!parent) {
                        throw PackError(`Error: Unknown parent folder id [${folder.folder}] in pack: ${packDirectory}`);
                    }
                    return getFolderPath(parent, parts);
                }
                parts.unshift(packDirectory);
                return path.join(...parts);
            };
            const sanitzeFolder = (folder: Partial<DBFolder>): void => {
                delete folder._stats;
            };

            for (const folder of folders) {
                this.#folderPathMap.set(folder._id, getFolderPath(folder));
                sanitzeFolder(folder);
            }
            const folderFilePath = path.resolve(outPath, "_folders.json");
            await fs.promises.writeFile(folderFilePath, this.#prettyPrintJSON(folders), "utf-8");
        }

        for (const source of packSources) {
            // Remove or replace unwanted values from the document source
            const preparedSource = this.#convertLinks(source, packDirectory);
            if ("items" in preparedSource && preparedSource.type === "npc" && !this.disablePresort) {
                preparedSource.items = this.#sortDataItems(preparedSource);
            }
            const outData = this.#prettyPrintJSON(preparedSource);

            // Remove all non-alphanumeric characters from the name
            const slug = sluggify(preparedSource.name);
            const outFileName = `${slug}.json`;

            // Handle subfolders
            const subfolder = preparedSource.folder ? this.#folderPathMap.get(preparedSource.folder) : null;
            const outFolderPath = subfolder ? path.resolve(this.tempDataPath, subfolder) : outPath;
            if (subfolder && !fs.existsSync(outFolderPath)) {
                fs.mkdirSync(outFolderPath, { recursive: true });
            }
            const outFilePath = path.resolve(outFolderPath, outFileName);

            if (fs.existsSync(outFilePath)) {
                throw PackError(`Error: Duplicate name "${preparedSource.name}" in pack: ${packDirectory}`);
            }

            this.#assertDocIdSame(preparedSource, outFilePath);

            // Write the JSON file
            await fs.promises.writeFile(outFilePath, outData, "utf-8");
        }

        return packSources.length;
    }

    #prettyPrintJSON(object: object): string {
        const idPattern = /^[a-z0-9]{20,}$/g;
        const allKeys: Set<string> = new Set();
        const idKeys: string[] = [];

        JSON.stringify(object, (key, value) => {
            if (idPattern.test(key)) {
                idKeys.push(key);
            } else {
                allKeys.add(key);
            }

            return value;
        });

        const sortedKeys = Array.from(allKeys).sort().concat(idKeys);
        const newJson = JSON.stringify(object, sortedKeys, 4);

        return `${newJson}\n`;
    }

    #assertDocIdSame(newSource: PackEntry, jsonPath: string): void {
        if (fs.existsSync(jsonPath)) {
            const oldSource = JSON.parse(fs.readFileSync(jsonPath, { encoding: "utf-8" })) as PackEntry;
            if (oldSource._id !== newSource._id) {
                throw PackError(
                    `The ID of doc "${newSource.name}" (${newSource._id}) does not match the current ID ` +
                        `(${oldSource._id}). Documents that are already in the system must keep their current ID.`
                );
            }
        }
    }

    #convertLinks(docSource: PackEntry, packName: string): PackEntry {
        this.#newDocIdMap[docSource._id!] = docSource.name;

        const sanitized = this.#sanitizeDocument(docSource);
        if (isActorSource(sanitized)) {
            sanitized.items = sanitized.items.map((itemData) => {
                CompendiumPack.convertRuleUUIDs(itemData, { to: "names", map: this.#idsToNames.Item });
                return this.#sanitizeDocument(itemData, { isEmbedded: true });
            });
        }

        if (isItemSource(sanitized)) {
            CompendiumPack.convertRuleUUIDs(sanitized, { to: "names", map: this.#idsToNames.Item });
        }

        const docJSON = JSON.stringify(sanitized).replace(/@Compendium\[/g, "@UUID[Compendium.");

        // Link checks
        const { LINK_PATTERNS } = CompendiumPack;
        const worldItemLinks = Array.from(docJSON.matchAll(LINK_PATTERNS.world));
        if (worldItemLinks.length > 0) {
            const linkString = worldItemLinks.map((match) => match[0]).join(", ");
            throw PackError(`${docSource.name} (${packName}) has links to world items: ${linkString}`);
        }

        const compendiumLinks = Array.from(docJSON.matchAll(LINK_PATTERNS.uuid))
            .map((match) => match[0])
            .filter((l) => !l.includes("JournalEntryPage."));

        // Convert links by ID to links by name
        const notFound: string[] = [];
        const convertedJson = compendiumLinks.reduce((partiallyConverted, linkById): string => {
            const components = new RegExp(LINK_PATTERNS.uuid.source);
            const parts = components.exec(linkById);
            if (!Array.isArray(parts)) {
                throw PackError("Unexpected error parsing compendium link");
            }

            const [packId, docType, docId] = parts.slice(1, 4);
            const packMap = this.#idsToNames[docType]?.get(packId);
            if (!packMap) {
                throw PackError(`Pack ${packId} has no ID-to-name map.`);
            }

            const docName = packMap.get(docId) ?? this.#newDocIdMap[docId];
            if (!docName) {
                notFound.push(parts[0].replace(/\{$/, ""));
                return partiallyConverted;
            }

            const idPattern = new RegExp(`(?<!"_?id":")${docId}(?=\\])`, "g");
            // Remove link labels when the label is the same as the document name
            const labeledLinkPattern = (() => {
                const escapedDocName = docName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
                return new RegExp(String.raw`(@UUID\[[^\]]+\])\{${escapedDocName}\}`);
            })();
            return partiallyConverted.replace(idPattern, docName).replace(labeledLinkPattern, "$1");
        }, docJSON);

        return JSON.parse(convertedJson) as PackEntry;
    }

    #sanitizeDocument<T extends PackEntry>(docSource: T, { isEmbedded } = { isEmbedded: false }): T {
        // Clear non-core/pf2e flags
        for (const flagScope in docSource.flags) {
            if (!["core", "pf2e"].includes(flagScope) || !isEmbedded) {
                delete docSource.flags[flagScope];
            }
        }

        if (!isEmbedded) {
            docSource.ownership = { default: docSource.ownership?.default ?? 0 };
            delete (docSource as Partial<typeof docSource>).sort;

            if (isItemSource(docSource)) {
                const slug = docSource.system.slug;
                if (typeof slug === "string" && slug !== sluggify(docSource.name)) {
                    console.warn(
                        `Warning: Name change detected on ${docSource.name}. ` +
                            "Please remember to create a slug migration before next release."
                    );
                }

                delete (docSource.system as { slug?: unknown }).slug;
                docSource.flags = {};
                if (isPhysicalData(docSource)) {
                    delete (docSource.system as { equipped?: unknown }).equipped;
                } else if (docSource.type === "spell" || (docSource.type === "feat" && !docSource.system.location)) {
                    delete (docSource.system as { location?: unknown }).location;
                }
            }
        }

        this.#pruneTree(docSource, docSource);

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
                    throw PackError(
                        `Failed to parse description of ${docSource.name} (${docSource._id}):\n${description}`
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

        if ("system" in docSource) {
            if ("description" in docSource.system) {
                docSource.system.description.value = cleanDescription(docSource.system.description.value);
            } else if ("details" in docSource.system && "publicNotes" in docSource.system.details) {
                docSource.system.details.publicNotes = cleanDescription(docSource.system.details.publicNotes);
            }
        } else if ("content" in docSource) {
            docSource.content = cleanDescription(docSource.content);
        }

        return docSource;
    }

    /** Walk object tree and make appropriate deletions */
    #pruneTree(docSource: PackEntry, topLevel: PackEntry): void {
        type DocumentKey = keyof PackEntry;

        for (const key in docSource) {
            if (key === "_id") {
                topLevel = docSource;
                if (docSource.folder === null) {
                    delete docSource.folder;
                }
                delete (docSource as { _stats?: unknown })._stats;

                docSource.img &&= docSource.img.replace(
                    "https://assets.forge-vtt.com/bazaar/systems/pf2e/assets/",
                    "systems/pf2e/"
                ) as ImageFilePath;

                if (isObject(docSource.flags?.pf2e) && Object.keys(docSource.flags.pf2e).length === 0) {
                    delete docSource.flags.pf2e;
                }
                if (Object.keys(docSource.flags ?? {}).length === 0) {
                    delete (docSource as { flags?: object }).flags;
                }

                if ("type" in docSource) {
                    if (isActorSource(docSource) || isItemSource(docSource)) {
                        docSource.name = docSource.name.trim();
                        delete (docSource as { ownership?: unknown }).ownership;
                        delete (docSource as { effects?: unknown }).effects;
                        delete (docSource.system as { schema?: unknown }).schema;
                    }

                    if (isActorSource(docSource)) {
                        this.#lastActor = docSource;

                        if (docSource.prototypeToken?.name === docSource.name) {
                            delete (docSource as { prototypeToken?: unknown }).prototypeToken;
                        } else if (docSource.prototypeToken) {
                            const withToken: {
                                img: ImageFilePath;
                                prototypeToken: DeepPartial<foundry.data.PrototypeTokenSource>;
                            } = docSource;
                            withToken.prototypeToken = { name: docSource.prototypeToken.name };
                            // Iconics have special tokens
                            if (withToken.img?.includes("iconics")) {
                                withToken.prototypeToken.texture = {
                                    src: withToken.img.replace("Full", "") as ImageFilePath,
                                };
                            }
                        }

                        if (docSource.type === "npc") {
                            const source: Partial<NPCSystemSource["details"]["source"]> =
                                docSource.system.details.source;
                            if (!source.author?.trim()) delete source.author;

                            const speed: Partial<NPCAttributesSource["speed"]> = docSource.system.attributes.speed;
                            if (!speed.details?.trim()) delete speed.details;

                            for (const key of Object.keys(docSource.system)) {
                                if (!this.#npcSystemKeys.has(key)) {
                                    delete (docSource.system as NPCSystemSource & { extraneous?: unknown })[
                                        key as "extraneous"
                                    ];
                                }
                            }
                        }
                    } else if (isItemSource(docSource)) {
                        this.#pruneItem(docSource);
                    } else if (docSource.type !== "script") {
                        delete (docSource as Partial<PackEntry>).ownership;
                    }
                }
            } else if (["_modifiers", "_sheetTab"].includes(key)) {
                delete docSource[key as DocumentKey];
            } else if (docSource[key as DocumentKey] instanceof Object) {
                this.#pruneTree(docSource[key as DocumentKey] as unknown as PackEntry, topLevel);
            }
        }
    }

    /**  Prune several common item data defaults */
    #pruneItem(source: ItemSourcePF2e): void {
        source.system.description = {
            gm: source.system.description.gm ?? "",
            value: source.system.description.value,
        };

        if (!source.system.description.gm.trim()) {
            delete (source.system.description as { gm?: unknown }).gm;
        }

        if (isPhysicalData(source)) {
            delete (source.system as { identification?: unknown }).identification;
            if (source.system.traits.otherTags?.length === 0) {
                delete (source.system.traits as { otherTags?: unknown }).otherTags;
            }

            if (source.type === "consumable" && !source.system.spell) {
                delete (source.system as { spell?: unknown }).spell;
            }

            if (source.type === "weapon") {
                delete (source.system as { property1?: unknown }).property1;
                if ("value" in source.system.damage) {
                    delete source.system.damage.value;
                }
                if (source.system.specific?.value === false) {
                    delete source.system.specific;
                }
                if (!source.system.damage.persistent) {
                    delete (source.system.damage as { persistent?: unknown }).persistent;
                }
            }
        } else if (source.type === "melee") {
            for (const formulaData of Object.values(source.system.damageRolls)) {
                if (!formulaData.category) {
                    delete (formulaData as { category?: unknown }).category;
                }
            }
        } else if (source.type === "action" && !source.system.deathNote) {
            delete (source.system as { deathNote?: boolean }).deathNote;
        } else if (source.type === "effect") {
            delete (source.system as { context?: unknown }).context;
            delete (source.system as { unidentified?: unknown }).unidentified;
            if (!source.system.badge) {
                delete (source.system as { badge?: unknown }).badge;
            }
        } else if (source.type === "feat") {
            const isFeat = !["ancestryfeature", "classfeature", "pfsboon", "deityboon", "curse"].includes(
                source.system.category
            );
            if (isFeat && source.img === "systems/pf2e/icons/default-icons/feat.svg") {
                source.img = "systems/pf2e/icons/features/feats/feats.webp";
            }

            if (source.system.maxTakable === 1) {
                delete (source.system as { maxTakable?: number }).maxTakable;
            }
            if (!source.system.onlyLevel1) {
                delete (source.system as { onlyLevel1?: boolean }).onlyLevel1;
            }
        } else if (source.type === "spellcastingEntry" && this.#lastActor?.type === "npc") {
            delete (source.system as { ability?: unknown }).ability;
        }

        for (const rule of source.system.rules) {
            this.#pruneRuleElement(rule);
        }
    }

    #pruneRuleElement(source: RuleElementSource): void {
        switch (source.key) {
            case "RollOption":
                if ("toggleable" in source && source.toggleable && !source.value) {
                    delete source.value;
                }
                return;
        }
    }

    #sortDataItems(docSource: PackEntry): ItemSourcePF2e[] {
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
        const sortedItems: ItemSourcePF2e[] = Array(ownedItems.length);
        let itemIndex = 0;
        for (const itemType of itemTypeList) {
            if (groupedItems.has(itemType) && groupedItems.size > 0) {
                const itemGroup = groupedItems.get(itemType);
                if (itemGroup) {
                    let items: ItemSourcePF2e[];
                    switch (itemType) {
                        case "spellcastingEntry":
                            items = this.#sortSpellcastingEntries(docSource.name, itemGroup);
                            break;
                        case "spell":
                            items = this.#sortSpells(itemGroup);
                            break;
                        case "action":
                            items = this.#sortActions(docSource.name, itemGroup);
                            break;
                        case "lore":
                            items = Array.from(itemGroup).sort((a, b) => a.name.localeCompare(b.name));
                            break;
                        case "melee":
                            items = this.#sortAttacks(docSource.name, itemGroup);
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
        }

        // Make sure to add any items that are of a type not defined in the list.
        for (const [key, itemSet] of groupedItems) {
            if (!itemTypeList.includes(key)) {
                if (this.emitWarnings) {
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

    #sortAttacks(docName: string, attacks: Set<ItemSourcePF2e>): ItemSourcePF2e[] {
        for (const attack of attacks) {
            const attackData = attack as MeleeSource;
            if (!attackData.system.weaponType?.value && this.emitWarnings) {
                console.log(`Warning in ${docName}: Melee item '${attackData.name}' has no weaponType defined!`);
            }
        }

        return Array.from(attacks).sort((a, b) => {
            const attackA = a as MeleeSource;
            const attackB = b as MeleeSource;
            if (attackA.system.weaponType?.value) {
                if (!attackB.system.weaponType?.value) {
                    return -1;
                }

                return attackA.system.weaponType.value.localeCompare(attackB.system.weaponType.value);
            } else if (attackB.system.weaponType?.value) {
                return 1;
            }

            return 0;
        });
    }

    #sortSpellcastingEntries(docName: string, actions: Set<ItemSourcePF2e>): ItemSourcePF2e[] {
        const overrides: Map<RegExp, "top" | "bottom"> = new Map([
            [new RegExp("Prepared Spells"), "top"],
            [new RegExp("Spontaneous Spells"), "top"],
            [new RegExp("Innate Spells"), "top"],
            [new RegExp("Ritual Spells"), "top"],
        ]);

        return this.#sortItemsWithOverrides(docName, Array.from(actions), overrides);
    }

    #sortInteractions(docName: string, actions: ItemSourcePF2e[]): ItemSourcePF2e[] {
        const overrides = new Map<RegExp, "top" | "bottom">([
            [new RegExp("Low-Light Vision"), "top"],
            [new RegExp("^Darkvision"), "top"],
            [new RegExp("Greater Darkvision"), "top"],
            [new RegExp("Tremorsense"), "top"],
            [new RegExp("Scent"), "top"],
            [new RegExp("Telepathy"), "top"],
            [new RegExp("At-Will Spells"), "bottom"],
            [new RegExp("Constant Spells"), "bottom"],
        ]);

        return this.#sortItemsWithOverrides(docName, actions, overrides);
    }

    #sortDefensiveActions(docName: string, actions: ItemSourcePF2e[]): ItemSourcePF2e[] {
        const overrides: Map<RegExp, "top" | "bottom"> = new Map([
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

        return this.#sortItemsWithOverrides(docName, actions, overrides);
    }

    #sortOffensiveActions(docName: string, actions: ItemSourcePF2e[]): ItemSourcePF2e[] {
        const overrides: Map<RegExp, "top" | "bottom"> = new Map([
            [new RegExp("^Grab"), "bottom"],
            [new RegExp("Improved Grab"), "bottom"],
            [new RegExp("^Knockdown"), "bottom"],
            [new RegExp("Improved Knockdown"), "bottom"],
            [new RegExp("^Push"), "bottom"],
            [new RegExp("Improved Push"), "bottom"],
        ]);

        return this.#sortItemsWithOverrides(docName, actions, overrides);
    }

    /** Sorts actions by category, only called for NPCs */
    #sortActions(docName: string, actions: Set<ItemSourcePF2e>): ItemSourcePF2e[] {
        const notActions: [string, string][] = [
            ["Innate Spells", "spellcastingEntry"],
            ["Prepared Spells", "spellcastingEntry"],
            ["Ritual Spells", "spellcastingEntry"],
            ["Spontaneous Spells", "spellcastingEntry"],
        ];
        const actionsMap: Map<string, ItemSourcePF2e[]> = new Map([
            ["interaction", []],
            ["defensive", []],
            ["offensive", []],
            ["other", []],
        ]);

        for (const action of Array.from(actions).sort((a, b) => a.name.localeCompare(b.name))) {
            const actionData = action as ActionItemSource;
            const notActionMatch = notActions.find((naName) => actionData.name.match(naName[0]));
            if (notActionMatch) {
                console.log(
                    `Error in ${docName}: ${notActionMatch[0]} has type action but should be type ${notActionMatch[1]}!`
                );
            }
            if (!actionData.system.category) {
                if (this.emitWarnings) {
                    console.log(`Warning in ${docName}: Action item '${actionData.name}' has no category defined!`);
                }
                actionsMap.get("other")!.push(actionData);
            } else {
                let actionCategory: string = actionData.system.category;
                if (!actionsMap.has(actionCategory)) {
                    actionCategory = "other";
                }
                actionsMap.get(actionCategory)!.push(actionData);
            }
        }

        const sortedInteractions = this.#sortInteractions(docName, actionsMap.get("interaction")!);
        const sortedDefensive = this.#sortDefensiveActions(docName, actionsMap.get("defensive")!);
        const sortedOffensive = this.#sortOffensiveActions(docName, actionsMap.get("offensive")!);

        return sortedInteractions.concat(sortedDefensive, sortedOffensive, actionsMap.get("other")!);
    }

    #sortSpells(spells: Set<ItemSourcePF2e>): SpellSource[] {
        return Array.from(spells).sort((a, b) => {
            const spellA = a as SpellSource;
            const spellB = b as SpellSource;
            const aLevel = spellA.system.level;
            const bLevel = spellB.system.level;
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

    #sortItemsWithOverrides(
        docName: string,
        actions: ItemSourcePF2e[],
        overrides: Map<RegExp, "top" | "bottom">
    ): ItemSourcePF2e[] {
        const topActions: ItemSourcePF2e[] = [];
        const middleActions: ItemSourcePF2e[] = [];
        const bottomActions: ItemSourcePF2e[] = [];

        for (const [regexp, position] of overrides.entries()) {
            const interaction = actions.find((action) => regexp.exec(action.name));
            if (interaction) {
                if (position === "top") {
                    topActions.push(interaction);
                } else if (position === "bottom") {
                    bottomActions.push(interaction);
                } else {
                    if (this.emitWarnings) {
                        console.log(
                            `Warning in ${docName}: Override item '${regexp}' has undefined override section '${position}', should be top or bottom!`
                        );
                    }
                }
            }
        }

        for (const interaction of actions) {
            if (!topActions.includes(interaction) && !bottomActions.includes(interaction)) {
                middleActions.push(interaction);
            }
        }

        return topActions.concat(middleActions, bottomActions);
    }

    #populateIdNameMap(): void {
        const packDirs = fs.readdirSync(this.dataPath);

        for (const packDir of packDirs) {
            const metadata = this.packsMetadata.find((p) => path.basename(p.path) === packDir);
            if (!metadata) {
                throw PackError(`Compendium at ${packDir} has no metadata in the local system.json file.`);
            }

            const packMap: Map<string, string> = new Map();
            this.#idsToNames[metadata.type]?.set(metadata.name, packMap);

            const filePaths = getFilesRecursively(path.resolve(this.dataPath, packDir));
            for (const filePath of filePaths) {
                const jsonString = fs.readFileSync(filePath, "utf-8");
                const source = (() => {
                    try {
                        return JSON.parse(jsonString);
                    } catch (error) {
                        if (error instanceof Error) {
                            throw PackError(`File at ${filePath} could not be parsed: ${error.message}`);
                        }
                    }
                })();
                packMap.set(source._id, source.name);
            }
        }
    }
}

export { ExtractArgs, PackExtractor };
