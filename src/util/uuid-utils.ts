import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { ErrorPF2e } from "./misc";

class UUIDUtils {
    /** A replacement for core fromUuidSync that returns cached compendium documents. Remove in v11. */
    static fromUuidSync(uuid: string, relative?: ClientDocument): ClientDocument | CompendiumIndexData | null {
        const { doc, embedded } = this.#parseUuid(uuid, relative);
        if (doc) {
            if (embedded.length) {
                return _resolveEmbedded(doc, embedded) ?? null;
            }
            return doc;
        }
        return fromUuidSync(uuid, relative);
    }

    /** Retrieve multiple documents by UUID */
    static async fromUUIDs(uuids: Exclude<ActorUUID | TokenDocumentUUID, CompendiumUUID>[]): Promise<ActorPF2e[]>;
    static async fromUUIDs(uuids: Exclude<ItemUUID, CompendiumUUID>[]): Promise<ItemPF2e[]>;
    static async fromUUIDs(uuids: string[]): Promise<ClientDocument[]>;
    static async fromUUIDs(uuids: string[]): Promise<foundry.abstract.Document[] | ActorPF2e[] | ItemPF2e[]> {
        const actors: ActorPF2e[] = [];
        const items: ItemPF2e[] = [];

        const documents = uuids.map((u): [string, ReturnType<typeof fromUuidSync>] => [u, this.fromUuidSync(u)]);
        for (const [uuid, doc] of documents) {
            if (doc instanceof ActorPF2e) {
                actors.push(doc);
            } else if (doc instanceof ItemPF2e) {
                items.push(doc);
            } else {
                // Cache miss: retrieve from server
                const document = await fromUuid(uuid);
                if (document instanceof ActorPF2e) {
                    actors.push(document);
                } else if (document instanceof ItemPF2e) {
                    items.push(document);
                }
            }
        }

        return actors.length > 0 ? actors : items;
    }

    static #parseUuid(uuid: string, relative?: ClientDocument): ResolvedUUID {
        const resolved = _parseUuid(uuid, relative);
        if (resolved.collection) {
            resolved.doc = resolved.collection.get(resolved.documentId) ?? null;
        }
        return resolved;
    }

    static isItemUUID(uuid: unknown): uuid is ItemUUID {
        if (typeof uuid !== "string") return false;
        if (/^(?:Actor\.[a-zA-Z0-9]{16}\.)?Item\.[a-zA-Z0-9]{16}$/.test(uuid)) {
            return true;
        }

        const [type, scope, packId, id]: (string | undefined)[] = uuid.split(".");
        if (type !== "Compendium") return false;
        if (!(scope && packId && id)) throw ErrorPF2e(`Unable to parse UUID: ${uuid}`);

        const pack = game.packs.get(`${scope}.${packId}`);
        return pack?.documentName === "Item";
    }

    static isTokenUUID(uuid: unknown): uuid is TokenDocumentUUID {
        return typeof uuid === "string" && /^Scene\.[A-Za-z0-9]{16}\.Token\.[A-Za-z0-9]{16}$/.test(uuid);
    }
}

export { UUIDUtils };
