import { ItemSourcePF2e } from "@item/data/index.ts";
import { tupleHasValue } from "@util";
import type { AbstractSublevel } from "abstract-level";
import { ClassicLevel, type DatabaseOptions } from "classic-level";
import { compact, isObject } from "remeda";
import type { JournalEntryPageSchema } from "types/foundry/common/documents/journal-entry-page.d.ts";
import type { TableResultSource } from "types/foundry/common/documents/module.d.ts";
import systemJSON from "../../static/system.json" assert { type: "json" };
import { PackError } from "./helpers.ts";
import { PackEntry } from "./types.ts";

const DB_KEYS = ["actors", "items", "journal", "macros", "tables"] as const;
const EMBEDDED_KEYS = ["items", "pages", "results"] as const;

class LevelDatabase extends ClassicLevel<string, DBEntry> {
    #dbkey: DBKey;
    #embeddedKey: EmbeddedKey | null;

    #documentDb: Sublevel<DBEntry>;
    #foldersDb: Sublevel<DBFolder>;
    #embeddedDb: Sublevel<EmbeddedEntry> | null = null;

    constructor(location: string, options: LevelDatabaseOptions<DBEntry>) {
        const dbOptions = options.dbOptions ?? { keyEncoding: "utf8", valueEncoding: "json" };
        super(location, dbOptions);

        const { dbKey, embeddedKey } = this.#getDBKeys(options.packName);

        this.#dbkey = dbKey;
        this.#embeddedKey = embeddedKey;

        this.#documentDb = this.sublevel(dbKey, dbOptions);
        this.#foldersDb = this.sublevel("folders", dbOptions) as unknown as Sublevel<DBFolder>;
        if (this.#embeddedKey) {
            this.#embeddedDb = this.sublevel(
                `${this.#dbkey}.${this.#embeddedKey}`,
                dbOptions
            ) as unknown as Sublevel<EmbeddedEntry>;
        }
    }

    async createPack(docSources: DBEntry[], folders: DBFolder[]): Promise<void> {
        const isDoc = (source: unknown): source is EmbeddedEntry => {
            return isObject(source) && "_id" in source;
        };
        const docBatch = this.#documentDb.batch();
        const embeddedBatch = this.#embeddedDb?.batch();
        for (const source of docSources) {
            if (this.#embeddedKey) {
                const embeddedDocs = source[this.#embeddedKey];
                if (Array.isArray(embeddedDocs)) {
                    for (let i = 0; i < embeddedDocs.length; i++) {
                        const doc = embeddedDocs[i];
                        if (isDoc(doc) && embeddedBatch) {
                            embeddedBatch.put(`${source._id}.${doc._id}`, doc);
                            embeddedDocs[i] = doc._id!;
                        }
                    }
                }
            }
            docBatch.put(source._id!, source);
        }
        await docBatch.write();
        if (embeddedBatch?.length) {
            await embeddedBatch.write();
        }
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
            const embeddedKey = this.#embeddedKey;
            if (embeddedKey && source[embeddedKey] && this.#embeddedDb) {
                const embeddedDocs = await this.#embeddedDb.getMany(
                    source[embeddedKey]?.map((embeddedId) => `${docId}.${embeddedId}`) ?? []
                );
                source[embeddedKey] = compact(embeddedDocs);
            }
            packSources.push(source as PackEntry);
        }
        const folders: DBFolder[] = [];
        for await (const [_key, folder] of this.#foldersDb.iterator()) {
            folders.push(folder);
        }
        await this.close();

        return { packSources, folders };
    }

    #getDBKeys(packName: string): { dbKey: DBKey; embeddedKey: EmbeddedKey | null } {
        const metadata = systemJSON.packs.find((p) => p.path.endsWith(packName));
        if (!metadata) {
            throw PackError(
                `Error generating dbKeys: Compendium ${packName} has no metadata in the local system.json file.`
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
                    if (tupleHasValue(DB_KEYS, key)) {
                        return key;
                    }
                    throw PackError(`Unkown Document type: ${metadata.type}`);
                }
            }
        })();
        const embeddedKey = ((): EmbeddedKey | null => {
            switch (dbKey) {
                case "actors":
                    return "items";
                case "journal":
                    return "pages";
                case "tables":
                    return "results";
                default:
                    return null;
            }
        })();
        return { dbKey, embeddedKey };
    }
}

type DBKey = (typeof DB_KEYS)[number];
type EmbeddedKey = (typeof EMBEDDED_KEYS)[number];

type Sublevel<T> = AbstractSublevel<ClassicLevel<string, T>, string | Buffer | Uint8Array, string, T>;

type EmbeddedEntry = ItemSourcePF2e | SourceFromSchema<JournalEntryPageSchema> | TableResultSource;
type DBEntry = Omit<PackEntry, "pages" | "items" | "results"> & {
    folder?: string | null;
    items?: (EmbeddedEntry | string)[];
    pages?: (EmbeddedEntry | string)[];
    results?: (EmbeddedEntry | string)[];
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

interface LevelDatabaseOptions<T> {
    packName: string;
    dbOptions?: DatabaseOptions<string, T>;
}

export { DBFolder, LevelDatabase };
