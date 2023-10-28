import * as R from "remeda";

class UUIDUtils {
    /** Retrieve multiple documents by UUID */
    static async fromUUIDs(uuids: string[], options?: { relative?: Maybe<ClientDocument> }): Promise<ClientDocument[]> {
        const resolvedUUIDs = R.uniq(uuids).flatMap((u) => foundry.utils.parseUuid(u, options).uuid ?? []);

        // These can't be retrieved via `fromUuidSync`: separate and retrieve directly via `fromUuid`
        const packEmbeddedLinks = resolvedUUIDs.filter((u) => {
            const parsed = foundry.utils.parseUuid(u, options);
            return parsed.collection instanceof CompendiumCollection && parsed.embedded.length > 0;
        });
        const packEmbeddedDocs = R.compact(await Promise.all(packEmbeddedLinks.map((u) => fromUuid(u))));

        const documentsAndIndexData = R.compact(
            resolvedUUIDs.filter((u) => !packEmbeddedLinks.includes(u)).map((u) => fromUuidSync(u)),
        );
        const worldDocsAndCacheHits = documentsAndIndexData.filter(
            (d): d is ClientDocument => d instanceof foundry.abstract.Document,
        );
        const indexEntries = documentsAndIndexData.filter(
            (d): d is CompendiumIndexData => !(d instanceof foundry.abstract.Document),
        );
        const packs = R.uniq(indexEntries.flatMap((e) => game.packs.get(e.pack ?? "") ?? []));
        const packDocs = (
            await Promise.all(
                packs.map(async (pack) => {
                    const ids = indexEntries.filter((e) => e.pack === pack.metadata.id).map((e) => e._id);
                    return pack.getDocuments({ _id__in: ids });
                }),
            )
        ).flat();

        return R.sortBy([...packEmbeddedDocs, ...worldDocsAndCacheHits, ...packDocs], (d) => uuids.indexOf(d.uuid));
    }

    static isItemUUID(uuid: unknown): uuid is ItemUUID {
        return typeof uuid === "string" && foundry.utils.parseUuid(uuid).documentType === "Item";
    }

    static isCompendiumUUID(uuid: unknown): uuid is CompendiumUUID {
        return typeof uuid === "string" && foundry.utils.parseUuid(uuid).collection instanceof CompendiumCollection;
    }

    static isTokenUUID(uuid: unknown): uuid is TokenDocumentUUID {
        if (typeof uuid !== "string") return false;
        const parsed = foundry.utils.parseUuid(uuid);
        return parsed.documentType === "Scene" && parsed.embedded[0] === "Token";
    }
}

export { UUIDUtils };
