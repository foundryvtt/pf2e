import { IterableWeakSet } from "@common/utils/_module.mjs";

/**
 * A singleton helper class that tracks the duration and expiry of {@link ActiveEffect}s
 */
export default class ActiveEffectRegistry extends IterableWeakSet<ActiveEffect> {
    /**
     * Has the registry been populated for the first time?
     */
    get initialized(): boolean;

    /**
     * Populate the registry for the first time.
     * @internal
     */
    _initialize(): void;

    /**
     * Register a single ActiveEffect document. If the document is already registered but no longer eligible for
     * registration, it will be deleted.
     */
    override add(effect: ActiveEffect): this;

    /**
     * Register the ActiveEffects embedded on an Actor or Item.
     * @param document
     */
    addFromParent(document: Actor | Item): this;

    /**
     * Unregister the ActiveEffects embedded on an Actor or Item.
     * @param document
     * @returns Did any deletions occur?
     */
    deleteFromParent(document: Actor | Item): boolean;

    /**
     * Refresh the durations of registered ActiveEffects and perform the configured action for expired effects.
     * @param event The expiry or other event that triggered this call
     * @param context Additional contextual data relevant to the event
     * @param context.combat The Combat associated with this event
     * @param context.actors Limit the refresh to effects belonging to the provided list of actors.
     * @see {@link CONFIG.ActiveEffect.expiryAction}
     */
    refresh(event: string, context?: { combat?: Combat; actors?: Set<Actor> }): Promise<void>;
}
