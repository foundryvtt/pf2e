import { ToCompendiumOptions } from "@client/_module.mjs";
import { ActiveEffectChangeTypeConfig } from "@client/config.mjs";
import ActiveEffectRegistry from "@client/helpers/active-effect-registry.mjs";
import { DocumentConstructionContext } from "@common/_types.mjs";
import {
    DatabaseCreateCallbackOptions,
    DatabaseDeleteCallbackOptions,
    DatabaseUpdateCallbackOptions,
    DataModel,
} from "@common/abstract/_module.mjs";
import { ImageFilePath } from "@common/constants.mjs";
import { DataField } from "@common/data/fields.mjs";
import BaseActiveEffect, {
    ActiveEffectSource,
    EffectChangeData,
    EffectDurationData,
    EffectStartData,
} from "@common/documents/active-effect.mjs";
import {
    ActiveEffectChangeData,
    ActiveEffectDuration,
    Actor,
    BaseActor,
    BaseItem,
    BaseUser,
    Item,
} from "./_module.mjs";
import { ClientDocument } from "./abstract/client-document.mjs";
import { CompendiumCollection } from "./collections/_module.mjs";

declare const ClientBaseActiveEffect: new <TParent extends BaseActor | BaseItem | null>(
    ...args: any
) => BaseActiveEffect<TParent> & ClientDocument<TParent>;

/**
 * The ActiveEffect embedded document within an Actor or Item document which extends the BaseRollTable abstraction.
 * Each ActiveEffect belongs to the effects collection of its parent Document.
 * Each ActiveEffect contains a ActiveEffectData object which provides its source data.
 */
export default class ActiveEffect<
    TParent extends Actor | Item | null = Actor | Item | null,
