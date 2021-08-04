declare module foundry {
    module data {
        /**
         * The data schema for a Combat document.
         * @property _id              The _id which uniquely identifies this Combatant embedded document
         * @property [tokenId]        The _id of a Token associated with this Combatant
         * @property [name]           A customized name which replaces the name of the Token in the tracker
         * @property [img]            A customized image which replaces the Token image in the tracker
         * @property [initiative]     The initiative score for the Combatant which determines its turn order
         * @property [hidden=false]   Is this Combatant currently hidden?
         * @property [defeated=false] Has this Combatant been defeated?
         * @property [flags={}]       An object of optional key/value flags
         */
        interface CombatantSource {
            _id: string;
            actorId: string;
            tokenId: string;
            img: VideoPath;
            initiative: number;
            hidden: boolean;
            defeated: boolean;
            flags: Record<string, unknown>;
        }

        class CombatantData<
            TDocument extends documents.BaseCombatant = documents.BaseCombatant
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;
        }

        interface CombatantData extends CombatantSource {
            readonly _source: CombatantSource;
        }
    }
}
