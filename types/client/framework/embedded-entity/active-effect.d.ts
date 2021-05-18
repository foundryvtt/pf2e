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

/**
 * @property _id         The EmbeddedEntity id of the Active Effect
 * @property label       The label which describes this effect
 * @property duration    The duration of the effect
 * @property changes     The changes applied by this effect
 * @property [disabled]  Is this effect currently disabled?
 * @property [icon]      An image icon path for this effect
 * @property [tint]      A hex color string to tint the effect icon
 * @property [origin]    The UUID of an Entity or EmbeddedEntity which was the source of this effect
 * @property [transfer]  Should this effect transfer automatically to an Actor when its Item becomes owned?
 * @property flags       Additional key/value flags
 */

declare interface ActiveEffectData extends EmbeddedEntityData {
    label: string;
    duration: ActiveEffectDuration;
    changes: ActiveEffectChange[];
    disabled: boolean;
    icon: string;
    tint: string;
    origin: string;
    transfer: boolean;
}

declare class ActiveEffect<ParentType extends Actor | Item = Actor | Item>
    extends EmbeddedEntity<ParentType>
    implements TemporaryEffect {
    _sourceName: string | null;

    /** @override */
    constructor(data: ActiveEffectData, parent: ParentType);

    /**
     * Report the active effect duration
     *
     */
    get duration(): ActiveEffectDurationSummary;

    /**
     * Describe whether the ActiveEffect has a temporary duration based on combat turns or rounds.
     */
    get isTemporary(): boolean;

    /**
     * A cached property for obtaining the source name
     */
    get sourceName(): string;

    /**
     * Get the name of the source of the Active Effect
     */
    protected _getSourceName(): Promise<string>;

    /**
     * An instance of the ActiveEffectConfig sheet to use for this ActiveEffect instance.
     * The reference to the sheet is cached so the same sheet instance is reused.
     */
    get sheet(): ActiveEffectConfig;

    /* -------------------------------------------- */
    /*  Effect Application                          */
    /* -------------------------------------------- */

    /**
     * Apply this ActiveEffect to a provided Actor.
     * @param actor                 The Actor to whom this effect should be applied
     * @param change   The change data being applied
     * @return The resulting applied value
     */
    apply(actor: Actor, change: ActiveEffectChange): ActiveEffectChange['value'];

    /**
     * Apply an ActiveEffect that uses an ADD application mode.
     * The way that effects are added depends on the data type of the current value.
     *
     * If the current value is null, the change value is assigned directly.
     * If the current type is a string, the change value is concatenated.
     * If the current type is a number, the change value is cast to numeric and added.
     * If the current type is an array, the change value is appended to the existing array if it matches in type.
     *
     * @param actor The Actor to whom this effect should be applied
     * @param change The change data being applied
     * @return The resulting applied value
     */
    protected _applyAdd(actor: Actor, change: ActiveEffectChange): number;

    /**
     * Apply an ActiveEffect that uses a MULTIPLY application mode.
     * @param actor The Actor to whom this effect should be applied
     * @param change The change data being applied
     * @return The resulting applied value
     */
    protected _applyMultiply(actor: Actor, change: ActiveEffectChange): number;

    /**
     * Apply an ActiveEffect that uses an OVERRIDE, UPGRADE, or DOWNGRADE application mode.
     * @param actor The Actor to whom this effect should be applied
     * @param change The change data being applied
     * @return The resulting applied value
     */
    protected _applyOverride(actor: Actor, change: ActiveEffectChange): ActiveEffectChange['value'];

    /**
     * Apply an ActiveEffect that uses a CUSTOM application mode.
     * @param actor The Actor to whom this effect should be applied
     * @param change The change data being applied
     * @return The resulting applied value
     */
    protected _applyCustom(actor: Actor, change: ActiveEffectChange): ActiveEffectChange['value'];

    /* -------------------------------------------- */
    /*  Database Operations                         */
    /* -------------------------------------------- */

    /**
     * A convenience method for creating an ActiveEffect instance within a parent Actor or Item.
     * @see {@link Entity#createEmbeddedEntity}
     * @param options Configuration options which modify the request.
     * @return The created ActiveEffect data.
     */
    create(options?: EntityCreateOptions): Promise<ActiveEffectData>;

    /**
     * A convenience method for updating an ActiveEffect instance in an parent Actor or Item.
     * @see {@link Entity#updateEmbeddedEntity}
     * @param data Differential data with which to update the ActiveEffect.
     * @param options Configuration options which modify the request.
     * @return The updated ActiveEffect data.
     */
    update(data: Record<string, unknown>, options?: EntityUpdateOptions): Promise<ActiveEffectData>;

    /**
     * A convenience method for deleting an ActiveEffect instance in an parent Actor or Item.
     * @see {@link Entity#deleteEmbeddedEntity}
     * @param options Configuration options which modify the request.
     * @return The deleted ActiveEffect _id.
     */
    delete(options?: EntityDeleteOptions): Promise<string>;

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * A factory method which creates an ActiveEffect instance using the configured class.
     * @param args Initialization arguments passed to the ActiveEffect constructor.
     * @return The constructed ActiveEffect instance.
     */
    static create(data: Partial<ActiveEffectData>, parent: Actor | Item): ActiveEffect;

    /**
     * A helper function to handle obtaining dropped ActiveEffect data from a dropped data transfer event.
     * @param data  The data object extracted from a DataTransfer event
     * @return The ActiveEffect instance which contains the dropped effect data
     */
    static fromDropData(data: Partial<ActiveEffectData>): Promise<ActiveEffect>;
}

declare interface ActiveEffect {
    data: ActiveEffectData;

    getFlag(scope: 'core', key: 'overlay'): string | undefined;
    getFlag(scope: 'core', key: 'statusId'): string | undefined;
    getFlag(scope: string, key: string): unknown;
}
