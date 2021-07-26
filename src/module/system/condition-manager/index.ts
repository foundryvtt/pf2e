import { ModifierPF2e } from '../../modifiers';
import { StatusEffects } from '@scripts/actor/status-effects';
import type { ConditionData, ConditionSource } from '@item/condition/data';
import { ConditionPF2e } from '@item/condition';
import { ActorPF2e } from '@actor/base';
import { TokenPF2e } from '../../canvas/token';
import { ConditionSources } from './sources';
import { ErrorPF2e } from '@module/utils';

/** A helper class to manage PF2e Conditions. */
export class ConditionManager {
    static conditionsByName: Map<string, ConditionSource> = new Map();

    static condtionsByStatusName: Map<string, ConditionSource> = new Map();

    /**
     * Gets a collection of conditions.
     * @return A list of status names.
     */
    public static get conditions(): Map<string, ConditionSource> {
        return this.conditionsByName;
    }

    /** Gets a list of condition names. */
    static get conditionsNames(): string[] {
        return Array.from(this.conditionsByName.keys());
    }

    /** Gets a list of status names. */
    static get statusNames(): string[] {
        return Array.from(this.condtionsByStatusName.keys());
    }

    static init(): typeof ConditionManager {
        for (const source of ConditionSources.get()) {
            this.conditionsByName.set(source.data.slug, source);
            this.condtionsByStatusName.set(source.data.hud.statusName, source);
        }
        Object.freeze(ConditionManager.conditionsByName);
        Object.freeze(ConditionManager.condtionsByStatusName);

        return this;
    }

    /** Localize the condition names as soon as en.json is available */
    static localize(): void {
        for (const source of this.conditions.values()) {
            source.name = game.i18n.localize(CONFIG.PF2E.conditionTypes[source.data.slug]);
        }
    }

    /**
     * Get a condition using the condition name.
     * @param conditionKey A list of conditions
     */
    static getCondition(conditionKey: string): ConditionSource {
        conditionKey = conditionKey.toLocaleLowerCase();
        const condition = deepClone(ConditionManager.conditionsByName.get(conditionKey));
        if (!condition) throw ErrorPF2e('Unexpected failure looking up condition');

        condition.name = game.i18n.localize(CONFIG.PF2E.conditionTypes[condition.data.slug]);
        return condition;
    }

    /**
     * Get a condition using the status name.
     * @param statusName A list of conditions
     */
    static getConditionByStatusName(statusName: string): ConditionSource {
        const condition = deepClone(this.condtionsByStatusName.get(statusName));
        if (!condition) throw ErrorPF2e('Unexpected failure looking up condition');

        return condition;
    }

    /**
     * Takes a list of valued conditions with the same base and selects the highest value.
     * @param conditions A filtered list of conditions with the same base name.
     * @param updates    A running list of updates to make to embedded items.
     */
    private static processValuedCondition(
        conditions: ConditionData[],
        updates: Map<string, ConditionSource>,
    ): ConditionData {
        let appliedCondition: ConditionData;

        conditions.forEach((condition) => {
            if (
                appliedCondition === undefined ||
                Number(condition.data.value.value) > Number(appliedCondition.data.value.value)
            ) {
                // First condition, or new max achieved.

                if (!condition.data.active) {
                    // New MAX is inactive, neet to make it active.
                    const update = updates.get(condition._id) ?? condition.toObject();
                    update.data.active = true;
                    updates.set(update._id, update);
                }

                if (appliedCondition) {
                    // Only fix appliedCondition on n+1 iterations.

                    if (appliedCondition.data.active) {
                        // Condition came in active, need to deactivate it.

                        const update = updates.get(appliedCondition._id) ?? condition.toObject();
                        update.data.active = false;
                        updates.set(update._id, update);
                    } else {
                        // Came in inactive, but became applied for a time,
                        // which means we created an update for it we must delete.

                        updates.delete(appliedCondition._id);
                    }
                }

                appliedCondition = condition;
            } else if (condition.data.active) {
                // Not new max, but was active.
                const update = updates.get(condition._id) ?? condition.toObject();
                update.data.active = false;
                updates.set(update._id, update);
            }

            this.clearOverrides(condition, updates);
        });

        return appliedCondition!;
    }

