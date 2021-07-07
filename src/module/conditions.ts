import { ModifierPF2e } from './modifiers';
import { StatusEffects } from '@scripts/actor/status-effects';
import type { ConditionData, ConditionSource } from '@item/condition/data';
import { ConditionPF2e } from '@item/condition';
import { ActorPF2e } from '@actor/base';
import { TokenPF2e } from './canvas/token';

/** A helper class to manage PF2e Conditions. */
export class ConditionManager {
    static _compediumConditions: Map<string, ConditionData> = new Map();
    static _customConditions: Map<string, ConditionData> = new Map();

    static _compendiumConditionStatusNames: Map<string, ConditionData> = new Map();
    static _customStatusNames: Map<string, ConditionData> = new Map();

    static __conditionsCache: Map<string, ConditionData> = new Map();

    /**
     * Gets a collection of conditions.
     * @return A list of status names.
     */
    public static get conditions(): Map<string, ConditionData> {
        if (ConditionManager.__conditionsCache.size === 0) {
            this.__conditionsCache = new Map<string, ConditionData>();

            this._compediumConditions.forEach((condition, name) =>
                this.__conditionsCache.set(name, deepClone(condition)),
            );
            this._customConditions.forEach((condition, name) => this.__conditionsCache.set(name, deepClone(condition)));

            Object.freeze(this.__conditionsCache);
        }

        return this.__conditionsCache;
    }

    /** Gets a list of condition names. */
    public static get conditionsNames(): IterableIterator<string> {
        return Array.from(this._compediumConditions.keys()).concat(Array.from(this._customConditions.keys())).values();
    }

    /** Gets a list of status names. */
    public static get statusNames(): IterableIterator<string> {
        return Array.from(this._compendiumConditionStatusNames.keys())
            .concat(Array.from(this._customStatusNames.keys()))
            .values();
    }

    static async init() {
        const content =
            (await game.packs.get<CompendiumCollection<ConditionPF2e>>('pf2e.conditionitems')?.getDocuments()) ?? [];

        for (const condition of content) {
            this._compediumConditions.set(condition.name.toLowerCase(), condition.data);
            this._compendiumConditionStatusNames.set(condition.data.data.hud.statusName, condition.data);
        }

        Object.freeze(ConditionManager._compediumConditions);
        Object.freeze(ConditionManager._compendiumConditionStatusNames);
    }

    /**
     * Get a condition using the condition name.
     * @param conditionKey A list of conditions
     */
    public static getCondition(conditionKey: string): ConditionData {
        conditionKey = conditionKey.toLocaleLowerCase();

        const condition =
            deepClone(ConditionManager._customConditions.get(conditionKey)) ??
            deepClone(ConditionManager._compediumConditions.get(conditionKey));

        if (!condition) {
            throw Error('PF2e System | Unexpected failure looking up condition');
        }

        return condition;
    }

    /**
     * Get a condition using the status name.
     * @param statusName A list of conditions
     */
    public static getConditionByStatusName(statusName: string): ConditionData | undefined {
        if (ConditionManager._customStatusNames.has(statusName)) {
            return deepClone(ConditionManager._customStatusNames.get(statusName));
        } else {
            const conditionData = this._compendiumConditionStatusNames.get(statusName);
            return conditionData === undefined ? undefined : deepClone(conditionData);
        }
    }

    /**
     * Creates a new custom condition object.
     * @param name The name of the condition.
     * @param data The condition data to use.
     * @return True if the object was created.
     */
    public static createCustomCondition(name: string, data: ConditionData): boolean {
        name = name.toLocaleLowerCase();

        if (ConditionManager._customConditions.has(name)) {
            return false;
        }

        if (!data.flags.pf2e) {
            // Only create it not there.
            data.flags.pf2e = {};
        }

        data.flags.pf2e.condition = true;

        this._customConditions.set(name, data);
        this._customStatusNames.set(data.data.hud.statusName, data);

        return true;
    }

