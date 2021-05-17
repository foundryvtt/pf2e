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

            class ItemData<TActiveEffect extends ActiveEffect = ActiveEffect> extends foundry.abstract.DocumentData {
                effects: foundry.abstract.EmbeddedCollection<TActiveEffect>;
            }
            interface ItemData<TActiveEffect extends ActiveEffect>
                extends foundry.abstract.DocumentData,
                    Omit<ItemSource, '_id' | 'effects'> {
                _source: ItemSource;
                document: Item | null;
            }
        }
    }
}
