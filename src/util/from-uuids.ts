import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { TokenDocumentPF2e } from "@scene";
import { ErrorPF2e } from "./misc";

type IDLookups = Record<"actor" | "item" | "scene", DocumentUUID[]> & {
    pack: Record<string, string[]>;
};

/** Retrieve multiple documents by UUID */
export async function fromUUIDs(uuids: Exclude<ActorUUID | TokenDocumentUUID, CompendiumUUID>[]): Promise<ActorPF2e[]>;
export async function fromUUIDs(uuids: Exclude<ItemUUID, CompendiumUUID>[]): Promise<ItemPF2e[]>;
export async function fromUUIDs(uuids: DocumentUUID[]): Promise<ClientDocument[]>;
export async function fromUUIDs(uuids: DocumentUUID[]): Promise<ClientDocument[]> {
    const lookups = uuids.reduce(
        (partialLookups: IDLookups, uuid) => {
            const parts = uuid.split(".");
            switch (parts[0]) {
                case "Compendium": {
                    const [scope, packId, id]: (string | undefined)[] = parts.slice(1);
                    if (!(scope && packId && id)) throw ErrorPF2e(`Unable to parse UUID: ${uuid}`);
                    (partialLookups.pack[`${scope}.${packId}`] ??= []).push(id);
                    break;
                }
                case "Actor": {
                    if (/\bItem\b/.test(uuid)) {
                        partialLookups.item.push(uuid);
                    } else {
                        partialLookups.actor.push(uuid);
                    }
                    break;
                }
                case "Item": {
                    partialLookups.item.push(uuid);
                    break;
                }
                case "Scene": {
                    partialLookups.scene.push(uuid);
                    break;
                }
            }
            return partialLookups;
        },
        { actor: [], item: [], pack: {}, scene: [] }
    );

    const actors: ActorPF2e[] = [];
    const items: ItemPF2e[] = [];

    if (lookups.actor.length > 0) {
        actors.push(
            ...(await Promise.all(lookups.actor.map((uuid) => fromUuid(uuid)))).filter(
                (document): document is ActorPF2e => document instanceof ActorPF2e
            )
        );
    } else if (lookups.item.length > 0) {
        items.push(
            ...(await Promise.all(lookups.item.map((uuid) => fromUuid(uuid)))).filter(
                (document): document is ItemPF2e => document instanceof ItemPF2e
            )
        );
    }
    if (lookups.scene.length > 0) {
        actors.push(
            ...(await Promise.all(lookups.scene.map((uuid) => fromUuid(uuid))))
                .filter((document): document is TokenDocumentPF2e => document instanceof TokenDocumentPF2e)
                .flatMap((tokenDoc) => tokenDoc.actor ?? [])
        );
    }
    if (Object.keys(lookups.pack).length > 0) {
        for (const packId of Object.keys(lookups.pack)) {
            const pack = game.packs.get(packId);
            if (!pack) {
                console.warn(`PF2e System | Pack with id not found: ${packId}`);
                continue;
            }

            const ids = lookups.pack[packId];
            const cacheHits: string[] = [];
            for (const cached of ids.flatMap((id) => pack.get(id) ?? [])) {
                if (cached instanceof ActorPF2e) {
                    actors.push(cached);
                    cacheHits.push(cached.id);
                } else if (cached instanceof ItemPF2e) {
                    items.push(cached);
                    cacheHits.push(cached.id);
                }
            }

            const cacheMisses = ids.filter((id) => !cacheHits.includes(id));
            if (cacheMisses.length === 0) continue;
            const fromServer = await pack.getDocuments({ _id: { $in: cacheMisses } });
            for (const uncached of fromServer) {
                if (uncached instanceof ActorPF2e) {
                    actors.push(uncached);
                } else if (uncached instanceof ItemPF2e) {
                    items.push(uncached);
                }
            }
        }
    }
    return actors.length > 0 ? actors : items;
}

export function isItemUUID(uuid: unknown): uuid is ItemUUID {
    if (typeof uuid !== "string") return false;
    if (uuid.startsWith("Item.")) return true;

    const [type, scope, packId, id]: (string | undefined)[] = uuid.split(".");
    if (type !== "Compendium") return false;
    if (!(scope && packId && id)) throw ErrorPF2e(`Unable to parse UUID: ${uuid}`);

    const pack = game.packs.get(`${scope}.${packId}`);
    return pack?.documentName === "Item";
}
