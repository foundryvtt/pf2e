declare module foundry {
    module documents {
        /** The Combat document model. */
        class BaseCombatant extends abstract.Document {
            static override get schema(): typeof data.CombatantData;

            static override get metadata(): CombatantMetadata;

            /** Is a user able to update an existing Combatant? */
            protected static _canUpdate(
                user: documents.BaseUser,
                doc: BaseCombatant,
                data: data.CombatantData
            ): boolean;
        }

        interface BaseCombatant {
            readonly data: foundry.data.CombatantData<this>;
            readonly parent: BaseCombat | null;
        }

        interface CombatantMetadata extends abstract.DocumentMetadata {
            name: "Combatant";
            collection: "combatants";
            label: "DOCUMENT.Combatant";
            isPrimary: true;
            permissions: {
                create: "PLAYER";
                update: typeof BaseCombatant["_canUpdate"];
                delete: "ASSISTANT";
            };
        }
    }
}
