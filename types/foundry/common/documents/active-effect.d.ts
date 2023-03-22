declare module foundry {
    module documents {
        /**
         * The ActiveEffect document model.
         * @param data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseActiveEffect<
            TParent extends BaseActor | BaseItem<BaseActor | null> | null
        > extends abstract.Document<TParent> {
            static override get metadata(): ActiveEffectMetadata;

            protected override _preCreate(
                data: PreDocumentId<ActiveEffectSource>,
                options: DocumentModificationContext<TParent>,
                user: BaseUser
            ): Promise<void>;

            override testUserPermission(
                user: BaseUser,
                permission: DocumentOwnershipString | DocumentOwnershipLevel,
                { exact }?: { exact?: boolean }
            ): boolean;
        }

        interface BaseActiveEffect<TParent extends BaseActor | BaseItem<BaseActor | null> | null>
            extends abstract.Document<TParent> {
            readonly _source: ActiveEffectSource;
        }

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
            icon: ImageFilePath;
            tint: string;
            origin: string | undefined;
            transfer: boolean;
            flags: Record<string, unknown>;
        }

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

        interface ActiveEffectMetadata extends abstract.DocumentMetadata {
            name: "ActiveEffect";
            collection: "effects";
            label: "DOCUMENT.ActiveEffect";
            isEmbedded: true;
        }
    }
}
