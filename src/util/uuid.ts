import * as R from "remeda";

class UUIDUtils {
    /** Retrieve multiple documents by UUID */
    static async fromUUIDs(uuids: string[]): Promise<ClientDocument[]> {
        const documentsAndIndexData = R.uniq(uuids).flatMap((u) => fromUuidSync(u) ?? []);
        const worldDocsAndCacheHits = documentsAndIndexData.filter(
            (d): d is ClientDocument => d instanceof foundry.abstract.Document
        );
        const indexEntries = documentsAndIndexData.filter(
            (d): d is CompendiumIndexData => !(d instanceof foundry.abstract.Document)
        );
        const packs = R.uniq(indexEntries.flatMap((e) => game.packs.get(e.pack ?? "") ?? []));
        const packDocs = (
            await Promise.all(
                packs.map(async (pack) => {
                    const ids = indexEntries.filter((e) => e.pack === pack.metadata.id).map((e) => e._id);
                    return pack.getDocuments({ _id__in: ids });
                })
            )
        ).flat();

        return R.sortBy([...worldDocsAndCacheHits, ...packDocs], (d) => uuids.indexOf(d.uuid));
    }

    static isItemUUID(uuid: unknown): uuid is ItemUUID {
        return typeof uuid === "string" && foundry.utils.parseUuid(uuid).documentType === "Item";
    }

    static isTokenUUID(uuid: unknown): uuid is TokenDocumentUUID {
        return typeof uuid === "string" && foundry.utils.parseUuid(uuid).documentType === "Token";
    }
}

export { UUIDUtils };