    /**
     * Takes a list of toggle conditions with the same base and selects the first.
     *
     * @param conditions A filtered list of conditions with the same base name.
     * @param updates    A running list of updates to make to embedded items.
     */
    private static processToggleCondition(
        conditions: ConditionData[],
        updates: Map<string, ConditionSource>,
    ): ConditionData {
        let appliedCondition: ConditionData;

        conditions.forEach((condition) => {
            // Set the appliedCondition the first condition we see.
            if (appliedCondition === undefined) {
                appliedCondition = condition;
            }

            if (condition._id === appliedCondition._id && !condition.data.active) {
                // Is the applied condition and not active
                const update = updates.get(condition._id) ?? condition.toObject();
                update.data.active = true;
                updates.set(update._id, update);
            } else if (condition._id !== appliedCondition._id && condition.data.active) {
                // Is not the applied condition and is active
                const update = updates.get(condition._id) ?? condition.toObject();
                update.data.active = false;
                updates.set(update._id, update);
            }

            this.clearOverrides(condition, updates);
        });

        return appliedCondition!;
    }

    /**
     * Clears any overrides from a condition.
     *
     * @param condition The condition to check, and remove, any overrides.
     * @param updates   A running list of updates to make to embedded items.
     */
    private static clearOverrides(condition: ConditionData, updates: Map<string, ConditionSource>): void {
        if (condition.data.references.overrides.length) {
            // Clear any overrides
            const update = updates.get(condition._id) ?? condition.toObject();
            update.data.references.overrides.splice(0, update.data.references.overriddenBy.length);

            updates.set(update._id, update);
        }

        if (condition.data.references.overriddenBy.length) {
            // Was previous overridden.  Remove it for now.
            const update = updates.get(condition._id) ?? condition.toObject();
            update.data.references.overriddenBy.splice(0, update.data.references.overriddenBy.length);

            updates.set(update._id, update);
        }
    }

    private static processOverride(
        overridden: ConditionSource,
        overrider: ConditionSource,
        updates: Map<string, ConditionSource>,
    ) {
        if (overridden.data.active) {
            // Condition was active.  Deactivate it.

            const update = updates.get(overridden._id) ?? duplicate(overridden);
            update.data.active = false;

            updates.set(update._id, update);
        }

        if (!overridden.data.references.overriddenBy.some((i) => i.id === overrider._id)) {
            // Condition doesn't have overrider as part of overridenBy list.

            const update = updates.get(overridden._id) ?? duplicate(overridden);
            update.data.references.overriddenBy.push({ id: overrider._id, type: 'condition' });
            updates.set(update._id, update);
        }

        if (!overrider.data.references.overrides.some((i) => i.id === overridden._id)) {
            // Overrider does not have overriden condition in overrides list.

            const update = updates.get(overrider._id) ?? duplicate(overrider);
            update.data.references.overrides.push({ id: overridden._id, type: 'condition' });
            updates.set(update._id, update);
        }
    }

    private static processConditions(actor: ActorPF2e): Promise<void>;
    private static processConditions(token: TokenPF2e): Promise<void>;
    private static processConditions(actorOrToken: ActorPF2e | TokenPF2e): Promise<void>;
    private static async processConditions(actorOrToken: ActorPF2e | TokenPF2e): Promise<void> {
        const actor = actorOrToken instanceof ActorPF2e ? actorOrToken : actorOrToken.actor;
        const conditions =
            actor?.itemTypes.condition.filter((condition) => condition.fromSystem).map((condition) => condition.data) ??
            [];

        // Any updates to items go here.
        const updates = new Map<string, ConditionSource>();

        // Map of applied conditions.
        const appliedConditions = new Map<string, ConditionData>();

        // Set of base conditions
        const baseList = new Set<string>();

        // A list of overrides seen.
        const overriding: string[] = [];

        for (const condition of conditions) {
            if (!baseList.has(condition.data.base)) {
                // Have not seen this base condition before.
                const base: string = condition.data.base;
                baseList.add(base);

                // List of conditions with the same base.
                const list = conditions.filter((maybeSame) => maybeSame.data.base === base);

                let appliedCondition: ConditionData;

                if (ConditionManager.getCondition(base).data.value.isValued) {
                    // Condition is normally valued.
                    appliedCondition = this.processValuedCondition(list, updates);
                } else {
                    // Condition is not valued.
                    appliedCondition = this.processToggleCondition(list, updates);
                }

                appliedConditions.set(base, appliedCondition);

                if (appliedCondition.data.overrides.length) {
                    overriding.push(base);
                }
            }
        }

        // Iterate the overriding bases.
        for (const base of overriding) {
            // Make sure to get the most recent version of a condition.
            const overrider =
                updates.get(appliedConditions.get(base)?._id ?? '') ?? appliedConditions.get(base)?.toObject();

            // Iterate the condition's overrides.
            overrider?.data.overrides.forEach((overriddenBase) => {
                if (appliedConditions.has(overriddenBase)) {
                    // appliedConditions has a condition that needs to be overridden.

                    // Remove the condition from applied.
                    appliedConditions.delete(overriddenBase);

                    // Ensure all copies of overridden base are updated.
                    conditions
                        .filter((conditionData) => conditionData.data.base === overriddenBase)
                        .forEach((conditionData) => {
                            // List of conditions that have been overridden.

                            const overridden = updates.get(conditionData._id) ?? conditionData.toObject();
                            this.processOverride(overridden, overrider, updates);
                        });
                }
            });
        }

        // Make sure to update any items that need updating.
        if (updates.size) {
            await actor?.updateEmbeddedDocuments('Item', Array.from(updates.values()));
        }

        // Update token effects from applied conditions.
        const hudElement = canvas.tokens.hud?.element;
        const tokens = actor?.getActiveTokens().filter((token) => token.hasActiveHUD) ?? [];
        if (actor && hudElement && tokens.length > 0) await StatusEffects.updateHUD(hudElement, actor);
    }

