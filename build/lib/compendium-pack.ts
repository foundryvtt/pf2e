import type { ActorSourcePF2e } from "@actor/data/index.ts";
import { isPhysicalData, ItemSourcePF2e, MeleeSource } from "@item/base/data/index.ts";
import { FEAT_OR_FEATURE_CATEGORIES } from "@item/feat/values.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { SIZES } from "@module/data.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { isObject, recursiveReplaceString, setHasElement, sluggify, tupleHasValue } from "@util/misc.ts";
import fs from "fs";
import path from "path";
import coreIconsJSON from "../core-icons.json" assert { type: "json" };
import "./foundry-utils.ts";
import { getFilesRecursively, PackError } from "./helpers.ts";
import { DBFolder, LevelDatabase } from "./level-database.ts";
import { PackEntry } from "./types.ts";

interface PackMetadata {
    system: string;
    name: string;
    path: string;
    type: CompendiumDocumentType;
}

/** A rule element, possibly an Aura, ChoiceSet, GrantItem */
interface REMaybeWithUUIDs extends RuleElementSource {
    effects?: unknown[];
    choices?: Record<string, string | { value?: string }>;
    uuid?: unknown;
}

function isActorSource(docSource: PackEntry): docSource is ActorSourcePF2e {
    return (
        "system" in docSource && isObject(docSource.system) && "items" in docSource && Array.isArray(docSource.items)
    );
}

function isItemSource(docSource: PackEntry): docSource is ItemSourcePF2e {
    return (
        "system" in docSource &&
        "type" in docSource &&
        isObject(docSource.system) &&
        !("text" in docSource) && // JournalEntryPage
        !isActorSource(docSource)
    );
}

/**
 * This is used to check paths to core icons to ensure correctness. The JSON file will need to be periodically refreshed
 *  as upstream adds more icons.
 */
const coreIcons = new Set(coreIconsJSON);

class CompendiumPack {
    packId: string;
    packDir: string;
    documentType: CompendiumDocumentType;
    systemId: string;
    data: PackEntry[];
    folders: DBFolder[];

    static outDir = path.resolve(process.cwd(), "dist/packs");
    static #namesToIds: {
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

    static #packsMetadata = JSON.parse(fs.readFileSync("static/system.json", "utf-8")).packs as PackMetadata[];

