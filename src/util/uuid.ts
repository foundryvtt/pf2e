import * as R from "remeda";

class UUIDUtils {
    /** Retrieve multiple documents by UUID */
    static async fromUUIDs(uuids: string[], options?: { relative?: Maybe<ClientDocument> }): Promise<ClientDocument[]> {
        const resolvedUUIDs = R.unique(uuids).flatMap((u) => fu.parseUuid(u, options).uuid ?? []);

        // These can't be retrieved via `fromUuidSync`: separate and retrieve directly via `fromUuid`
        const packEmbeddedLinks = resolvedUUIDs.filter((u) => {
            const parsed = fu.parseUuid(u, options);
            return parsed.collection instanceof CompendiumCollection && parsed.embedded.length > 0;
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

        return R.sortBy([...packEmbeddedDocs, ...worldDocsAndCacheHits, ...packDocs], (d) => uuids.indexOf(d.uuid));
    }

    static isItemUUID(uuid: unknown): uuid is ItemUUID {
        try {
            return typeof uuid === "string" && fu.parseUuid(uuid).type === "Item";
        } catch {
            return false;
        }
    }

    static isCompendiumUUID(uuid: unknown): uuid is CompendiumUUID {
        try {
            return typeof uuid === "string" && fu.parseUuid(uuid).collection instanceof CompendiumCollection;
        } catch {
            return false;
        }
    }

    static isTokenUUID(uuid: unknown): uuid is TokenDocumentUUID {
        if (typeof uuid !== "string") return false;
        try {
            const parsed = fu.parseUuid(uuid);
            return parsed.documentType === "Scene" && parsed.embedded[0] === "Token";
        } catch {
            return false;
        }
    }
}

export { UUIDUtils };
