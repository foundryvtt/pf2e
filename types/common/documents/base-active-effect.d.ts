declare module foundry {
    module documents {
        /**
         * The ActiveEffect document model.
         * @memberof documents
         *
         * @param data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseActiveEffect extends abstract.Document {
            /** @override */
            static get schema(): typeof data.ActiveEffectData;

            /** @override */
            static get metadata(): ActiveEffectMetadata;

            /** @override */
            _preCreate(
                data: data.ActiveEffectSource,
                options: DocumentModificationContext,
                user: BaseUser,
            ): Promise<void>;

            /** @override */
            testUserPermission(user: BaseUser, permission: UserPermission, { exact }?: { exact?: boolean }): boolean;
        }
        interface ActiveEffectMetadata extends abstract.DocumentMetadata {
            name: 'ActiveEffect';
            collection: 'effects';
            label: 'DOCUMENT.ActiveEffect';
            isEmbedded: true;
        }
    }
}
