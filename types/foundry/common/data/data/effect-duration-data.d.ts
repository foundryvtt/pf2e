declare module foundry {
    module data {
        /**
         * An embedded data structure which tracks the duration of an ActiveEffect.
         * @property startTime    The world time when the active effect first started
         * @property [seconds]    The maximum duration of the effect, in seconds
         * @property [combat]     The _id of the CombatEncounter in which the effect first started
         * @property [rounds]     The maximum duration of the effect, in combat rounds
         * @property [turns]      The maximum duration of the effect, in combat turns
         * @property [startRound] The round of the CombatEncounter in which the effect first started
         * @property [startTurn]  The turn of the CombatEncounter in which the effect first started
         */
        interface EffectDurationSource {
            startTime: number;
            seconds: number | undefined;
            combat?: string;
            rounds: number | undefined;
            turns: number | undefined;
            startRound: number | null;
            startTurn: number | null;
        }

        class EffectDurationData<
            TDocument extends documents.BaseActiveEffect = documents.BaseActiveEffect
        > extends abstract.DocumentData<TDocument> {}

        interface EffectDurationData extends EffectDurationSource {
            readonly _source: EffectDurationSource;

            /** @todo uncomment when prettier is updated to support typescript 4.3 */
            // get schema(): ReturnType<typeof EffectDurationData['defineSchema']>;
        }

        namespace EffectDurationData {
            const schema: ReturnType<(typeof EffectDurationData)["defineSchema"]>;
        }
    }
}
