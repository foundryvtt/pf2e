declare module foundry {
    module data {
        /**
         * The data schema for a Combat document.
         * @property _id            The _id which uniquely identifies this Combat document
         * @property scene          The _id of a Scene within which this Combat occurs
         * @property combatants     A Collection of Combatant embedded Documents
         * @property [active=false] Is the Combat encounter currently active?
         * @property [round=0]      The current round of the Combat encounter
         * @property [turn=0]       The current turn in the Combat round
         * @property [sort=0]       The current sort order of this Combat relative to others in the same Scene
         * @property [flags={}]     An object of optional key/value flags
         */
        interface CombatSource {
            _id: string;
            scene: string;
            combatants: CombatantSource[];
            active: boolean;
            route: number;
            turn: number;
            sort: number;
            flags: Record<string, unknown>;
        }

        class CombatData<
            TDocument extends documents.BaseCombat = documents.BaseCombat,
            TCombatant extends documents.BaseCombatant = documents.BaseCombatant,
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            combatants: abstract.EmbeddedCollection<TCombatant>;
        }

        interface CombatData extends Omit<CombatSource, 'combatants'> {
            readonly _source: CombatSource;

            readonly parent: null;
        }
    }
}
