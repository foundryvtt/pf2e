import type { ActorSourcePF2e } from "@actor/data/index.ts";
import type { CompendiumActorUUID, CompendiumItemUUID, ItemUUID } from "@client/documents/_module.d.mts";
import type { CompendiumDocumentType } from "@client/utils/_module.d.mts";
import type { ImageFilePath } from "@common/constants.d.mts";
import type { DocumentStatsData, DocumentStatsSchema, SourceFromSchema } from "@common/data/fields.d.mts";
import type { ItemSourcePF2e, MeleeSource } from "@item/base/data/index.ts";
import { FEAT_OR_FEATURE_CATEGORIES } from "@item/feat/values.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { SIZES } from "@module/data.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";
import type { RuleElementSource } from "@module/rules/index.ts";
import { recursiveReplaceString, setHasElement, sluggify, tupleHasValue } from "@util/misc.ts";
import fs from "fs";
import path from "path";
import * as R from "remeda";
import coreIconsJSON from "../core-icons.json" with { type: "json" };
import "./foundry-utils.ts";
import { PackError, getFilesRecursively } from "./helpers.ts";
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
        "system" in docSource &&
        R.isPlainObject(docSource.system) &&
        "items" in docSource &&
        Array.isArray(docSource.items)
    );
}

function isItemSource(docSource: PackEntry): docSource is ItemSourcePF2e {
    return (
        "system" in docSource &&
        "type" in docSource &&
        R.isPlainObject(docSource.system) &&
        !("text" in docSource) && // JournalEntryPage
        !isActorSource(docSource)
    );
}

interface ConstructorParams {
    dirName: string;
    data: unknown[];
    folders: unknown[];
    systemId: SystemId;
}

/**
 * This is used to check paths to core icons to ensure correctness. The JSON file will need to be periodically refreshed
 *  as upstream adds more icons.
 */
const coreIcons = new Set(coreIconsJSON);

class CompendiumPack {
    constructor({ dirName, data, folders, systemId }: ConstructorParams) {
        this.systemId = systemId;
        this.dirName = dirName;
        const metadata = this.packsMetadata.find((d) => path.basename(d.path) === path.basename(dirName));
        if (!metadata) throw PackError(`Compendium at ${dirName} has no metadata in the local system.json file.`);
        this.id = metadata.name;
        this.documentType = metadata.type;

        if (!this.#isPackData(data)) {
            throw PackError(`Data supplied for ${this.id} does not resemble Foundry document source data.`);
        }
        this.data = data.sort((a, b) => {
            if (a._id === b._id) throw PackError(`_id collision in ${this.id}: ${a._id}`);
            return a._id?.localeCompare(b._id ?? "") ?? 0;
        });
        if (!this.#isFoldersData(folders)) {
            throw PackError(`Folder data supplied for ${this.id} does not resemble folder source data.`);
        }
        this.folders = folders;

        this.outDir = path.resolve(process.cwd(), `dist/${this.systemId}/packs`);

        CompendiumPack.#namesToIds[this.documentType]?.set(this.id, new Map());
        const packMap = CompendiumPack.#namesToIds[this.documentType]?.get(this.id);
        if (!packMap) {
            throw PackError(`Compendium ${this.id} (${dirName}) was not found.`);
        }

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
                        const msg = `${documentName} (${this.id}) has base64-encoded image data: ${imgData}...`;
                        throw PackError(msg);
                    }