    /**
     * Deletes a custom condition object.
     * @param name The name of the condition.
     * @return True if the object was deleted.
     */
    public static deleteCustomCondition(name: string): boolean {
        name = name.toLocaleLowerCase();

        if (ConditionManager._customConditions.has(name)) {
            this._customConditions.delete(name);
            return true;
        }

        return false;
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

        conditions.forEach((condition) => {
            if (!baseList.has(condition.data.base)) {
                // Have not seen this base condition before.
                const base: string = condition.data.base;
                baseList.add(base);

                // List of conditions with the same base.
                const list = conditions.filter((c) => c.data.base === base);

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
        });

        // Iterate the overriding bases.
        overriding.forEach((base) => {
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
        });

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
    static getModifiersFromConditions(conditions: IterableIterator<ConditionData>): Map<string, Array<ModifierPF2e>> {
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
        const conditionSource = typeof name === 'string' ? this.getCondition(name).toObject() : name;

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
            const conditionSource = this.getCondition(linkedCondition.condition).toObject();
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
            const conditionSource = this.getCondition(unlinkedCondition.condition).toObject();
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

    static getFlattenedConditions(items: ConditionData[]): any[] {
        const conditions = new Map<string, any>();

        items
            .sort((a: ConditionData, b: ConditionData) => this.sortCondition(a, b))
            .forEach((c: ConditionData) => {
                // Sorted list of conditions.
                // First by active, then by base (lexicographically), then by value (descending).

                let name = `${c.data.base}`;
                let condition: any;

                if (c.data.value.isValued) {
                    name = `${name} ${c.data.value.value}`;
                }

                if (conditions.has(name)) {
                    // Have already seen condition
                    condition = conditions.get(name);
                } else {
                    // Have not seen condition
                    condition = {
                        id: c._id,
                        active: c.data.active,
                        name: name, // eslint-disable-line object-shorthand
                        value: c.data.value.isValued ? c.data.value.value : undefined,
                        description: c.data.description.value,
                        img: c.img,
                        references: false,
                        parents: [],
                        children: [],
                        overrides: [],
                        overriddenBy: [],
                        immunityFrom: [],
                    };

                    conditions.set(name, condition);
                }

                // Update any references
                if (c.data.references.parent) {
                    const refCondition = items.find((i) => i._id === c.data.references.parent?.id);

                    if (refCondition) {
                        const ref = {
                            id: c.data.references.parent,
                            name: refCondition.name,
                            base: refCondition.data.base,
                            text: '',
                        };

                        if (refCondition.data.value.isValued) {
                            ref.name = `${ref.name} ${refCondition.data.value.value}`;
                        }

                        ref.text = `@Compendium[pf2e.conditionitems.${refCondition.data.base}]{${ref.name}}`;

                        condition.references = true;
                        condition.parents.push(ref);
                    }
                }

                c.data.references.children.forEach((item) => {
                    const refCondition = items.find((i) => i._id === item.id);

                    if (refCondition) {
                        const ref = {
                            id: c.data.references.parent,
                            name: refCondition.name,
                            base: refCondition.data.base,
                            text: '',
                        };

                        if (refCondition.data.value.isValued) {
                            ref.name = `${ref.name} ${refCondition.data.value.value}`;
                        }

                        ref.text = `@Compendium[pf2e.conditionitems.${refCondition.data.base}]{${ref.name}}`;

                        condition.references = true;
                        condition.children.push(ref);
                    }
                });

                c.data.references.overrides.forEach((item) => {
                    const refCondition = items.find((i) => i._id === item.id);

                    if (refCondition) {
                        const ref = {
                            id: c.data.references.parent,
                            name: refCondition.name,
                            base: refCondition.data.base,
                            text: '',
                        };

                        if (refCondition.data.value.isValued) {
                            ref.name = `${ref.name} ${refCondition.data.value.value}`;
                        }

                        ref.text = `@Compendium[pf2e.conditionitems.${refCondition.data.base}]{${ref.name}}`;

                        condition.references = true;
                        condition.overrides.push(ref);
                    }
                });

                c.data.references.overriddenBy.forEach((item) => {
                    const refCondition = items.find((i) => i._id === item.id);

                    if (refCondition) {
                        const ref = {
                            id: c.data.references.parent,
                            name: refCondition.name,
                            base: refCondition.data.base,
                            text: '',
                        };

                        if (refCondition.data.value.isValued) {
                            ref.name = `${ref.name} ${refCondition.data.value.value}`;
                        }

                        ref.text = `@Compendium[pf2e.conditionitems.${refCondition.data.base}]{${ref.name}}`;

                        condition.references = true;
                        condition.overriddenBy.push(ref);
                    }
                });

                c.data.references.immunityFrom.forEach((item) => {
                    const refCondition = items.find((i) => i._id === item.id);

                    if (refCondition) {
                        const ref = {
                            id: c.data.references.parent,
                            name: refCondition.name,
                            base: refCondition.data.base,
                            text: '',
                        };

                        if (refCondition.data.value.isValued) {
                            ref.name = `${ref.name} ${refCondition.data.value.value}`;
                        }

                        ref.text = `@Compendium[pf2e.conditionitems.${refCondition.data.base}]{${ref.name}}`;

                        condition.references = true;
                        condition.immunityFrom.push(ref);
                    }
                });
            });

        return Array.from(conditions.values());
    }

    private static sortCondition(a: ConditionData, b: ConditionData): number {
        if (a.data.active === b.data.active) {
            // Both are active or both inactive.

            if (a.data.base === b.data.base) {
                // Both are same base

                if (a.data.value.isValued && b.data.value.isValued) {
                    // Valued condition
                    // Sort values by descending order.
                    return b.data.value.value - a.data.value.value;
                } else {
                    // Not valued condition
                    return 0;
                }
            } else {
                // Different bases
                return a.data.base.localeCompare(b.data.base);
            }
        } else if (a.data.active && !b.data.active) {
            // A is active, B is not
            // A should be before B.
            return -1;
        } else if (!a.data.active && b.data.active) {
            // B is active, A is not
            // Be should be before A.
            return 1;
        }

        return 0;
    }
}
