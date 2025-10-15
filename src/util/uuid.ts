import type { ActorPF2e } from "@actor";
import type {
    ActorUUID,
    CompendiumActorUUID,
    CompendiumItemUUID,
    EmbeddedItemUUID,
    ItemUUID,
    TokenDocumentUUID,
    WorldItemUUID,
} from "@client/documents/_module.d.mts";
import type { ClientDocument } from "@client/documents/abstract/_module.d.mts";
import type { CompendiumIndexData } from "@client/documents/collections/compendium-collection.d.mts";
import type { CompendiumUUID } from "@client/utils/_module.d.mts";
import type Document from "@common/abstract/document.d.mts";
import type { ItemPF2e } from "@item";
import * as R from "remeda";

class UUIDUtils {
    /** Retrieve multiple documents by UUID */
    static async fromUUIDs(uuids: ActorUUID[], options?: { relative?: Maybe<Document> }): Promise<ActorPF2e[]>;
    static async fromUUIDs(uuids: ItemUUID[], options?: { relative?: Maybe<Document> }): Promise<ItemPF2e[]>;
    static async fromUUIDs(uuids: string[], options?: { relative?: Maybe<Document> }): Promise<Document[]>;
    static async fromUUIDs(uuids: string[], options?: { relative?: Maybe<Document> }): Promise<Document[]> {
        const resolvedUUIDs = R.unique(uuids).flatMap((u) => fu.parseUuid(u, options)?.uuid ?? []);

        // These can't be retrieved via `fromUuidSync`: separate and retrieve directly via `fromUuid`
        const packEmbeddedLinks = resolvedUUIDs.filter((u) => {
            const parsed = fu.parseUuid(u, options);
            return parsed?.collection instanceof fd.collections.CompendiumCollection && parsed.embedded.length > 0;
        });
        const packEmbeddedDocs = (await Promise.all(packEmbeddedLinks.map((u) => fromUuid(u)))).filter(R.isTruthy);

        const documentsAndIndexData = resolvedUUIDs
            .filter((u) => !packEmbeddedLinks.includes(u))
            .map((u) => fromUuidSync(u))
            .filter(R.isTruthy);

        const worldDocsAndCacheHits = documentsAndIndexData.filter(
            (d): d is ClientDocument => d instanceof foundry.abstract.Document,
        );
        const indexEntries = documentsAndIndexData.filter(
            (d): d is CompendiumIndexData => !(d instanceof foundry.abstract.Document),
        );
        const packs = R.unique(indexEntries.flatMap((e) => game.packs.get(e.pack ?? "") ?? []));
        const packDocs = (
            await Promise.all(
                packs.map(async (pack) => {
                    const ids = indexEntries.filter((e) => e.pack === pack.metadata.id).map((e) => e._id);
                    return pack.getDocuments({ _id__in: ids });
                }),
            )
        ).flat();

        return R.sortBy([...packEmbeddedDocs, ...worldDocsAndCacheHits, ...packDocs], (d) =>
            uuids.indexOf(d.uuid ?? ""),
        );
    }

    static isItemUUID(uuid: unknown, options: { embedded: true }): uuid is EmbeddedItemUUID;
    static isItemUUID(uuid: unknown, options: { embedded: false }): uuid is WorldItemUUID | CompendiumItemUUID;
    static isItemUUID(uuid: unknown, options?: { embedded?: boolean }): uuid is ItemUUID;
    static isItemUUID(uuid: unknown, options: { embedded?: boolean } = {}): uuid is ItemUUID {
        if (typeof uuid !== "string") return false;
        try {
            const parseResult = fu.parseUuid(uuid);
            const isEmbedded = !!parseResult?.embedded.length;
            return (
                parseResult?.type === "Item" &&
                (options.embedded === true ? isEmbedded : options.embedded === false ? !isEmbedded : true)
            );
        } catch {
            return false;
        }
    }

    static isCompendiumUUID(uuid: unknown, docType: "Actor"): uuid is CompendiumActorUUID;
    static isCompendiumUUID(uuid: unknown, docType: "Item"): uuid is CompendiumItemUUID;
    static isCompendiumUUID<TDocType extends DocumentType>(uuid: unknown, docType?: TDocType): uuid is CompendiumUUID;
    static isCompendiumUUID<TDocType extends DocumentType>(uuid: unknown, docType?: TDocType): boolean {
        if (typeof uuid !== "string") return false;
        try {
            const parseResult = fu.parseUuid(uuid);
            const isCompendiumUUID = parseResult?.collection instanceof fd.collections.CompendiumCollection;
            return isCompendiumUUID && (docType ? uuid.includes(`.${docType}.`) : true);
        } catch {
            return false;
        }
    }

    static isTokenUUID(uuid: unknown): uuid is TokenDocumentUUID {
        if (typeof uuid !== "string") return false;
        try {
            const parsed = fu.parseUuid(uuid);
            return parsed?.primaryType === "Scene" && parsed.embedded[0] === "Token";
        } catch {
            return false;
        }
    }
}

export { UUIDUtils };
