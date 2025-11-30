import type { ActorSourcePF2e } from "@actor/data/index.ts";
import type { NPCAttributesSource, NPCSystemSource } from "@actor/npc/data.ts";
import type { CompendiumMetadata } from "@client/documents/collections/compendium-collection.d.mts";
import type { CompendiumDocumentType } from "@client/utils/_module.d.mts";
import type { ImageFilePath } from "@common/constants.mjs";
import type { DocumentStatsData } from "@common/data/fields.d.mts";
import type { AbilitySource, ItemSourcePF2e, SpellcastingEntrySource } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import type { ItemInstances, ItemType } from "@item/types.ts";
import type { PublicationData } from "@module/data.ts";
import type { RuleElementSource } from "@module/rules/index.ts";
import { sluggify } from "@util/index.ts";
import fs from "fs";
import { JSDOM } from "jsdom";
import path from "path";
import process from "process";
import * as R from "remeda";
import systemJSON from "../../static/system.json" with { type: "json" };
import templateJSON from "../../static/template.json" with { type: "json" };
import { CompendiumPack, isActorSource, isItemSource } from "./compendium-pack.ts";
import { PackError, getFilesRecursively } from "./helpers.ts";
import { DBFolder, LevelDatabase } from "./level-database.ts";
import type { PackEntry } from "./types.ts";

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
                }),
            )
        ).reduce((runningTotal, count) => runningTotal + count, 0);
    }

    async extractPack(filePath: string, packDirectory: string): Promise<number> {
        console.log(`Extracting pack: ${packDirectory} (Presorting: ${this.disablePresort ? "Disabled" : "Enabled"})`);
        const outPath = path.resolve(this.tempDataPath, packDirectory);

        const db = await LevelDatabase.connect(filePath, { packName: packDirectory });
        const { packSources, folders } = await db.getEntries();

        // Prepare subfolder data
        if (folders.length > 0) {
            const getFolderPath = (folder: DBFolder, parts: string[] = []): string => {
                if (parts.length > 3) {
                    throw PackError(
                        `Error: Maximum folder depth exceeded for "${folder.name}" in pack: ${packDirectory}`,
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
            const preparedSource = this.#convertUUIDs(source, packDirectory);
            if ("items" in preparedSource && preparedSource.type === "npc" && !this.disablePresort) {
                preparedSource.items = this.#sortEmbeddedItems(preparedSource);
            } else if (!this.#folderPathMap.get(preparedSource.folder ?? "")) {
                delete (preparedSource as { folder?: unknown }).folder;
            }
            const outData = this.#prettyPrintJSON(preparedSource);

            // Remove all non-alphanumeric characters from the name
            const slug = sluggify(preparedSource.name);
            const outFileName = `${slug}.json`;

            // Handle subfolders
            const subfolder = this.#folderPathMap.get(preparedSource.folder ?? "");
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
                        `(${oldSource._id}). Documents that are already in the system must keep their current ID.`,
                );
            }
        }
    }

    #convertUUIDs(docSource: PackEntry, packName: string): PackEntry {
        this.#newDocIdMap[docSource._id!] = docSource.name;

        const sanitized = this.#sanitizeDocument(docSource);
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
                return new RegExp(String.raw`(@UUID\[[^\]]+\])\{${escapedDocName}\}`, "i");
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

            // Delete stats from top level entries. Nested ones may keep compendium sources
            delete (docSource as { _stats?: unknown })._stats;

            if (isItemSource(docSource)) {
                const slug = docSource.system.slug;
                if (typeof slug === "string" && slug !== sluggify(docSource.name)) {
                    console.warn(
                        `Warning: Name change detected on ${docSource.name}. ` +
                            "Please remember to create a slug migration before next release.",
                    );
                }

                delete (docSource.system as { slug?: unknown }).slug;
                docSource.flags = {};
                if (itemIsOfType(docSource, "physical")) {
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

            const container = (() => {
                try {
                    const div = document.createElement("div");
                    div.innerHTML =
                        description.startsWith("<p>") && /<\/(?:p|ol|ul|table)>$/.test(description)
                            ? description
                            : `<p>${description}</p>`;
                    return div;
                } catch (error) {
                    console.error(error);
                    throw PackError(
                        `Failed to parse description of ${docSource.name} (${docSource._id}):\n${description}`,
                    );
                }
            })();

            const textNodes: Text[] = [];
            function pushTextNode(node: Node | null): void {
                if (!node) return;
                if (node.nodeName === "#text" && node.nodeValue && node.nodeValue !== "\n") {
                    textNodes.push(node as Text);
                }
                node.childNodes.forEach((n) => {
                    pushTextNode(n);
                });
            }

            pushTextNode(container);

            // Strip out span tags from AoN copypasta
            const selectors = ["span#ctl00_MainContent_DetailedOutput", "span.fontstyle0"];
            for (const selector of selectors) {
                container.querySelectorAll(selector).forEach((span) => {
                    span.replaceWith(span.innerHTML);
                });
            }

            return container.innerHTML
                .replace(/<([hb]r)>/g, "<$1 />") // Prefer self-closing tags
                .replace(/<\/p> ?<p>/g, "</p>\n<p>")
                .replace(/<p>[ \r\n]+/g, "<p>")
                .replace(/[ \r\n]+<\/p>/g, "</p>")
                .replace(/<(?:b|strong)>\s*/g, "<strong>")
                .replace(/\s*<\/(?:b|strong)>/g, "</strong>")
                .replace(/(<\/strong>)(\w)/g, "$1 $2")
                .replace(/\bpf2-icon\b/g, "action-glyph")
                .replace(/<p> *<\/p>/g, "")
                .replace(/<div> *<\/div>/g, "")
                .replace(/&nbsp;/g, " ")
                .replace(/\u2011/g, "-")
                .replace(/\s*\u2014\s*/g, "\u2014") // em dash
                .replace(/ {2,}/g, " ")
                .trim()
                .replace(/^<hr \/>/, "")
                .trim();
        };

        if ("system" in docSource) {
            if ("description" in docSource.system) {
                docSource.system.description.value = cleanDescription(docSource.system.description.value);
            } else if ("details" in docSource.system && "publicNotes" in docSource.system.details) {
                docSource.system.details.publicNotes = cleanDescription(docSource.system.details.publicNotes);
            }
        } else if ("content" in docSource && typeof docSource.content === "string") {
            docSource.content = cleanDescription(docSource.content);
        }

        // Make an effort to also sanitize sub-documents
        if (isActorSource(docSource)) {
            docSource.items = docSource.items.map((i) => this.#sanitizeDocument(i, { isEmbedded: true }));
        } else if (isItemSource(docSource)) {
            CompendiumPack.convertUUIDs(docSource, { to: "names", map: this.#idsToNames.Item });
            if (docSource.type === "consumable" && docSource.system.spell) {
                docSource.system.spell = this.#sanitizeDocument(docSource.system.spell, { isEmbedded: true });
            } else if (itemIsOfType(docSource, "physical") && docSource.system.subitems?.length) {
                docSource.system.subitems = docSource.system.subitems.map((i) =>
                    this.#sanitizeDocument(i, { isEmbedded: true }),
                );
            }
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
                    delete (docSource as { folder?: null }).folder;
                }

                // Simplify stats to compendiumSource if it exists, otherwise remove outright
                // Should have already been pruned if its top level
                if (docSource._stats?.compendiumSource) {
                    docSource._stats = { compendiumSource: docSource._stats.compendiumSource } as DocumentStatsData;
                } else {
                    delete (docSource as { _stats?: unknown })._stats;
                }

                if ("img" in docSource && typeof docSource.img === "string") {
                    docSource.img = docSource.img.replace(
                        "https://assets.forge-vtt.com/bazaar/systems/pf2e/assets/",
                        "systems/pf2e/",
                    ) as ImageFilePath;
                }

                if (R.isPlainObject(docSource.flags?.pf2e) && Object.keys(docSource.flags.pf2e).length === 0) {
                    delete docSource.flags.pf2e;
                }
                if (Object.keys(docSource.flags ?? {}).length === 0) {
                    delete (docSource as { flags?: object }).flags;
                }

                if ("type" in docSource) {
                    if (isActorSource(docSource) || isItemSource(docSource)) {
                        docSource.name = docSource.name.trim();
                        delete (docSource as { ownership?: object }).ownership;
                        delete (docSource as { effects?: object[] }).effects;
                        delete (docSource.system as { _migration?: object })._migration;
                    }

                    if (isActorSource(docSource)) {
                        this.#lastActor = docSource;

                        if (docSource.prototypeToken?.name === docSource.name) {
                            delete (docSource as { prototypeToken?: object }).prototypeToken;
                        } else if (docSource.prototypeToken) {
                            const withToken: {
                                img: ImageFilePath;
                                prototypeToken: DeepPartial<foundry.data.PrototypeTokenSource>;
                            } = docSource;
                            const ringSetting = docSource.prototypeToken.ring;
                            withToken.prototypeToken = { name: docSource.prototypeToken.name };
                            // Iconics have special tokens
                            if (withToken.img?.includes("iconics")) {
                                withToken.prototypeToken.texture = {
                                    src: withToken.img.replace("Full", "") as ImageFilePath,
                                };
                                const scale = docSource.prototypeToken.texture?.scaleX ?? 1;
                                if (scale !== 1) {
                                    withToken.prototypeToken.texture.scaleX = scale;
                                    withToken.prototypeToken.texture.scaleY = scale;
                                }
                            }
                            // If using dynamic ring, preserve enabled status and subject texture
                            if (ringSetting?.enabled) {
                                withToken.prototypeToken.ring = R.pick(ringSetting, ["enabled", "subject"]);
                            }
                        }

                        if ("publication" in docSource.system.details) {
                            const publication: Partial<PublicationData> = docSource.system.details.publication;
                            if (!publication.authors?.trim()) delete publication.authors;
                        }

                        if (docSource.type === "character") {
                            delete (docSource.system.details.biography as { visibility?: unknown }).visibility;
                        } else if (docSource.type === "npc") {
                            const speed: Partial<NPCAttributesSource["speed"]> = docSource.system.attributes.speed;
                            if (!speed.details?.trim()) delete speed.details;

                            for (const key of Object.keys(docSource.system)) {
                                if (!this.#npcSystemKeys.has(key)) {
                                    delete (docSource.system as NPCSystemSource & { extraneous?: unknown })[
                                        key as "extraneous"
                                    ];
                                }
                            }

                            if (docSource.system.perception.vision) {
                                delete (docSource.system.perception as { vision?: unknown }).vision;
                            }
                        }
                    } else if (isItemSource(docSource)) {
                        this.#pruneItem(docSource);
                    } else if (docSource.type !== "script") {
                        delete (docSource as Partial<PackEntry>).ownership;
                    }
                }
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

        if (source.system.traits?.otherTags?.length === 0) {
            delete (source.system.traits as { otherTags?: unknown }).otherTags;
        }

        const publication: Partial<PublicationData> = source.system.publication;
        if (!publication.authors?.trim()) delete publication.authors;

        if (itemIsOfType(source, "physical")) {
            delete (source.system as { identification?: unknown }).identification;
            if ("stackGroup" in source.system && !source.system.stackGroup) {
                delete (source.system as { stackGroup?: unknown }).stackGroup;
            }
            if (source.type === "consumable" && !source.system.spell) {
                delete (source.system as { spell?: unknown }).spell;
            }

            if (itemIsOfType(source, "armor", "shield", "weapon") && !source.system.specific) {
                delete (source.system as { specific?: unknown }).specific;
            }

            if (source.system.subitems?.length === 0) {
                delete (source.system as { subitems?: unknown[] }).subitems;
            }

            if (source.type === "weapon") {
                delete (source.system as { property1?: unknown }).property1;
                if ("value" in source.system.damage) {
                    delete source.system.damage.value;
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
                source.system.category,
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
        } else if (source.type === "spellcastingEntry") {
            if (this.#lastActor?.type === "npc") {
                delete (source.system as { ability?: unknown }).ability;
            }
            if (source.system.showSlotlessLevels?.value === true) {
                delete (source.system as { showSlotlessLevels?: { value: boolean } }).showSlotlessLevels;
            }
            for (const slotGroup of Object.values(source.system.slots)) {
                for (const spellPrep of slotGroup.prepared ?? []) {
                    if (!spellPrep.expended) {
                        delete (spellPrep as { expended?: unknown }).expended;
                    }
                }
            }

            source.system.slots = fu.diffObject(templateJSON.Item.spellcastingEntry.slots, source.system.slots);
        }

        for (const rule of source.system.rules) {
            this.#pruneRuleElement(rule);
        }
    }

    #pruneRuleElement(source: RuleElementSource): void {
        switch (source.key) {
            case "Aura":
                if ("appearance" in source) {
                    delete source.appearance;
                }
                break;
            case "RollOption":
                if ("toggleable" in source && source.toggleable && "value" in source && !source.value) {
                    delete source.value;
                }
                return;
        }
    }

    #sortEmbeddedItems(docSource: PackEntry): ItemSourcePF2e[] {
        if (!("items" in docSource) || !Array.isArray(docSource.items) || docSource.items.length === 0) {
            return [];
        }
        const itemTypes: ItemType[] = [
            "affliction",
            "spellcastingEntry",
            "spell",
            "weapon",
            "shield",
            "armor",
            "equipment",
            "consumable",
            "ammo",
            "treasure",
            "backpack",
            "condition",
            "effect",
            "melee",
            "action",
            "lore",
        ];

        type ItemSourcesByType = { [T in ItemType]?: ItemInstances<null>[T]["_source"][] };
        const itemsByType = R.groupBy(docSource.items, (i) => i.type) as ItemSourcesByType;

        const sortedItems = itemTypes.flatMap((itemType): ItemSourcePF2e[] => {
            switch (itemType) {
                case "action":
                    return this.#sortAbilities(docSource.name, itemsByType.action);
                case "lore":
                    return R.sortBy(itemsByType.lore ?? [], (l) => l.name);
                case "melee": {
                    return R.sortBy(itemsByType.melee ?? [], (m) =>
                        m.system.traits.value.some((t) => t.startsWith("range-")),
                    );
                }
                case "spell":
                    return R.sortBy(itemsByType.spell ?? [], [(s) => s.system.level.value, "desc"], (s) => s.name);
                case "spellcastingEntry":
                    return this.#sortSpellcastingEntries(docSource.name, itemsByType.spellcastingEntry);
                default:
                    return itemsByType[itemType] ?? [];
            }
        });

        for (const [i, item] of sortedItems.entries()) {
            item.sort = 100000 * (i + 1);
        }

        return sortedItems;
    }

    #sortSpellcastingEntries(docName: string, items: SpellcastingEntrySource[] = []): SpellcastingEntrySource[] {
        const overrides: Map<RegExp, "top" | "bottom"> = new Map([
            [new RegExp("Prepared Spells"), "top"],
            [new RegExp("Spontaneous Spells"), "top"],
            [new RegExp("Innate Spells"), "top"],
        ]);

        return this.#sortItemsWithOverrides(docName, items, overrides);
    }

    #sortInteractions(docName: string, actions: AbilitySource[] = []): AbilitySource[] {
        const overrides = new Map<RegExp, "top" | "bottom">([
            [new RegExp("Greater Darkvision"), "top"],
            [new RegExp("Tremorsense"), "top"],
            [new RegExp("Scent"), "top"],
            [new RegExp("Telepathy"), "top"],
            [new RegExp("At-Will Spells"), "bottom"],
            [new RegExp("Constant Spells"), "bottom"],
        ]);

        return this.#sortItemsWithOverrides(docName, actions, overrides);
    }

    #sortDefensiveActions(docName: string, actions: AbilitySource[] = []): AbilitySource[] {
        const overrides: Map<RegExp, "top" | "bottom"> = new Map([
            [new RegExp("All-Around Vision"), "top"],
            [
                new RegExp(
                    "(\\+|\\-)\\d+ (Status|Circumstance) (Bonus )?(to|on) ((All|Fortitude|Reflex|Will) )?Saves",
                    "i",
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

    #sortOffensiveActions(docName: string, actions: AbilitySource[] = []): AbilitySource[] {
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
    #sortAbilities(docName: string, items: AbilitySource[] = []): AbilitySource[] {
        const notAbilities: [string, string][] = [
            ["Innate Spells", "spellcastingEntry"],
            ["Prepared Spells", "spellcastingEntry"],
            ["Ritual Spells", "spellcastingEntry"],
            ["Spontaneous Spells", "spellcastingEntry"],
        ];
        const abilitiesMap: Map<string, AbilitySource[]> = new Map([
            ["interaction", []],
            ["defensive", []],
            ["offensive", []],
            ["other", []],
        ]);

        for (const ability of items.sort((a, b) => a.name.localeCompare(b.name))) {
            const notAbilityMatch = notAbilities.find((naName) => ability.name.match(naName[0]));
            if (notAbilityMatch) {
                console.log(
                    `Error in ${docName}: ${notAbilityMatch[0]} has type action but should be type ${notAbilityMatch[1]}!`,
                );
            }

            if (ability.type !== "action") continue;

            if (!ability.system.category) {
                if (this.emitWarnings) {
                    console.log(`Warning in ${docName}: Ability item "${ability.name}" has no category defined!`);
                }
                abilitiesMap.get("other")!.push(ability);
            } else {
                const actionCategory = abilitiesMap.has(ability.system.category) ? ability.system.category : "other";
                abilitiesMap.get(actionCategory)!.push(ability);
            }
        }

        const sortedInteractions = this.#sortInteractions(docName, abilitiesMap.get("interaction")!);
        const sortedDefensive = this.#sortDefensiveActions(docName, abilitiesMap.get("defensive")!);
        const sortedOffensive = this.#sortOffensiveActions(docName, abilitiesMap.get("offensive")!);

        return sortedInteractions.concat(sortedDefensive, sortedOffensive, abilitiesMap.get("other")!);
    }

    #sortItemsWithOverrides<TSource extends ItemSourcePF2e>(
        docName: string,
        actions: TSource[],
        overrides: Map<RegExp, "top" | "bottom">,
    ): TSource[] {
        const topActions: TSource[] = [];
        const middleActions: TSource[] = [];
        const bottomActions: TSource[] = [];

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
                            `Warning in ${docName}: Override item '${regexp}' has undefined override section '${position}', should be top or bottom!`,
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

export { PackExtractor, type ExtractArgs };
