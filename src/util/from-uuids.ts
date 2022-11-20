import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { ErrorPF2e } from "./misc";

/** Retrieve multiple documents by UUID */
async function fromUUIDs(uuids: Exclude<ActorUUID | TokenDocumentUUID, CompendiumUUID>[]): Promise<ActorPF2e[]>;
async function fromUUIDs(uuids: Exclude<ItemUUID, CompendiumUUID>[]): Promise<ItemPF2e[]>;
async function fromUUIDs(uuids: string[]): Promise<ClientDocument[]>;
async function fromUUIDs(uuids: string[]): Promise<ClientDocument[]> {
    const actors: ActorPF2e[] = [];
    const items: ItemPF2e[] = [];

    const docsOrIndices = uuids.map((u): [string, ReturnType<typeof fromUuidSync>] => [u, fromUuidSync(u)]);
    for (const [uuid, docOrIndex] of docsOrIndices) {
        if (docOrIndex instanceof ActorPF2e) {
            actors.push(docOrIndex);
        } else if (docOrIndex instanceof ItemPF2e) {
            items.push(docOrIndex);
        } else if (docOrIndex) {
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

function isItemUUID(uuid: unknown): uuid is ItemUUID {
    if (typeof uuid !== "string") return false;
    if (uuid.startsWith("Item.")) return true;

    const [type, scope, packId, id]: (string | undefined)[] = uuid.split(".");
    if (type !== "Compendium") return false;
    if (!(scope && packId && id)) throw ErrorPF2e(`Unable to parse UUID: ${uuid}`);

    const pack = game.packs.get(`${scope}.${packId}`);
    return pack?.documentName === "Item";
}

function isTokenUUID(uuid: unknown): uuid is TokenDocumentUUID {
    return typeof uuid === "string" && /^Scene\.[A-Za-z0-9]{16}\.Token\.[A-Za-z0-9]{16}$/.test(uuid);
}

export { fromUUIDs, isItemUUID, isTokenUUID };
