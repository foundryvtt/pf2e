declare module foundry {
    module data {
        /**
         * @property _id         The EmbeddedEntity id of the Active Effect
         * @property label       The label which describes this effect
         * @property [disabled]  Is this effect currently disabled?
         * @property [icon]      An image icon path for this effect
         * @property [tint]      A hex color string to tint the effect icon
         * @property [origin]    The UUID of an Entity or EmbeddedEntity which was the source of this effect
         * @property [transfer]  Should this effect transfer automatically to an Actor when its Item becomes owned?
         * @property flags       Additional key/value flags
         */
        interface ActiveEffectSource {
            _id: string;
            label: string;
            duration: EffectDurationSource;
            changes: EffectChangeSource[];
            disabled: boolean;
            icon: ImageField;
            tint: string;
            origin: string;
            transfer: boolean;
            flags: Record<string, unknown>;
        }

        class ActiveEffectData<
            TDocument extends documents.BaseActiveEffect = documents.BaseActiveEffect
        > extends abstract.DocumentData<TDocument> {
            /** @override */
            static defineSchema(): abstract.DocumentSchema;

            /** @property duration The duration of the effect */
            duration: EffectDurationData;

            /** @property changes The changes applied by this effect */
            changes: EffectChangeData[];
        }

        interface ActiveEffectData extends Omit<ActiveEffectSource, '_id' | 'duration' | 'changes'> {
            readonly _source: ActiveEffectSource;
        }
    }
}

/**
 * @property [startTime]   The game time in seconds when the effect started
 * @property [seconds]     The duration of the effect, in seconds
 * @property [combat]      The _id of the Combat entity where the effect began
 * @property [rounds]      The number of combat rounds the effect lasts
 * @property [turns]       The number of combat turns that the effect lasts
 * @property [startRound]  The round of combat in which the effect started
 * @property [startTurn]   The turn of combat in which the effect started
 */
declare interface ActiveEffectDuration {
    startTime?: number;
    seconds?: number;
    combat?: string;
    rounds?: number;
    turns?: number;
    startRound?: number;
    startTurn?: number;
}

declare interface ActiveEffectDurationSummary {
    type: 'seconds' | 'turns' | 'none';
    duration: number;
    remaining: number;
    label: string;
}

/**
 * @property key       The key
 * @property value     The value of the change
 * @property mode      The mode of the change application
 * @property priority  The priority with which this change is applied
 */
declare interface ActiveEffectChange {
    key: string;
    value: string | number;
    mode: number;
    priority: number;
}