    static LINK_PATTERNS = {
        world: /@(?:Item|JournalEntry|Actor)\[[^\]]+\]|@Compendium\[world\.[^\]]{16}\]|@UUID\[(?:Item|JournalEntry|Actor)/g,
        compendium:
            /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<docType>Actor|JournalEntry|Item|Macro|RollTable)\.(?<docName>[^\]]+)\]\{?/g,
        uuid: /@UUID\[Compendium\.pf2e\.(?<packName>[^.]+)\.(?<docType>Actor|JournalEntry|Item|Macro|RollTable)\.(?<docName>[^\]]+)\]\{?/g,
    };

    constructor(packDir: string, parsedData: unknown[], parsedFolders: unknown[]) {
        const metadata = CompendiumPack.#packsMetadata.find(
            (pack) => path.basename(pack.path) === path.basename(packDir),
        );
        if (metadata === undefined) {
            throw PackError(`Compendium at ${packDir} has no metadata in the local system.json file.`);
        }
        this.systemId = metadata.system;
        this.packId = metadata.name;
        this.documentType = metadata.type;

        if (!this.#isFoldersData(parsedFolders)) {
            throw PackError(`Folder data supplied for ${this.packId} does not resemble folder source data.`);
        }
        this.folders = parsedFolders;

        if (!this.#isPackData(parsedData)) {
            throw PackError(`Data supplied for ${this.packId} does not resemble Foundry document source data.`);
        }

        this.packDir = packDir;

        CompendiumPack.#namesToIds[this.documentType]?.set(this.packId, new Map());
        const packMap = CompendiumPack.#namesToIds[this.documentType]?.get(this.packId);
        if (!packMap) {
            throw PackError(`Compendium ${this.packId} (${packDir}) was not found.`);
        }

        parsedData.sort((a, b) => {
            if (a._id === b._id) {
                throw PackError(`_id collision in ${this.packId}: ${a._id}`);
            }
            return a._id?.localeCompare(b._id ?? "") ?? 0;
        });

        this.data = parsedData;

        const imagePathsFromItemSystemData = (item: ItemSourcePF2e): string[] => {
            if (itemIsOfType(item, "ancestry", "background", "class", "kit")) {
                const grants: Record<string, { img: ImageFilePath }> = item.system.items;
                return Object.values(grants).map((i) => i.img);
            }
            return [];
        };

        for (const docSource of this.data) {
            // Populate CompendiumPack.namesToIds for later conversion of compendium links
            packMap.set(docSource.name, docSource._id ?? "");

            // Check img paths
            if ("img" in docSource && typeof docSource.img === "string") {
                const imgPaths = [
                    docSource.img,
                    isActorSource(docSource)
                        ? docSource.items.flatMap((i) => [i.img, ...imagePathsFromItemSystemData(i)])
                        : isItemSource(docSource)
                          ? imagePathsFromItemSystemData(docSource)
                          : [],
                ].flat();
                const documentName = docSource.name;
                for (const imgPath of imgPaths) {
                    if (imgPath.startsWith("data:image")) {
                        const imgData = imgPath.slice(0, 64);
                        const msg = `${documentName} (${this.packId}) has base64-encoded image data: ${imgData}...`;
                        throw PackError(msg);
                    }

                    const isCoreIconPath = coreIcons.has(imgPath);
                    const repoImgPath = path.resolve(
                        process.cwd(),
                        "static",
                        decodeURIComponent(imgPath).replace("systems/pf2e/", ""),
                    );
                    if (!isCoreIconPath && !fs.existsSync(repoImgPath)) {
                        throw PackError(`${documentName} (${this.packId}) has an unknown image path: ${imgPath}`);
                    }
                    if (!(imgPath === "" || imgPath.match(/\.(?:svg|webp)$/))) {
                        throw PackError(`${documentName} (${this.packId}) references a non-WEBP/SVG image: ${imgPath}`);
                    }
                }
            }

            if ("type" in docSource) {
                if (docSource.type === "script") {
                    // Default macro ownership to 1
                    docSource.ownership ??= { default: 1 };
                } else if ("items" in docSource && ["npc", "hazard"].includes(docSource.type)) {
                    // Ensure all linked-weapon IDs point to a weapon
                    const attackItems = docSource.items.filter((i): i is MeleeSource => i.type === "melee");
                    for (const item of attackItems) {
                        const { linkedWeapon } = item.flags?.pf2e ?? {};
                        const weaponFound = linkedWeapon
                            ? docSource.items.some((i) => i._id === linkedWeapon && i.type === "weapon")
                            : false;
                        if (linkedWeapon && !weaponFound) {
                            throw PackError(`Dangling linked weapon reference on ${docSource.name} in ${this.packId}`);
                        }
                    }
                }
            }
        }
    }

    static loadJSON(dirPath: string): CompendiumPack {
        const filePaths = getFilesRecursively(dirPath);
        const parsedData = filePaths.map((filePath) => {
            const jsonString = fs.readFileSync(filePath, "utf-8");
            const packSource: PackEntry = (() => {
                try {
                    return JSON.parse(jsonString);
                } catch (error) {
                    if (error instanceof Error) {
                        throw PackError(`File ${filePath} could not be parsed: ${error.message}`);
                    }
                }
            })();

            const documentName = packSource?.name;
            if (documentName === undefined) {
                throw PackError(`Document contained in ${filePath} has no name.`);
            }

            const filenameForm = sluggify(documentName).concat(".json");
            if (path.basename(filePath) !== filenameForm) {
                throw PackError(`Filename at ${filePath} does not reflect document name (should be ${filenameForm}).`);
            }

            return packSource;
        });

        const folders = ((): DBFolder[] => {
            const foldersFile = path.resolve(dirPath, "_folders.json");
            if (fs.existsSync(foldersFile)) {
                const jsonString = fs.readFileSync(foldersFile, "utf-8");
                const foldersSource: DBFolder[] = (() => {
                    try {
                        return JSON.parse(jsonString);
                    } catch (error) {
                        if (error instanceof Error) {
                            throw PackError(`File ${foldersFile} could not be parsed: ${error.message}`);
                        }
                    }
                })();

                return foldersSource;
            }
            return [];
        })();

        const dbFilename = path.basename(dirPath);
        return new CompendiumPack(dbFilename, parsedData, folders);
    }

    finalizeAll(): PackEntry[] {
        return this.data.map((d) => JSON.parse(this.#finalize(d)));
    }

    #finalize(docSource: PackEntry): string {
        // Replace all compendium documents linked by name to links by ID
        const stringified = JSON.stringify(docSource);
        const worldItemLink = CompendiumPack.LINK_PATTERNS.world.exec(stringified);
        if (worldItemLink !== null) {
            throw PackError(`${docSource.name} (${this.packId}) has a link to a world item: ${worldItemLink[0]}`);
        }

        docSource.flags ??= {};
        if (isActorSource(docSource)) {
            docSource.effects = [];
            docSource.flags.core = { sourceId: this.#sourceIdOf(docSource._id ?? "", { docType: "Actor" }) };
            this.#assertSizeValid(docSource);
            docSource.system._migration = { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION, previous: null };
            for (const item of docSource.items) {
                item.effects = [];
                item.system._migration = { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION, previous: null };
                CompendiumPack.convertUUIDs(item, { to: "ids", map: CompendiumPack.#namesToIds.Item });
            }
        }

        if (isItemSource(docSource)) {
            docSource.effects = [];
            docSource.flags.core = { sourceId: this.#sourceIdOf(docSource._id ?? "", { docType: "Item" }) };
            docSource.system.slug = sluggify(docSource.name);
            docSource.system._migration = { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION, previous: null };

            if (isPhysicalData(docSource)) {
                docSource.system.equipped = { carryType: "worn" };
            } else if (docSource.type === "feat") {
                const featCategory = docSource.system.category;
                if (!setHasElement(FEAT_OR_FEATURE_CATEGORIES, featCategory)) {
                    throw PackError(`${docSource.name} has an unrecognized feat category: ${featCategory}`);
                }
            }

            // Convert uuids with names in GrantItem REs to well-formedness
            CompendiumPack.convertUUIDs(docSource, { to: "ids", map: CompendiumPack.#namesToIds.Item });
        }

        const replace = (match: string, packId: string, docType: string, docName: string): string => {
            if (match.includes("JournalEntryPage")) return match;

            const namesToIds = CompendiumPack.#namesToIds[docType]?.get(packId);
            const link = match.replace(/\{$/, "");
            if (namesToIds === undefined) {
                throw PackError(`${docSource.name} (${this.packId}) has a bad pack reference: ${link}`);
            }

            const documentId: string | undefined = namesToIds.get(docName);
            if (documentId === undefined) {
                throw PackError(`${docSource.name} (${this.packId}) has broken link to ${docName}: ${match}`);
            }
            const sourceId = this.#sourceIdOf(documentId, { packId, docType });
            const labelBraceOrFullLabel = match.endsWith("{") ? "{" : `{${docName}}`;

            return `@UUID[${sourceId}]${labelBraceOrFullLabel}`;
        };

        return JSON.stringify(docSource)
            .replace(CompendiumPack.LINK_PATTERNS.uuid, replace)
            .replace(CompendiumPack.LINK_PATTERNS.compendium, replace);
    }

    #sourceIdOf(documentId: string, { packId, docType }: { packId?: string; docType: "Actor" }): CompendiumActorUUID;
    #sourceIdOf(documentId: string, { packId, docType }: { packId?: string; docType: "Item" }): CompendiumItemUUID;
    #sourceIdOf(documentId: string, { packId, docType }: { packId?: string; docType: string }): string;
    #sourceIdOf(documentId: string, { packId = this.packId, docType }: { packId?: string; docType: string }): string {
        return `Compendium.${this.systemId}.${packId}.${docType}.${documentId}`;
    }

    /** Convert UUIDs in REs to resemble links by name or back again */
    static convertUUIDs(
        source: ItemSourcePF2e,
        { to, map }: { to: "ids" | "names"; map: Map<string, Map<string, string>> },
    ): void {
        const convertOptions = { to: to === "ids" ? "id" : "name", map } as const;

        // Convert UUIDs found in places particular to certain item types
        if (itemIsOfType(source, "feat", "action") && source.system.selfEffect) {
            source.system.selfEffect.uuid = CompendiumPack.convertUUID(source.system.selfEffect.uuid, convertOptions);
        } else if (itemIsOfType(source, "ancestry", "background", "class", "kit")) {
            const items: Record<string, { uuid: string; items?: Record<string, { uuid: string }> }> =
                source.system.items;
            for (const entry of Object.values(items)) {
                entry.uuid = CompendiumPack.convertUUID(entry.uuid, convertOptions);
                if (isObject(entry.items)) {
                    for (const subentry of Object.values(entry.items)) {
                        subentry.uuid = CompendiumPack.convertUUID(subentry.uuid, convertOptions);
                    }
                }
            }
        }

        source.system.rules = source.system.rules.map((r) =>
            recursiveReplaceString(r, (s) => (s.startsWith("Compendium.") ? this.convertUUID(s, convertOptions) : s)),
        );
    }

    static convertUUID<TUUID extends string>(uuid: TUUID, { to, map }: ConvertUUIDOptions): TUUID {
        if (uuid.startsWith("Item.")) {
            throw PackError(`World-item UUID found: ${uuid}`);
        }
        if (!uuid.startsWith("Compendium.pf2e.")) return uuid;

        const toNameRef = (uuid: string): TUUID => {
            const parts = uuid.split(".");
            const [packId, _docType, docId] = parts.slice(2, 6);
            const docName = map.get(packId)?.get(docId);
            if (docName) {
                return parts.slice(0, 4).concat(docName).join(".") as TUUID;
            } else {
                console.debug(`Warning: Unable to find document name corresponding with ${uuid}`);
                return uuid as TUUID;
            }
        };

        const toIDRef = (uuid: string): TUUID => {
            const match = /(?<=^Compendium\.pf2e\.)([^.]+)\.([^.]+)\.(.+)$/.exec(uuid);
            const [, packId, _docType, docName] = match ?? [null, null, null, null];
            const docId = map.get(packId ?? "")?.get(docName ?? "");
            if (docName && docId) {
                return uuid.replace(docName, docId) as TUUID;
            } else {
                throw Error(`Unable to resolve UUID for ${docName ?? docId}`);
            }
        };

        return to === "id" ? toIDRef(uuid) : toNameRef(uuid);
    }

    async save(asJson?: boolean): Promise<number> {
        if (asJson) {
            return this.saveAsJSON();
        }
        if (!fs.lstatSync(CompendiumPack.outDir, { throwIfNoEntry: false })?.isDirectory()) {
            fs.mkdirSync(CompendiumPack.outDir);
        }
        const packDir = path.join(CompendiumPack.outDir, this.packDir);

        // If the old folder is not removed the new data will be inserted into the existing db
        const stats = fs.lstatSync(packDir, { throwIfNoEntry: false });
        if (stats?.isDirectory()) {
            fs.rmSync(packDir, { recursive: true });
        }

        const db = new LevelDatabase(packDir, { packName: path.basename(packDir) });
        await db.createPack(this.finalizeAll(), this.folders);
        console.log(`Pack "${this.packId}" with ${this.data.length} entries built successfully.`);

        return this.data.length;
    }

    async saveAsJSON(): Promise<number> {
        const outDir = path.resolve(process.cwd(), "json-assets/packs");
        if (!fs.lstatSync(outDir, { throwIfNoEntry: false })?.isDirectory()) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        const filePath = path.resolve(outDir, this.packDir);
        const outFile = filePath.concat(".json");
        if (fs.existsSync(outFile)) {
            fs.rmSync(outFile, { force: true });
        }
        fs.writeFileSync(outFile, JSON.stringify(this.finalizeAll()));

        // Save folders if available
        if (this.folders.length > 0) {
            const folderFile = filePath.concat("_folders.json");
            if (fs.existsSync(folderFile)) {
                fs.rmSync(folderFile, { force: true });
            }
            fs.writeFileSync(folderFile, JSON.stringify(this.folders));
        }
        console.log(`File "${this.packDir}.json" with ${this.data.length} entries created successfully.`);

        return this.data.length;
    }

    #isDocumentSource(maybeDocSource: unknown): maybeDocSource is PackEntry {
        if (!isObject(maybeDocSource)) return false;
        const checks = Object.entries({
            name: (data: { name?: unknown }) => typeof data.name === "string",
        });

        const failedChecks = checks
            .map(([key, check]) => (check(maybeDocSource) ? null : key))
            .filter((key) => key !== null);

        if (failedChecks.length > 0) {
            throw PackError(
                `Document source in (${this.packId}) has invalid or missing keys: ${failedChecks.join(", ")}`,
            );
        }

        return true;
    }

    #isPackData(packData: unknown[]): packData is PackEntry[] {
        return packData.every((maybeDocSource: unknown) => this.#isDocumentSource(maybeDocSource));
    }

    #isFolderSource(maybeFolderSource: unknown): maybeFolderSource is DBFolder {
        return isObject(maybeFolderSource) && "_id" in maybeFolderSource && "folder" in maybeFolderSource;
    }

    #isFoldersData(folderData: unknown[]): folderData is DBFolder[] {
        return folderData.every((maybeFolderData) => this.#isFolderSource(maybeFolderData));
    }

    #assertSizeValid(source: ActorSourcePF2e | ItemSourcePF2e): void {
        if (source.type === "npc" || source.type === "vehicle") {
            if (!tupleHasValue(SIZES, source.system.traits.size.value)) {
                throw PackError(`Actor size on ${source.name} (${source._id}) is invalid.`);
            }
        }
    }
}

interface ConvertUUIDOptions {
    to: "id" | "name";
    map: Map<string, Map<string, string>>;
}

export { CompendiumPack, isActorSource, isItemSource, PackError };
export type { PackMetadata, REMaybeWithUUIDs };
