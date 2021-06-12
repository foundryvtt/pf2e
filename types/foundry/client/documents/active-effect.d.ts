import { ActiveEffectConstructor } from './constructors';

declare global {
    /**
     * The ActiveEffect embedded document within an Actor or Item document which extends the BaseRollTable abstraction.
     * Each ActiveEffect belongs to the effects collection of its parent Document.
     * Each ActiveEffect contains a ActiveEffectData object which provides its source data.
     */
    class ActiveEffect extends ActiveEffectConstructor implements TemporaryEffect {
        /** @override */
        constructor(
            data: PreCreate<foundry.data.ActiveEffectSource>,
            context?: DocumentConstructionContext<ActiveEffect>,
        );

        /** A cached reference to the source name to avoid recurring database lookups */
        protected _sourceName: string | null;

        /** A cached reference to the ActiveEffectConfig instance which configures this effect */
        override _sheet: ActiveEffectConfig<this> | null;

        /** Summarize the active effect duration */
        get duration(): {
            type: string;
            duration: number | null;
            remaining: number | null;
            label: string;
        };

        /**
         * Format a round+turn combination as a decimal
         * @param round    The round number
         * @param turn     The turn number
         * @param [nTurns] The maximum number of turns in the encounter
         * @returns The decimal representation
         */
        protected _getCombatTime(round: number, turn: number, nTurns?: number): number;

        /**
         * Format a number of rounds and turns into a human-readable duration label
         * @param rounds The number of rounds
         * @param turns   The number of turns
         * @returns The formatted label
         */
        protected _getDurationLabel(rounds: number, turns: number): string;

        /** Describe whether the ActiveEffect has a temporary duration based on combat turns or rounds. */
        get isTemporary(): boolean;

        /** A cached property for obtaining the source name */
        get sourceName(): string;

        /**
         * An instance of the ActiveEffectConfig sheet to use for this ActiveEffect instance.
         * The reference to the sheet is cached so the same sheet instance is reused.
         */
        override get sheet(): NonNullable<this['_sheet']>;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /**
         * Apply this ActiveEffect to a provided Actor.
         * @param actor  The Actor to whom this effect should be applied
         * @param change The change data being applied
         * @return The resulting applied value
         */
        apply(actor: Actor, change: ApplicableChangeData<this>): unknown;

        /**
         * Apply an ActiveEffect that uses an ADD application mode.
         * The way that effects are added depends on the data type of the current value.
         *
         * If the current value is null, the change value is assigned directly.
         * If the current type is a string, the change value is concatenated.
         * If the current type is a number, the change value is cast to numeric and added.
         * If the current type is an array, the change value is appended to the existing array if it matches in type.
         *
         * @param actor  The Actor to whom this effect should be applied
         * @param change The change data being applied
         * @return The resulting applied value
         */
        protected _applyAdd(actor: Actor, change: ApplicableChangeData<this>): unknown;

        /**
         * Apply an ActiveEffect that uses a MULTIPLY application mode.
         * Changes which MULTIPLY must be numeric to allow for multiplication.
         * @param actor  The Actor to whom this effect should be applied
         * @param change The change data being applied
         * @return The resulting applied value
         */
        protected _applyMultiply(actor: Actor, change: ApplicableChangeData<this>): unknown;

        /**
         * Apply an ActiveEffect that uses an OVERRIDE application mode.
         * Numeric data is overridden by numbers, while other data types are overridden by any value
         * @param actor The Actor to whom this effect should be applied
         * @param change The change data being applied
         * @return The resulting applied value
         */
        protected _applyOverride(actor: Actor, change: ApplicableChangeData<this>): unknown;

        /**
         * Apply an ActiveEffect that uses an UPGRADE, or DOWNGRADE application mode.
         * Changes which UPGRADE or DOWNGRADE must be numeric to allow for comparison.
         * @param actor The Actor to whom this effect should be applied
         * @param change The change data being applied
         * @return The resulting applied value
         */
        protected _applyUpgrade(actor: Actor, change: ApplicableChangeData<this>): unknown;

        /**
         * Apply an ActiveEffect that uses a CUSTOM application mode.
         * @param actor  The Actor to whom this effect should be applied
         * @param change The change data being applied
         * @return The resulting applied value
         */
        protected _applyCustom(actor: Actor, change: ApplicableChangeData<this>): unknown;

        /** Get the name of the source of the Active Effect */
        protected _getSourceName(): Promise<string>;

        /* -------------------------------------------- */
        /*  Event Handlers                              */
        /* -------------------------------------------- */

        protected override _preCreate(
            data: PreDocumentId<this['data']['_source']>,
            options: DocumentModificationContext,
            user: User,
        ): Promise<void>;
    }

    interface ActiveEffect {
        readonly data: foundry.data.ActiveEffectData<this>;
        readonly parent: Actor | Item | null;

        getFlag(scope: 'core', key: 'overlay'): string | undefined;
        getFlag(scope: 'core', key: 'statusId'): string | undefined;
        getFlag(scope: string, key: string): unknown;
    }

    interface TemporaryEffect {
        isTemporary: boolean;
        data: {
            disabled: boolean;
            icon: string;
            tint: string;
        };
    }

    interface ApplicableChangeData<T extends ActiveEffect> extends foundry.data.EffectChangeSource {
        effect: T;
    }
}
