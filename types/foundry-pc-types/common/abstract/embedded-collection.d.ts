export {};

declare global {
    module foundry {
        module abstract {
            /**
             * An extension of the Collection.
             * Used for the specific task of containing embedded Document instances within a parent Document.
             * @param sourceArray The source data array for the collection in the parent Document data
             */
            abstract class EmbeddedCollection<DocType extends foundry.abstract.Document> extends foundry.utils
                .Collection<DocType> {
                /** @override */
                constructor(
                    sourceArray: DocType['data']['_source'][],
                    documentClass: {
                        new (
                            data: DocType['data']['_source'],
                            context?: foundry.abstract.DocumentConstructorContext,
                        ): DocType;
                    },
                );

                /** @override */
                set(key: string, value: DocType, { modifySource }?: { modifySource?: boolean }): this;

                /** @override */
                delete(key: string, { modifySource }?: { modifySource?: boolean }): boolean;

                /** @override */
                toObject(source?: boolean): RawObject<DocType['data']>[];
            }
        }
    }
}
