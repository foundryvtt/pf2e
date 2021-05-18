export {};

declare global {
    module foundry {
        module data {
            interface ActorSource extends foundry.abstract.DocumentSource {
                data: object;
                type: string;
                img: string;
                token: TokenSource;
                items: ItemSource[];
                effects: ActiveEffectSource[];
                folder?: string | null;
                sort: number;
            }

            class ActorData<
                TActiveEffect extends ActiveEffect = ActiveEffect,
                TItem extends Item = Item
            > extends foundry.abstract.DocumentData {
                // @ts-ignore
                effects: foundry.abstract.EmbeddedCollection<TActiveEffect>;
                // @ts-ignore
                items: foundry.abstract.EmbeddedCollection<TItem>;
            }
            interface ActorData<TActiveEffect extends ActiveEffect, TItem extends Item>
                extends foundry.abstract.DocumentData,
                    Omit<ActorSource, '_id' | 'effects' | 'items'> {
                _source: ActorSource;
            }
        }
    }
}