    /**
     * Gets a map of modifiers from a collection of conditions.
     *
     * @param conditions A collection of conditions to retrieve modifiers from.
     * @return A map of PF2Modifiers from the conditions collection.
     */
    static getModifiersFromConditions(conditions: ConditionData[]): Map<string, ModifierPF2e[]> {
        const conditionModifiers = new Map<string, Array<ModifierPF2e>>();

        for (const condition of conditions) {
            for (const modifier of condition.data.modifiers) {
                if (!conditionModifiers.has(modifier.group)) {
                    conditionModifiers.set(modifier.group, <Array<ModifierPF2e>>[]);
                }

                if (condition.data.value.isValued) {
                    conditionModifiers
                        .get(modifier.group)
                        ?.push(new ModifierPF2e(condition.name, -condition.data.value.value, modifier.type));
                } else {
                    conditionModifiers
                        .get(modifier.group)
                        ?.push(new ModifierPF2e(condition.name, modifier.value ?? 0, modifier.type));
                }
            }
        }

        return conditionModifiers;
    }

    /**
     * Adds a condition to a token.
     * @param name  A collection of conditions to retrieve modifiers from.
     * @param token The token to add the condition to.
     */
    static addConditionToToken(name: string | ConditionSource, token: TokenPF2e): Promise<ConditionPF2e | null>;
    static addConditionToToken(name: string | ConditionSource, actor: ActorPF2e): Promise<ConditionPF2e | null>;
    static addConditionToToken(
        name: string | ConditionSource,
        actorOrToken: ActorPF2e | TokenPF2e,
    ): Promise<ConditionPF2e | null>;
    static async addConditionToToken(
        name: string | ConditionSource,
        actorOrToken: ActorPF2e | TokenPF2e,
    ): Promise<ConditionPF2e | null> {
        const actor = actorOrToken instanceof ActorPF2e ? actorOrToken : actorOrToken.actor;
        const conditionSource = typeof name === 'string' ? this.getCondition(name) : name;

        if (actor) {
            const condition = await this.createConditions(conditionSource, actor);
            if (condition) this.processConditions(actor);
            return condition;
        }
        return null;
    }

    /**
     * A convience alias for adding a condition to an actor
     * @param name  A collection of conditions to retrieve modifiers from.
     * @param actor The actor to add the condition to.
     */
    static async addConditionToActor(name: string | ConditionSource, actor: ActorPF2e): Promise<ConditionPF2e | null> {
        return this.addConditionToToken(name, actor);
    }

    private static async createConditions(condition: ConditionSource, actor: ActorPF2e): Promise<ConditionPF2e | null> {
        const exists = actor.itemTypes.condition.some(
            (existing) => existing.data.data.base === condition.data.base && !condition.data.references.parent?.id,
        );
        if (exists) return null;

        condition._id = randomID(16);
        const conditionsToCreate = this.createAdditionallyAppliedConditions(condition);
        conditionsToCreate.push(condition);

        actor.createEmbeddedDocuments('Item', conditionsToCreate, { keepId: true }).then((result) => {
            return result.find((item) => item.id === condition._id) as ConditionPF2e;
        });

        return null;
    }

