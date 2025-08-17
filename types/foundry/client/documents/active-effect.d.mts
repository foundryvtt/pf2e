import { DocumentConstructionContext } from "@common/_types.mjs";
import {
    DatabaseCreateCallbackOptions,
    DatabaseDeleteCallbackOptions,
    DatabaseUpdateCallbackOptions,
} from "@common/abstract/_types.mjs";
import Document from "@common/abstract/document.mjs";
import { DataField } from "@common/data/fields.mjs";
import BaseActiveEffect, {
    ActiveEffectSource,
    EffectChangeData,
    EffectDurationData,
} from "@common/documents/active-effect.mjs";
import { Actor, BaseActor, BaseItem, BaseUser, Item } from "./_module.mjs";
import { ClientDocument } from "./abstract/client-document.mjs";

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
     * Is there some system logic that makes this active effect ineligible for application?
     */
    get isSuppressed(): boolean;

    /**
     * Retrieve the Document that this ActiveEffect targets for modification.
     */
    get target(): foundry.abstract.Document | null;

    /**
     * Whether the Active Effect currently applying its changes to the target.
     */
    get active(): boolean;

    /**
     * Does this Active Effect currently modify an Actor?
     */
    get modifiesActor(): boolean;

    override prepareBaseData(): void;

    override prepareDerivedData(): void;

    /**
     * Update derived Active Effect duration data.
     * Configure the remaining and label properties to be getters which lazily recompute only when necessary.
     */
    updateDuration(): EffectDurationData;

    /**
     * Determine whether the ActiveEffect requires a duration update.
     * True if the worldTime has changed for an effect whose duration is tracked in seconds.
     * True if the combat turn has changed for an effect tracked in turns where the effect target is a combatant.
     */
    protected _requiresDurationUpdate(): boolean;

    /**
     * Compute derived data related to active effect duration.
     */
    _prepareDuration(): {
        type: string;
        duration: number | null;
        remaining: number | null;
        label: string;
        _worldTime?: number;
        _combatTime?: number;
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

    /**
     * Describe whether the ActiveEffect has a temporary duration based on combat turns or rounds.
     */
    get isTemporary(): boolean;

    /**
     * A cached property for obtaining the source name
     */
    get sourceName(): string;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Apply EffectChangeData to a field within a DataModel.
     * @param model  The model instance.
     * @param change The change to apply.
     * @param field  The field. If not supplied, it will be retrieved from the supplied model.
     * @returns The updated value.
     */
    static applyField(model: Document, change: EffectChangeData, field?: DataField): unknown;

    /**
     * Apply this ActiveEffect to a provided Actor.
     * TODO: This method is poorly conceived. Its functionality is static, applying a provided change to an Actor
     * TODO: When we revisit this in Active Effects V2 this should become an Actor method, or a static method
     * @param actor  The Actor to whom this effect should be applied
     * @param change The change data being applied
     * @returns An object of property paths and their updated values.
     */
    apply(actor: Actor, change: EffectChangeData): Record<string, unknown>;

    /**
     * Apply this ActiveEffect to a provided Actor using a heuristic to infer the value types based on the current value
     * and/or the default value in the template.json.
     * @param actor    The Actor to whom this effect should be applied.
     * @param change   The change data being applied.
     * @param changes  The aggregate update paths and their updated values.
     */
    protected _applyLegacy(actor: Actor, change: EffectChangeData, changes: Record<string, unknown>): void;

    /**
     * Retrieve the initial duration configuration.
     */
    static getInitialDuration(): { startTime: number; startRound?: number; startTurn?: number };

    /* -------------------------------------------- */
    /*  Flag Operations                             */
    /* -------------------------------------------- */

    override getFlag(scope: string, key: string): unknown;

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