                    const isCoreIconPath = coreIcons.has(imgPath);
                    const repoImgPath = path.resolve(
                        process.cwd(),
                        "static",
                        decodeURIComponent(imgPath).replace(`systems/${this.systemId}/`, ""),
                    );
                    if (!isCoreIconPath && !fs.existsSync(repoImgPath)) {
                        throw PackError(`${documentName} (${this.id}) has an unknown image path: ${imgPath}`);
                    }
                    if (!(imgPath === "" || imgPath.match(/\.(?:svg|webp)$/))) {
                        throw PackError(`${documentName} (${this.id}) references a non-WEBP/SVG image: ${imgPath}`);
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
                            throw PackError(`Dangling linked weapon reference on ${docSource.name} in ${this.id}`);
                        }
                    }
                }
            }
        }
    }

    id: string;

    dirName: string;

    documentType: CompendiumDocumentType;

    systemId: SystemId;

    data: PackEntry[];

    folders: DBFolder[];

    outDir: string;

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

    get packsMetadata(): PackMetadata[] {
        return (this.#packsMetadata ??= JSON.parse(fs.readFileSync(`system.${this.systemId}.json`, "utf-8")).packs);
    }

    #packsMetadata: PackMetadata[] | null = null;

    static LINK_PATTERNS = {
        world: /@(?:Item|JournalEntry|Actor)\[[^\]]+\]|@Compendium\[world\.[^\]]{16}\]|@UUID\[(?:Item|JournalEntry|Actor)/g,
        compendium:
            /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<docType>Actor|JournalEntry|Item|Macro|RollTable)\.(?<docName>[^\]]+)\]\{?/g,
        uuid: /@UUID\[Compendium\.pf2e\.(?<packName>[^.]+)\.(?<docType>Actor|JournalEntry|Item|Macro|RollTable)\.(?<docName>[^\]]+)\]\{?/g,
    };

    static loadJSON(dirPath: string, { systemId }: { systemId: SystemId }): CompendiumPack {
        const filePaths = getFilesRecursively(path.resolve("packs", systemId, dirPath));
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
            const foldersFile = path.resolve("packs", systemId, dirPath, "_folders.json");
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

        return new CompendiumPack({ dirName: path.basename(dirPath), data: parsedData, folders, systemId });
    }

    finalizeAll(): PackEntry[] {
        return this.data.map((d) => JSON.parse(this.#finalize(d)));
    }

    #finalize(docSource: PackEntry): string {
        // Replace all compendium documents linked by name to links by ID
        const stringified = JSON.stringify(docSource);
        const worldItemLink = CompendiumPack.LINK_PATTERNS.world.exec(stringified);
        if (worldItemLink !== null) {
            throw PackError(`${docSource.name} (${this.id}) has a link to a world item: ${worldItemLink[0]}`);
        }

        // Stamp actors and items with partial stats data so the server won't attempt to migrate
        const systemJSON = JSON.parse(fs.readFileSync(`system.${this.systemId}.json`, { encoding: "utf-8" }));
        const partialStats = {
            coreVersion: systemJSON.compatibility.minimum,
            systemId: this.systemId,
            systemVersion: systemJSON.version,
        } as DocumentStatsData;
        docSource._stats = { ...partialStats };

        if (isActorSource(docSource)) {
            docSource.effects = [];
            this.#assertSizeValid(docSource);
            docSource.system._migration = { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION, previous: null };
            for (const item of docSource.items) {
                const compendiumSource = item._stats?.compendiumSource ?? null;
                item._stats = { ...partialStats, compendiumSource } as SourceFromSchema<DocumentStatsSchema<ItemUUID>>;
                item.effects = [];
                item.system._migration = { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION, previous: null };
                CompendiumPack.convertUUIDs(item, { to: "ids", map: CompendiumPack.#namesToIds.Item });
            }

            docSource._stats.compendiumSource = this.#sourceIdOf(docSource._id ?? "", { docType: "Actor" });
        } else if (isItemSource(docSource)) {
            docSource.effects = [];
            docSource.system.slug = sluggify(docSource.name);
            docSource.system._migration = { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION, previous: null };

            if (itemIsOfType(docSource, "physical")) {
                docSource.system.equipped = { carryType: "worn" };
            } else if (docSource.type === "feat") {
                const featCategory = docSource.system.category;
                if (!setHasElement(FEAT_OR_FEATURE_CATEGORIES, featCategory)) {
                    throw PackError(`${docSource.name} has an unrecognized feat category: ${featCategory}`);
                }
            }

            // Convert uuids with names in GrantItem REs to well-formedness
            CompendiumPack.convertUUIDs(docSource, { to: "ids", map: CompendiumPack.#namesToIds.Item });
            docSource._stats.compendiumSource = this.#sourceIdOf(docSource._id ?? "", { docType: "Item" });
        } else if ("pages" in docSource) {
            for (const page of docSource.pages) {
                page._stats = { ...partialStats };
            }
        }

        const replace = (match: string, packId: string, docType: string, docName: string): string => {
            if (match.includes("JournalEntryPage")) return match;

            const namesToIds = CompendiumPack.#namesToIds[docType]?.get(packId);
            const link = match.replace(/\{$/, "");
            if (namesToIds === undefined) {
                throw PackError(`${docSource.name} (${this.id}) has a bad pack reference: ${link}`);
            }

            const documentId: string | undefined = namesToIds.get(docName);
            if (documentId === undefined) {
                throw PackError(`${docSource.name} (${this.id}) has broken link to ${docName}: ${match}`);
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
    #sourceIdOf(documentId: string, { packId = this.id, docType }: { packId?: string; docType: string }): string {
        return `Compendium.${this.systemId}.${packId}.${docType}.${documentId}`;
    }

    /** Convert UUIDs in REs to resemble links by name or back again */
    static convertUUIDs(
        source: ItemSourcePF2e,
        { to, map }: { to: "ids" | "names"; map: Map<string, Map<string, string>> },
    ): void {
        const convertOptions = { to: to === "ids" ? "id" : "name", map } as const;

        if (itemIsOfType(source, "feat") && source.system.subfeatures?.suppressedFeatures) {
            source.system.subfeatures.suppressedFeatures = source.system.subfeatures.suppressedFeatures.map((r) =>
                CompendiumPack.convertUUID(r, convertOptions),
            );
        }

        if (itemIsOfType(source, "feat", "action") && source.system.selfEffect) {
            source.system.selfEffect.uuid = CompendiumPack.convertUUID(source.system.selfEffect.uuid, convertOptions);
        } else if (itemIsOfType(source, "ancestry", "background", "class", "kit")) {
            const items: Record<string, { uuid: string; items?: Record<string, { uuid: string }> | null }> =
                source.system.items;
            for (const entry of Object.values(items)) {
                entry.uuid = CompendiumPack.convertUUID(entry.uuid, convertOptions);
                if (R.isPlainObject(entry.items)) {
                    for (const subentry of Object.values(entry.items)) {
                        subentry.uuid = CompendiumPack.convertUUID(subentry.uuid, convertOptions);
                    }
                }
            }
        } else if (itemIsOfType(source, "deity")) {
            const spells = source.system.spells;
            for (const [key, spell] of R.entries(spells)) {
                spells[key] = CompendiumPack.convertUUID(spell, convertOptions);
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

    async save({ jsonArtifacts = false } = {}): Promise<number> {
        if (jsonArtifacts) return this.saveAsJSON();
        if (!fs.lstatSync(this.outDir, { throwIfNoEntry: false })?.isDirectory()) {
            fs.mkdirSync(this.outDir, { recursive: true });
        }
        const packDir = path.join(this.outDir, this.dirName);

        // If the old folder is not removed the new data will be inserted into the existing db
        const stats = fs.lstatSync(packDir, { throwIfNoEntry: false });
        if (stats?.isDirectory()) {
            fs.rmSync(packDir, { recursive: true });
        }

        const db = await LevelDatabase.connect(packDir, { systemId: this.systemId, packName: path.basename(packDir) });
        await db.createPack(this.finalizeAll(), this.folders);
        await db.close();
        console.log(`Pack "${this.id}" with ${this.data.length} entries built successfully.`);

        return this.data.length;
    }

    async saveAsJSON(): Promise<number> {
        const outDir = path.resolve(process.cwd(), "json-assets/packs");
        if (!fs.lstatSync(outDir, { throwIfNoEntry: false })?.isDirectory()) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        const filePath = path.resolve(outDir, this.dirName);
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
        console.log(`File "${this.dirName}.json" with ${this.data.length} entries created successfully.`);

        return this.data.length;
    }

    #isDocumentSource(maybeDocSource: unknown): maybeDocSource is PackEntry {
        if (!R.isPlainObject(maybeDocSource)) return false;
        const checks = Object.entries({
            name: (data: { name?: unknown }) => typeof data.name === "string",
        });

        const failedChecks = checks
            .map(([key, check]) => (check(maybeDocSource) ? null : key))
            .filter((key) => key !== null);

        if (failedChecks.length > 0) {
            throw PackError(`Document source in (${this.id}) has invalid or missing keys: ${failedChecks.join(", ")}`);
        }

        return true;
    }

    #isPackData(packData: unknown[]): packData is PackEntry[] {
        return packData.every((maybeDocSource: unknown) => this.#isDocumentSource(maybeDocSource));
    }

    #isFolderSource(maybeFolderSource: unknown): maybeFolderSource is DBFolder {
        return R.isPlainObject(maybeFolderSource) && "_id" in maybeFolderSource && "folder" in maybeFolderSource;
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

export { CompendiumPack, PackError, isActorSource, isItemSource };
export type { PackMetadata, REMaybeWithUUIDs };
