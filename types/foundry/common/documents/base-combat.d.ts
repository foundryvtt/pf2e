declare module foundry {
    module documents {
        /** The Combat document model. */
        class BaseCombat extends abstract.Document {
            static override get schema(): typeof data.CombatData;

            static override get metadata(): CombatMetadata;

            /** A reference to the Collection of Combatant instances in the Combat document, indexed by id. */
            get combatants(): this['data']['combatants'];

            /** Is a user able to update an existing Combat? */
            protected static _canUpdate(user: documents.BaseUser, doc: BaseCombat, data: data.CombatData): boolean;
        }

        interface BaseCombat {
            readonly data: data.CombatData<this, BaseCombatant>;
            readonly parent: null;
        }

        interface CombatMetadata extends abstract.DocumentMetadata {
            name: 'Combat';
            collection: 'combats';
            label: 'DOCUMENT.Combat';
            embedded: {
                Combatant: typeof BaseCombatant;
            };
            isPrimary: true;
            permissions: {
                create: 'ASSISTANT';
                update: typeof BaseCombat['_canUpdate'];
                delete: 'ASSISTANT';
            };
        }
    }
}
