declare module foundry {
    module documents {
        /**
         * The ActiveEffect document model.
         * @param data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseActiveEffect extends abstract.Document {
            static override get schema(): typeof data.ActiveEffectData;

            static override get metadata(): ActiveEffectMetadata;

            protected override _preCreate(
                data: PreDocumentId<data.ActiveEffectSource>,
                options: DocumentModificationContext,
                user: BaseUser,
            ): Promise<void>;

            override testUserPermission(
                user: BaseUser,
                permission: DocumentPermission | UserAction,
                { exact }?: { exact?: boolean },
            ): boolean;
        }

        interface BaseActiveEffect {
            readonly data: data.ActiveEffectData<BaseActiveEffect>;

            readonly parent: BaseActor | BaseItem | null;
        }

        interface ActiveEffectMetadata extends abstract.DocumentMetadata {
            name: 'ActiveEffect';
            collection: 'effects';
            label: 'DOCUMENT.ActiveEffect';
            isEmbedded: true;
        }
    }
}
