declare module foundry {
    module data {
        /**
         * An embedded data structure which defines the structure of a change applied by an ActiveEffect.
         * @property key The attribute path in the Actor or Item data which the change modifies
         * @property value The value of the change effect
         * @property mode The modification mode with which the change is applied
         * @property priority The priority level with which this change is applied
         */
        interface EffectChangeSource {
            key: string;
            value: string;
            mode: ActiveEffectChangeMode;
            priority: number;
        }

        class EffectChangeData<
            TDocument extends documents.BaseActiveEffect = documents.BaseActiveEffect
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;
        }

        interface EffectChangeData extends EffectChangeSource {
            readonly _source: EffectDurationSource;
        }
    }
}

declare type ActiveEffectChangeMode = typeof CONST.ACTIVE_EFFECT_MODES[keyof typeof CONST.ACTIVE_EFFECT_MODES];