    private static createAdditionallyAppliedConditions(baseCondition: ConditionSource): ConditionSource[] {
        const conditionsToCreate: ConditionSource[] = [];

        baseCondition.data.alsoApplies.linked.forEach((linkedCondition) => {
            const conditionSource = this.getCondition(linkedCondition.condition);
            if (linkedCondition.value) {
                conditionSource.data.value.value = linkedCondition.value;
            }
            conditionSource._id = randomID(16);
            conditionSource.data.references.parent = { id: baseCondition._id, type: 'condition' };
            baseCondition.data.references.children.push({ id: conditionSource._id, type: 'condition' });
            conditionSource.data.sources.hud = baseCondition.data.sources.hud;

            // Add linked condition to the list of items to create
            conditionsToCreate.push(conditionSource);
            // Add conditions that are applied by the previously added linked condition
            conditionsToCreate.push(...this.createAdditionallyAppliedConditions(conditionSource));
        });

        baseCondition.data.alsoApplies.unlinked.forEach((unlinkedCondition) => {
            const conditionSource = this.getCondition(unlinkedCondition.condition);
            if (unlinkedCondition.value) {
                conditionSource.name = `${conditionSource.name} ${conditionSource.data.value.value}`;
                conditionSource.data.value.value = unlinkedCondition.value;
            }
            conditionSource._id = randomID(16);
            conditionSource.data.sources.hud = baseCondition.data.sources.hud;

            // Add unlinked condition to the list of items to create
            conditionsToCreate.push(conditionSource);
            // Add conditions that are applied by the previously added condition
            conditionsToCreate.push(...this.createAdditionallyAppliedConditions(conditionSource));
        });

        return conditionsToCreate;
    }

    /**
     * Removes a condition from a token.
     * @param name  A collection of conditions to retrieve modifiers from.
     * @param token The token to add the condition to.
     */
    static removeConditionFromToken(itemId: string | string[], token: TokenPF2e): Promise<void>;
    static removeConditionFromToken(itemId: string | string[], actor: ActorPF2e): Promise<void>;
    static removeConditionFromToken(itemId: string | string[], actorOrToken: ActorPF2e | TokenPF2e): Promise<void>;
    static async removeConditionFromToken(
        itemId: string | string[],
        actorOrToken: ActorPF2e | TokenPF2e,
    ): Promise<void> {
        itemId = itemId instanceof Array ? itemId : [itemId];
        const actor = actorOrToken instanceof ActorPF2e ? actorOrToken : actorOrToken.actor;
        if (actor) {
            const deleted = await this.deleteConditions(itemId, actor);
            if (deleted.length > 0) this.processConditions(actor);
        }
    }

    /** A convenience alias for removing a condition from an actor */
    static async removeConditionFromActor(itemId: string | string[], actor: ActorPF2e): Promise<void> {
        return this.removeConditionFromToken(itemId, actor);
    }

    private static async deleteConditions(itemIds: string[], actor: ActorPF2e): Promise<ConditionPF2e[]> {
        const list: string[] = [];
        const stack = [...itemIds];
        while (stack.length) {
            const id = stack.pop() ?? '';
            const condition = actor.itemTypes.condition.find((condition) => condition.id === id);

            if (condition) {
                list.push(id);

                condition.data.data.references.children.forEach((child) => stack.push(child.id));
            }
        }

        return ConditionPF2e.deleteDocuments(list, { parent: actor });
    }

    static updateConditionValue(itemId: string, actor: ActorPF2e, value: number): Promise<void>;
    static updateConditionValue(itemId: string, token: TokenPF2e, value: number): Promise<void>;
    static updateConditionValue(itemId: string, actorOrToken: ActorPF2e | TokenPF2e, value: number): Promise<void>;
    static async updateConditionValue(itemId: string, actorOrToken: ActorPF2e | TokenPF2e, value: number) {
        const actor = actorOrToken instanceof ActorPF2e ? actorOrToken : actorOrToken.actor;
        const condition = actor?.items.get(itemId);

        if (condition instanceof ConditionPF2e && actor) {
            if (value === 0) {
                // Value is zero, remove the status.
                await this.deleteConditions([itemId], actor);
            } else {
                // Apply new value.
                await condition.update({ 'data.value.value': value });
                console.debug(`PF2e System | Setting condition '${condition.name}' to ${value}.`);
            }

            await this.processConditions(actor);
        }
    }

