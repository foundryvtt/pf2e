import type * as abstract from "./module.d.ts";
import type { RawObject } from "./data.d.ts";

/**
 * An extension of the Collection.
 * Used for the specific task of containing embedded Document instances within a parent Document.
 * @param sourceArray The source data array for the collection in the parent Document data
 */
export class EmbeddedCollection<TModel extends abstract.DataModel | abstract.Document> extends Collection<TModel> {
    constructor(
        sourceArray: TModel["_source"][],
        documentClass: {
            new (data: TModel["_source"], context?: DataModelConstructionOptions<TModel["parent"]>): TModel;
        }
    );

    override set(key: string, value: TModel, { modifySource }?: { modifySource?: boolean }): this;

    override delete(key: string, { modifySource }?: { modifySource?: boolean }): boolean;

    toObject<T extends true>(source?: T): TModel["_source"][];
    toObject<T extends false>(source: T): RawObject<TModel>[];
    toObject<T extends boolean>(source?: T): TModel["_source"][] | RawObject<TModel>[];
}
