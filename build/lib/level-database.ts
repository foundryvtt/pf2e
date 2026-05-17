import type { CompendiumDocumentType } from "@client/utils/_module.d.mts";
import type { SourceFromSchema } from "@common/data/fields.d.mts";
import type { TableResultSource } from "@common/documents/_module.d.mts";
import type { JournalEntryCategorySource } from "@common/documents/journal-entry-category.d.mts";
import type { JournalEntryPageSchema } from "@common/documents/journal-entry-page.d.mts";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { tupleHasValue } from "@util";
import type { AbstractSublevel } from "abstract-level";
import { ClassicLevel, type DatabaseOptions } from "classic-level";
import * as R from "remeda";
import { PackError } from "./helpers.ts";
import { PackEntry, PackManifest } from "./types.ts";

const DB_KEYS = ["actors", "items", "journal", "macros", "tables"] as const;

const EMBEDDED_KEYS: Record<DBKey, EmbeddedKey[]> = {
    actors: ["items"],
    items: [],
    journal: ["pages", "categories"],
    macros: [],
    tables: ["results"],
};

class LevelDatabase extends ClassicLevel<string, DBEntry> {
    constructor(location: string, options: LevelDatabaseOptions) {
        const dbOptions = options.dbOptions ?? { keyEncoding: "utf8", valueEncoding: "json" };
        super(location, dbOptions);
        this.#manifest = options.manifest;
        const { dbKey, embeddedKeys } = this.#getDBKeys(options.packName);
        this.#embeddedKeys = embeddedKeys;

        this.#documentDb = this.sublevel(dbKey, dbOptions);
        this.#foldersDb = this.sublevel("folders", dbOptions) as unknown as Sublevel<DBFolder>;
        for (const embeddedKey of embeddedKeys) {
            this.#embeddedDbs.set(
                embeddedKey,
                this.sublevel(`${dbKey}.${embeddedKey}`, dbOptions) as unknown as Sublevel<EmbeddedEntry>,
            );
        }
    }

    #embeddedKeys: EmbeddedKey[];

    #documentDb: Sublevel<DBEntry>;
    #foldersDb: Sublevel<DBFolder>;
    #embeddedDbs = new Map<EmbeddedKey, Sublevel<EmbeddedEntry>>();

    #manifest: PackManifest;

    static async connect(location: string, options: LevelDatabaseOptions): Promise<LevelDatabase> {
        const db = new LevelDatabase(location, options);
        await db.open({ passive: true });
        return db;
    }

    async createPack(docSources: DBEntry[], folders: DBFolder[]): Promise<void> {
        const isDoc = (source: unknown): source is EmbeddedEntry => {
            return R.isPlainObject(source) && "_id" in source;
        };
        const docBatch = this.#documentDb.batch();
        const embeddedBatches = new Map(this.#embeddedKeys.map((key) => [key, this.#embeddedDbs.get(key)?.batch()]));

        for (const source of docSources) {
            for (const embeddedKey of this.#embeddedKeys) {
                const embeddedDocs = source[embeddedKey];
                const embeddedBatch = embeddedBatches.get(embeddedKey);
                if (Array.isArray(embeddedDocs) && embeddedBatch) {
                    for (let i = 0; i < embeddedDocs.length; i++) {
                        const doc = embeddedDocs[i];
                        if (isDoc(doc)) {
                            embeddedBatch.put(`${source._id}.${doc._id}`, doc);
                            embeddedDocs[i] = doc._id ?? "";
                        }
                    }
                }
            }
            docBatch.put(source._id ?? "", source);
        }

        await docBatch.write();
        await Promise.all(
            [...embeddedBatches.values()]
                .filter((batch): batch is NonNullable<typeof batch> => !!batch?.length)
                .map((batch) => batch.write()),
        );

        if (folders.length) {
            const folderBatch = this.#foldersDb.batch();
            for (const folder of folders) {
                folderBatch.put(folder._id, folder);
            }
            await folderBatch.write();
        }

        await this.close();
    }

    async getEntries(): Promise<{ packSources: PackEntry[]; folders: DBFolder[] }> {
        const packSources: PackEntry[] = [];
        for await (const [docId, source] of this.#documentDb.iterator()) {
            for (const embeddedKey of this.#embeddedKeys) {
                const embeddedDb = this.#embeddedDbs.get(embeddedKey);
                if (embeddedDb && source[embeddedKey]) {
                    const embeddedDocs = await embeddedDb.getMany(
                        source[embeddedKey]?.map((embeddedId) => `${docId}.${embeddedId}`) ?? [],
                    );
                    source[embeddedKey] = embeddedDocs.filter(R.isTruthy);
                }
            }
            packSources.push(source as PackEntry);
        }

        const folders: DBFolder[] = [];
        for await (const [_key, folder] of this.#foldersDb.iterator()) {
            folders.push(folder);
        }
        await this.close();

        return {
            packSources,
            folders: R.sortBy(
                folders,
                (f) => f.sort,
                (f) => f.name,
            ),
        };
    }

    #getDBKeys(packName: string): { dbKey: DBKey; embeddedKeys: EmbeddedKey[] } {
        const metadata = this.#manifest.packs.find((p: { path: string }) => p.path.endsWith(packName));
        if (!metadata) {
            throw PackError(
                `Error generating dbKeys: Compendium ${packName} has no metadata in the local system.json file.`,
            );
        }

        const dbKey = ((): DBKey => {
            switch (metadata.type) {
                case "JournalEntry":
                    return "journal";
                case "RollTable":
                    return "tables";
                default: {
                    const key = `${metadata.type.toLowerCase()}s`;
                    if (!tupleHasValue(DB_KEYS, key)) throw PackError(`Unkown Document type: ${metadata.type}`);
                    return key;
                }
            }
        })();

        return { dbKey, embeddedKeys: EMBEDDED_KEYS[dbKey] };
    }
}

type DBKey = (typeof DB_KEYS)[number];
type EmbeddedKey = "items" | "pages" | "results" | "categories";

type Sublevel<T> = AbstractSublevel<ClassicLevel<string, T>, string | Buffer | Uint8Array, string, T>;

type EmbeddedEntry =
    | ItemSourcePF2e
    | SourceFromSchema<JournalEntryPageSchema>
    | JournalEntryCategorySource
    | TableResultSource;

type DBEntry = Omit<PackEntry, "pages" | "items" | "results" | "categories"> & {
    folder?: string | null;
    items?: (EmbeddedEntry | string)[];
    pages?: (EmbeddedEntry | string)[];
    results?: (EmbeddedEntry | string)[];
    categories?: (EmbeddedEntry | string)[];
};

interface DBFolder {
    name: string;
    sorting: string;
    folder: string | null;
    type: CompendiumDocumentType;
    _id: string;
    sort: number;
    color: string | null;
    flags: object;
    _stats: {
        systemId: string | null;
        systemVersion: string | null;
        coreVersion: string | null;
        createdTime: number | null;
        modifiedTime: number | null;
        lastModifiedBy: string | null;
    };
}

interface LevelDatabaseOptions {
    manifest: PackManifest;
    packName: string;
    dbOptions?: DatabaseOptions<string, DBEntry>;
}

export { LevelDatabase, type DBFolder };