> extends ClientBaseActiveEffect<TParent> {
    /**
     * A cached compilation of core and registered application phases, along with their labels
     */
    static get CHANGE_PHASES(): Record<string, { label: string; hint: string }>;

    /**
     * A cached compilation of core and registered change types, along with their labels and default priorities
     */
    static get CHANGE_TYPES(): Record<string, ActiveEffectChangeTypeConfig>;

    /**
     * A cached compilation of core and registered expiry events
     */
    static get EXPIRY_EVENTS(): Record<string, string>;

    /**
     * A helper class that accepts registration of ActiveEffects and manages their prepared duration and expiry data.
     */
    static registry: ActiveEffectRegistry;

    /**
     * Create an ActiveEffect instance from some status effect ID.
     * Delegates to {@link ActiveEffect._fromStatusEffect} to create the ActiveEffect instance
     * after creating the ActiveEffect data from the status effect data if `CONFIG.statusEffects`.
     * @param statusId The status effect ID.
     * @param options  Additional options to pass to the ActiveEffect constructor.
     * @returns The created ActiveEffect instance.
     *
     * @throws {Error} An error if there is no status effect in `CONFIG.statusEffects` with the given status ID and if
     * the status has implicit statuses but doesn't have a static _id.
     */
    static fromStatusEffect(
        statusId: string,
        options?: DocumentConstructionContext<foundry.abstract.Document | null>,
    ): Promise<ActiveEffect<Actor | Item> | undefined>;

    /**
     * Create an ActiveEffect instance from status effect data.
     * Called by {@link ActiveEffect.fromStatusEffect}.
     * @param statusId   The status effect ID.
     * @param effectData The status effect data.
     * @param options    Additional options to pass to the ActiveEffect constructor.
     * @returns The created ActiveEffect instance.
     */
    protected static _fromStatusEffect(
        statusId: string,
        effectData: Partial<ActiveEffectSource>,
        options?: DocumentConstructionContext<foundry.abstract.Document | null>,
    ): Promise<ActiveEffect<Actor | Item> | undefined>;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The Actor in which this ActiveEffect is embedded, either directly or as a grandchild Document
     */
    get actor(): Actor | null;

    /**
     * The Item in which this ActiveEffect is embedded
     */
    get item(): Item | null;

    /**
     * Provide a thumbnail image path used to represent this document.
     */
    get thumbnail(): ImageFilePath;

    /**
     * Is there some system logic that makes this active effect ineligible for application?
     */
    get isSuppressed(): boolean;

    /**
     * Retrieve the Document that this ActiveEffect targets for modification.
     */
    get target(): TParent | TokenDocument | null;

    /**
     * Whether the Active Effect currently applying its changes to the target.
     */
    get active(): boolean;

    /**
     * Whether this Active Effect currently modifies an Actor.
     */
    get modifiesActor(): boolean;

    /**
     * Whether this Active Effect has a temporary duration
     */
    get isTemporary(): boolean;

    /**
     * Whether this Active Effect is eligible to be registered with the {@link ActiveEffectRegistry}
     */
    get isExpiryTrackable(): boolean;

    /**
     * The source name of the Active Effect. The source is retrieved synchronously.
     * Therefore "Unknown" (localized) is returned if the origin points to a document inside a compendium.
     * Returns "None" (localized) if it has no origin, and "Unknown" (localized) if the origin cannot be resolved.
     * @type {string}
     */
    get sourceName(): string;

    /* -------------------------------------------- */
    /*  Data Preparation                            */
    /* -------------------------------------------- */

    protected override _initialize(options?: object): void;

    override prepareBaseData(): void;

    override prepareDerivedData(): void;

    /**
     * Update derived Active Effect duration data.
     * Configure the remaining and label properties to be getters which lazily recompute only when necessary.
     */
    updateDuration(): ActiveEffectDuration;

    /**
     * Determine whether the ActiveEffect requires a duration update.
     * True if the worldTime has changed for an effect whose duration is tracked in seconds.
     * True if the combat turn has changed for an effect tracked in turns where the effect target is a combatant.
     */
    protected _requiresDurationUpdate(): boolean;

    /**
     * Compute derived data related to active effect duration.
     * @param duration Unprepared duration data
     * @param context Contextual information indicating what lead to this call
     */
    protected _prepareDuration(duration?: EffectDurationData, context?: object): ActiveEffectDuration;

    /**
     * Prepare duration data from time-based (minutes, seconds, etc.) source data.
     * @param duration Unprepared duration data
     * @param context Contextual information indicating what lead to this call
     */
    protected _prepareTimeBaseDuration(duration?: EffectDurationData, context?: object): ActiveEffectDuration;

    /**
     * Prepare duration data from combat-based (rounds or turns) source data.
     * @param duration Unprepared duration data
     * @param context Contextual information indicating what lead to this call
     */
    protected _prepareCombatBaseDuration(duration?: EffectDurationData, context?: object): ActiveEffectDuration;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override toCompendium(pack?: CompendiumCollection, options?: ToCompendiumOptions): object;

    /**
     * Determine whether a change from this ActiveEffect should be applied during the current phase. Systems and modules
     * may override this method to introduce additional conditions under which a change is applied.
     * @param change The change being considered.
     * @param options Options which affect whether the change is applied.
     * @param options.phase The application phase currently being evaluated.
     * @param options.replacementData Replacement data to be used as part of the change's application
     * @returns Should the change be applied during this phase (or at all)?
     */
    shouldApplyChange(change: ActiveEffectChangeData, options?: { phase?: string; replacementData?: string }): boolean;

    /**
     * Acquire replacement data for use in the application of this effect's changes.
     * @param baseData Base data sourced from elsewhere (by default from `Actor#getRollData`)
     * @returns Data used to resolve "@" expressions in string {@link ActiveEffectChangeData} values
     */
    getReplacementData(baseData: object): object;

    /**
     * Apply this ActiveEffect to a target Document.
     * @param targetDoc The Document to which this effect should be applied
     * @param change The change data being applied
     * @param options Options affecting the change application
     * @param options.replacementData Data used to resolve "@" expressions in a string value
     * @param options.modifyTarget Modify the target Document with the updated value.
     * @returns An object of property keys and their updated values
     */

    static applyChange(
        targetDoc: Actor | Item | TokenDocument,
        change: ActiveEffectChangeData,
        options?: { replacementData?: object; modifyTarget?: boolean },
    ): Record<string, unknown>;

    /**
     * Apply EffectChangeData to a field within a Document.
     * @param targetDoc The model instance.
     * @param change The change to apply.
     * @param options Additional options to configure the change application.
     * @param options.field The field: if not supplied, it will be retrieved from the supplied Document.
     * @param options.replacementData Data used to resolve "@" expressions.
     * @param options.modifyTarget Modify the target Document with the updated value.
     * @returns The updated value.
     */
    static applyChangeField(
        targetDoc: Actor | Item | TokenDocument,
        change: EffectChangeData,
        options?: { field?: DataField; replacementData?: Record<string, unknown>; modifyTarget?: boolean },
    ): unknown;

    /**
     * Apply this ActiveEffect to a provided Actor using a heuristic to infer the value types based on the current value
     * and/or the default value in the template.json.
     * @param targetDoc  The Document or DataModel to which this effect should be applied
     * @param change The change data being applied.
     * @param changes The aggregate update paths and their updated values.
     * @param options.replacementData Data used to resolve "@" expressions.
     * @param options.modifyTarget Modify the target Document with the updated value.
     */
    protected static _applyChangeUnguided(
        targetDoc: Actor | Item | TokenDocument | DataModel,
        change: ActiveEffectChangeData,
        changes: Record<string, unknown>,
        options?: { replacementData?: Record<string, unknown>; modifyTarget?: boolean },
    ): void;

    /**
     * Recursively replace data references in a string change value.
     * @param data An object providing replacements
     * @returns The string with all data references resolved
     * @throws An Error if data replacement failed
     */
    protected static _replaceDataRefs(raw: string, data: Record<string, unknown>): string | null;

    /**
     * Apply an ActiveEffect that uses an "add" change type.
     * The way that effects are added depends on the data type of the current value.
     *
     * If the current value is null, the change value is assigned directly.
     * If the current type is a string, the change value is concatenated.
     * If the current type is a number, the change value is cast to numeric and added.
     * If the current type is an array, the change value is appended to the existing array if it matches in type.
     *
     * @param targetDoc The Document to which this effect should be applied
     * @param change The change data being applied
     * @param current The current value being modified
     * @param delta The parsed value of the change object
     * @param changes An object which accumulates changes to be applied
     */
    protected static _applyChangeAdd(
        targetDoc: Actor | Item | TokenDocument,
        change: EffectChangeData,
        current: unknown,
        delta: unknown,
        changes: object,
    ): void;

    /**
     * Apply an ActiveEffect that uses a "subtract" change type.
     * The way that effects are added depends on the data type of the current value.
     *
     * If the current value is null, the change value is assigned directly.
     * If the current type is a string, the change value is replaced in the current value with the empty string.
     * If the current type is a number, the change value is cast to numeric and subtracted.
     * If the current type is an array, the change value is spliced out of the array if present.
     *
     * @param targetDoc The Document to which this effect should be applied
     * @param change The change data being applied
     * @param current The current value being modified
     * @param delta The parsed value of the change object
     * @param changes An object which accumulates changes to be applied
     */
    static _applyChangeSubtract(
        targetDoc: Actor | Item | TokenDocument,
        change: EffectChangeData,
        current: unknown,
        delta: unknown,
        changes: object,
    ): void;

    /**
     * Apply an ActiveEffect that uses a MULTIPLY application mode.
     * Changes which MULTIPLY must be numeric to allow for multiplication.
     * @param targetDoc The Document to which this effect should be applied
     * @param change The change data being applied
     * @param current The current value being modified
     * @param delta The parsed value of the change object
     * @param changes An object which accumulates changes to be applied
     */
    protected static _applyChangeMultiply(
        targetDoc: Actor | Item | TokenDocument,
        change: EffectChangeData,
        current: unknown,
        delta: unknown,
        changes: object,
    ): void;

    /**
     * Apply an ActiveEffect that uses an OVERRIDE application mode.
     * Numeric data is overridden by numbers, while other data types are overridden by any value
     * @param targetDoc The Document to which this effect should be applied
     * @param change The change data being applied
     * @param current The current value being modified
     * @param delta The parsed value of the change object
     * @param changes An object which accumulates changes to be applied
     */
    protected static _applyChangeOverride(
        targetDoc: Actor | Item | TokenDocument,
        change: EffectChangeData,
        current: unknown,
        delta: unknown,
        changes: object,
    ): void;

    /**
     * Apply an ActiveEffect that uses an UPGRADE, or DOWNGRADE application mode.
     * Changes which UPGRADE or DOWNGRADE must be numeric to allow for comparison.
     * @param targetDoc The Document to which this effect should be applied
     * @param change The change data being applied
     * @param current The current value being modified
     * @param delta The parsed value of the change object
     * @param changes An object which accumulates changes to be applied
     */
    protected static _applyChangeUpgrade(
        targetDoc: Actor | Item | TokenDocument,
        change: EffectChangeData,
        current: unknown,
        delta: unknown,
        changes: object,
    ): void;

    /**
     * Apply an ActiveEffect that uses a CUSTOM change type.
     * @param targetDoc The Document to which this effect should be applied
     * @param change The change data being applied
     * @param current The current value being modified
     * @param delta The parsed value of the change object
     * @param changes An object which accumulates changes to be applied
     */
    protected static _applyChangeCustom(
        targetDoc: Actor | Item | TokenDocument,
        change: EffectChangeData,
        current: unknown,
        delta: unknown,
        changes: object,
    ): void;

    /**
     * A determination of whether the ActiveEffect's expiry event was reached. This check is independent of whether the
     * duration was also reached.
     * @param event The event that triggered this check
     * @param context Contextual information for use in the determination
     */
    isExpiryEvent(event: string, context?: object): boolean;

    /**
     * Retrieve the initial duration configuration.
     */
    static getEffectStart(combat?: Combat | null): EffectStartData;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void;

    protected override _preUpdate(
        changed: Record<string, unknown>,
        options: DatabaseUpdateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

    protected override _onUpdate(
        changed: Record<string, unknown>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void;

    /**
     * Display changes to active effects as scrolling Token status text.
     * @param enabled Is the active effect currently enabled?
     */
    protected _displayScrollingStatus(enabled: boolean): void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default interface ActiveEffect<TParent extends Actor | Item | null = Actor | Item | null> {
    readonly _source: ActiveEffectSource;
    duration: PreparedEffectDurationData;
}

export interface PreparedEffectDurationData extends EffectDurationData {
    type: string;
    remaining?: string;
    label?: string;
}

export {};