    static getFlattenedConditions(items: ConditionPF2e[]): any[] {
        const conditions = new Map<string, any>();

        items.sort(this.sortCondition).forEach((condition) => {
            // Sorted list of conditions.
            // First by active, then by base (lexicographically), then by value (descending).

            const name = condition.value ? `${condition.name} ${condition.value}` : condition.name;
            let flattened: any;

            if (conditions.has(name)) {
                // Have already seen condition
                flattened = conditions.get(name);
            } else {
                // Have not seen condition
                flattened = {
                    id: condition.id,
                    active: condition.isActive,
                    name,
                    value: condition.value,
                    description: condition.description,
                    img: condition.img,
                    references: false,
                    parents: [],
                    children: [],
                    overrides: [],
                    overriddenBy: [],
                    immunityFrom: [],
                };

                conditions.set(name, flattened);
            }

            // Update any references
            const conditionData = condition.data;
            if (conditionData.data.references.parent) {
                const refCondition = items.find((other) => other.id === conditionData.data.references.parent?.id);

                if (refCondition) {
                    const ref = {
                        id: conditionData.data.references.parent,
                        name: refCondition.name,
                        base: refCondition.slug,
                        text: '',
                    };

                    if (refCondition.value) {
                        ref.name = `${ref.name} ${refCondition.value}`;
                    }

                    ref.text = `@Compendium[pf2e.conditionitems.${refCondition.name}]{${ref.name}}`;

                    flattened.references = true;
                    flattened.parents.push(ref);
                }
            }

            conditionData.data.references.children.forEach((item) => {
                const refCondition = items.find((other) => other.id === item.id);

                if (refCondition) {
                    const ref = {
                        id: conditionData.data.references.parent,
                        name: refCondition.name,
                        base: refCondition.slug,
                        text: '',
                    };

                    if (refCondition.value) {
                        ref.name = `${ref.name} ${refCondition.value}`;
                    }

                    ref.text = `@Compendium[pf2e.conditionitems.${refCondition.name}]{${ref.name}}`;

                    flattened.references = true;
                    flattened.children.push(ref);
                }
            });

            conditionData.data.references.overrides.forEach((item) => {
                const refCondition = items.find((other) => other.id === item.id);

                if (refCondition) {
                    const ref = {
                        id: conditionData.data.references.parent,
                        name: refCondition.name,
                        base: refCondition.slug,
                        text: '',
                    };

                    if (refCondition.value) {
                        ref.name = `${ref.name} ${refCondition.value}`;
                    }

                    ref.text = `@Compendium[pf2e.conditionitems.${refCondition.name}]{${ref.name}}`;

                    flattened.references = true;
                    flattened.overrides.push(ref);
                }
            });

            conditionData.data.references.overriddenBy.forEach((item) => {
                const refCondition = items.find((other) => other.id === item.id);

                if (refCondition) {
                    const ref = {
                        id: conditionData.data.references.parent,
                        name: refCondition.name,
                        base: refCondition.slug,
                        text: '',
                    };

                    if (refCondition.value) {
                        ref.name = `${ref.name} ${refCondition.value}`;
                    }

                    ref.text = `@Compendium[pf2e.conditionitems.${refCondition.name}]{${ref.name}}`;

                    flattened.references = true;
                    flattened.overriddenBy.push(ref);
                }
            });

            conditionData.data.references.immunityFrom.forEach((item) => {
                const refCondition = items.find((other) => other.id === item.id);

                if (refCondition) {
                    const ref = {
                        id: conditionData.data.references.parent,
                        name: refCondition.name,
                        base: refCondition.slug,
                        text: '',
                    };

                    if (refCondition.value) {
                        ref.name = `${ref.name} ${refCondition.value}`;
                    }

                    const compendiumLink = refCondition.sourceId?.replace(/^Compendium\./, '');
                    if (compendiumLink) ref.text = `@Compendium[${compendiumLink}]`;

                    flattened.references = true;
                    flattened.immunityFrom.push(ref);
                }
            });
        });

        return Array.from(conditions.values());
    }

    private static sortCondition(conditionA: ConditionPF2e, conditionB: ConditionPF2e): number {
        if (conditionA.slug === conditionB.slug) {
            // Both are active or both inactive.

            if (conditionA.slug === conditionB.slug) {
                // Both are same base

                if (conditionA.value && conditionB.value) {
                    // Valued condition
                    // Sort values by descending order.
                    return conditionB.value - conditionA.value;
                } else {
                    // Not valued condition
                    return 0;
                }
            } else {
                // Different bases
                return conditionA.slug.localeCompare(conditionB.slug);
            }
        } else if (conditionA.isActive && !conditionB.isActive) {
            // A is active, B is not
            // A should be before B.
            return -1;
        } else if (!conditionA.isActive && conditionB.isActive) {
            // B is active, A is not
            // Be should be before A.
            return 1;
        }

        return 0;
    }
}
