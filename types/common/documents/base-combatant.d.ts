declare module foundry {
    module documents {
        /** The Combat document model. */
        class BaseCombatant extends abstract.Document {
            /** @override */
            static get schema(): typeof data.CombatantData;

            /** @override */
            static get metadata(): CombatantMetadata;

            /** Is a user able to update an existing Combatant? */
            protected static _canUpdate(
                user: documents.BaseUser,
                doc: BaseCombatant,
                data: data.CombatantData,
            ): boolean;
        }

        interface BaseCombatant {
            readonly data: data.CombatantData<BaseCombatant>;
        }

        interface CombatantMetadata extends abstract.DocumentMetadata {
            name: 'Combatant';
            collection: 'combatants';
            label: 'DOCUMENT.Combatant';
            isPrimary: true;
            permissions: {
                create: 'PLAYER';
                update: typeof BaseCombatant['_canUpdate'];
                delete: 'ASSISTANT';
            };
        }
    }
}
