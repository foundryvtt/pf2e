// @ts-nocheck

export {};

declare global {
    module foundry {
        module data {
            interface ItemSource extends foundry.abstract.DocumentSource {
                data: object;
                type: string;
                img: foundry.data.ImageField;
                effects: foundry.data.ActiveEffectSource[];
                folder?: string | null;
                sort: number;
            }

            class ItemData<
                TActiveEffect extends documents.BaseActiveEffect = documents.BaseActiveEffect
            > extends abstract.DocumentData {
                effects: abstract.EmbeddedCollection<TActiveEffect>;
            }
            interface ItemData extends Omit<ItemSource, '_id' | 'effects'> {
                _source: ItemSource;
                document: documents.BaseItem | null;
            }
        }
    }
}
