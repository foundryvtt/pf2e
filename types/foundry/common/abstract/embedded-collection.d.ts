import type Document from "./document.d.ts";

/**
 * An extension of the Collection.
 * Used for the specific task of containing embedded Document instances within a parent Document.
 * @param sourceArray The source data array for the collection in the parent Document data
 */
export default class EmbeddedCollection<TDocument extends Document<Document>> extends Collection<TDocument> {
    constructor(
        sourceArray: TDocument["_source"][],
        documentClass: {
            new (data: TDocument["_source"], context?: DocumentConstructionContext<TDocument["parent"]>): TDocument;
        }
    );

    override set(key: string, value: TDocument, { modifySource }?: { modifySource?: boolean }): this;

    override delete(key: string, { modifySource }?: { modifySource?: boolean }): boolean;

    toObject<T extends true>(source?: T): TDocument["_source"][];
    toObject<T extends false>(source: T): RawObject<TDocument>[];
    toObject<T extends boolean>(source?: T): TDocument["_source"][] | RawObject<TDocument>[];
}
