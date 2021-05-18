export {};

declare global {
    module foundry {
        module data {
            interface ActorSource extends abstract.DocumentSource {
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
                TActiveEffect extends documents.BaseActiveEffect = documents.BaseActiveEffect,
                TItem extends documents.BaseItem = documents.BaseItem
            > extends abstract.DocumentData {
                effects: abstract.EmbeddedCollection<TActiveEffect>;
                items: abstract.EmbeddedCollection<TItem>;
            }
            interface ActorData extends Omit<ActorSource, '_id' | 'effects' | 'items'> {
                _source: ActorSource;
                document: documents.BaseActor | null;
            }
        }
    }
}
