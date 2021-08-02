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
            icon: ImagePath;
            tint: string;
            origin: string | undefined;
            transfer: boolean;
            flags: Record<string, unknown>;
        }

        class ActiveEffectData<
            TDocument extends documents.BaseActiveEffect = documents.BaseActiveEffect
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            /** @property duration The duration of the effect */
            duration: EffectDurationData<TDocument>;

            /** @property changes The changes applied by this effect */
            changes: EffectChangeData<TDocument>[];
        }

        interface ActiveEffectData extends Omit<ActiveEffectSource, "duration" | "changes"> {
            readonly _source: ActiveEffectSource;
        }
    }
}

declare interface ActiveEffectDurationSummary {
    type: "seconds" | "turns" | "none";
    duration: number;
    remaining: number;
    label: string;
}
