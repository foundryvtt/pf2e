import { ItemData, ConditionData } from './item/dataDefinitions';
import { PF2ECondition } from './item/others';
import { TokenPF2e } from './actor/actor';
import { PF2Modifier } from './modifiers';
import { PF2eStatusEffects } from '../scripts/actor/statusEffects';

/**
 * A helper class to manage PF2e Conditions.
 * @category PF2
 */
export class PF2eConditionManager {
    static _compediumConditions = new Map<string, ConditionData>();
    static _customConditions = new Map<string, ConditionData>();

    static _compendiumConditionStatusNames = new Map<string, ConditionData>();
    static _customStatusNames = new Map<string, ConditionData>();

    static __conditionsCache: Map<string, ConditionData> = undefined;
    static __statusNameCache: Map<string, ConditionData> = undefined;

    /**
     * Gets a collection of conditions.
     *
     * @return {Array<string>}   A list of status names.
     */
    public static get conditions(): Map<string, ConditionData> {
        if (!PF2eConditionManager.__conditionsCache) {
            PF2eConditionManager.__conditionsCache = new Map<string, ConditionData>();

            PF2eConditionManager._compediumConditions.forEach((condition, name) =>
                PF2eConditionManager.__conditionsCache.set(name, duplicate(condition)),
            );
            PF2eConditionManager._customConditions.forEach((condition, name) =>
                PF2eConditionManager.__conditionsCache.set(name, duplicate(condition)),
            );

            Object.freeze(PF2eConditionManager.__conditionsCache);
        }

        return PF2eConditionManager.__conditionsCache;
    }

    /**
     * Gets a list of condition names.
     *
     * @return {IterableIterator<string>}   A list of condition names.
     */
    public static get conditionsNames(): IterableIterator<string> {
        return Array.from(PF2eConditionManager._compediumConditions.keys())
            .concat(Array.from(PF2eConditionManager._customConditions.keys()))
            .values();
    }

    /**
     * Gets a list of status names.
     *
     * @return {IterableIterator<string>}   A list of status names.
     */
    public static get statusNames(): IterableIterator<string> {
        return Array.from(PF2eConditionManager._compendiumConditionStatusNames.keys())
            .concat(Array.from(PF2eConditionManager._customStatusNames.keys()))
            .values();
    }

    static async init() {
        const content = (await game.packs.get('pf2e.conditionitems').getContent()) as PF2ECondition[];

        for (const condition of content) {
            PF2eConditionManager._compediumConditions.set(condition.name.toLowerCase(), condition.data);
            PF2eConditionManager._compendiumConditionStatusNames.set(
                condition.data.data.hud.statusName,
                condition.data,
            );
        }

        Object.freeze(PF2eConditionManager._compediumConditions);
        Object.freeze(PF2eConditionManager._compendiumConditionStatusNames);
    }

    /**
     * Get a condition using the condition name.
     *
     * @param condition  A list of conditions
     */
    public static getCondition(condition: string): ConditionData {
        condition = condition.toLocaleLowerCase();

        if (PF2eConditionManager._customConditions.has(condition)) {
            return duplicate(PF2eConditionManager._customConditions.get(condition));
        } else {
            return duplicate(PF2eConditionManager._compediumConditions.get(condition));
        }
    }

    /**
     * Get a condition using the status name.
     *
     * @param {string} statusName    A list of conditions
     * @return {ConditionData}       The condition.
     */
    public static getConditionByStatusName(statusName: string): ConditionData {
        if (PF2eConditionManager._customStatusNames.has(statusName)) {
            return duplicate(PF2eConditionManager._customStatusNames.get(statusName));
        } else {
            return duplicate(PF2eConditionManager._compendiumConditionStatusNames.get(statusName));
        }
    }

    /**
     * Creates a new custom condition object.
     *
     * @param {string} name          The name of the condition.
     * @param {ConditionData} data   The condition data to use.
     * @return {boolean}             True if the object was created.
     */
    public static createCustomCondition(name: string, data: ConditionData): boolean {
        name = name.toLocaleLowerCase();

        if (PF2eConditionManager._customConditions.has(name)) {
            return false;
        }

        if (!data.flags.pf2e) {
            // Only create it not there.
            data.flags.pf2e = {};
        }

        data.flags.pf2e.condition = true;

        PF2eConditionManager._customConditions.set(name, data);
        PF2eConditionManager._customStatusNames.set(data.data.hud.statusName, data);

        return true;
    }

    /**
     * Deletes a custom condition object.
     *
     * @param {string} name   The name of the condition.
     * @return {boolean}      True if the object was deleted.
     */
    public static deleteCustomCondition(name: string): boolean {
        name = name.toLocaleLowerCase();

        if (PF2eConditionManager._customConditions.has(name)) {
            PF2eConditionManager._customConditions.delete(name);
            return true;
        }

        return false;
    }

    /**
     * Takes a list of valued conditions with the same base and selects the highest value.
     *
     * @param {ConditionData[]} conditions           A filtered list of conditions with the same base name.
     * @param {Map<string, ConditionData>} updates   A running list of updates to make to 'OwnedItem'.
     */
    static __processValuedCondition(conditions: ConditionData[], updates: Map<string, ConditionData>): ConditionData {
        let appliedCondition: ConditionData;

        conditions.forEach((condition) => {
            if (appliedCondition === undefined || condition.data.value.value > appliedCondition.data.value.value) {
                // First condition, or new max achieved.

                if (!condition.data.active) {
                    // New MAX is inactive, neet to make it active.
                    const update = updates.has(condition._id) ? updates.get(condition._id) : duplicate(condition);
                    update.data.active = true;
                    updates.set(update._id, update);
                }

                if (appliedCondition) {
                    // Only fix appliedCondition on n+1 iterations.

                    if (appliedCondition.data.active) {
                        // Condition came in active, need to deactivate it.

                        const update = updates.has(appliedCondition._id)
                            ? updates.get(appliedCondition._id)
                            : duplicate(appliedCondition);
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
                const update = updates.has(condition._id) ? updates.get(condition._id) : duplicate(condition);
                update.data.active = false;
                updates.set(update._id, update);
            }

            PF2eConditionManager.__clearOverrides(condition, updates);
        });

        return appliedCondition;
    }

    /**
     * Takes a list of toggle conditions with the same base and selects the first.
     *
     * @param {ConditionData[]} conditions           A filtered list of conditions with the same base name.
     * @param {Map<string, ConditionData>} updates   A running list of updates to make to 'OwnedItem'.
     */
    static __processToggleCondition(conditions: ConditionData[], updates: Map<string, ConditionData>): ConditionData {
        let appliedCondition: ConditionData;

        conditions.forEach((condition) => {
            // Set the appliedCondition the first condition we see.
            if (appliedCondition === undefined) {
                appliedCondition = condition;
            }

            if (condition._id === appliedCondition._id && !condition.data.active) {
                // Is the applied condition and not active
                const update = updates.has(condition._id) ? updates.get(condition._id) : duplicate(condition);
                update.data.active = true;

                updates.set(update._id, update);
            } else if (condition._id !== appliedCondition._id && condition.data.active) {
                // Is not the applied condition and is active
                const update = updates.has(condition._id) ? updates.get(condition._id) : duplicate(condition);
                update.data.active = false;

                updates.set(update._id, update);
            }

            PF2eConditionManager.__clearOverrides(condition, updates);
        });

        return appliedCondition;
    }

    /**
     * Clears any overrides from a condition.
     *
     * @param {ConditionData} condition              The condition to check, and remove, any overrides.
     * @param {Map<string, ConditionData>} updates   A running list of updates to make to 'OwnedItem'.
     */
    static __clearOverrides(condition: ConditionData, updates: Map<string, ConditionData>) {
        if (condition.data.references.overrides.length) {
            // Clear any overrides
            const update = updates.has(condition._id) ? updates.get(condition._id) : duplicate(condition);
            update.data.references.overrides.splice(0, update.data.references.overriddenBy.length);

            updates.set(update._id, update);
        }

        if (condition.data.references.overriddenBy.length) {
            // Was previous overridden.  Remove it for now.
            const update = updates.has(condition._id) ? updates.get(condition._id) : duplicate(condition);
            update.data.references.overriddenBy.splice(0, update.data.references.overriddenBy.length);

            updates.set(update._id, update);
        }
    }

    static __processOverride(overridden: ConditionData, overrider: ConditionData, updates: Map<string, ConditionData>) {
        if (overridden.data.active) {
            // Condition was active.  Deactivate it.

            const update = updates.has(overridden._id) ? updates.get(overridden._id) : duplicate(overridden);
            update.data.active = false;

            updates.set(update._id, update);
        }

        if (!overridden.data.references.overriddenBy.some((i) => i.id === overrider._id)) {
            // Condition doesn't have overrider as part of overridenBy list.

            const update = updates.has(overridden._id) ? updates.get(overridden._id) : duplicate(overridden);
            update.data.references.overriddenBy.push({ id: overrider._id, type: 'condition' });

            updates.set(update._id, update);
        }

        if (!overrider.data.references.overrides.some((i) => i.id === overridden._id)) {
            // Overrider does not have overriden condition in overrides list.

            const update = updates.has(overrider._id) ? updates.get(overrider._id) : duplicate(overrider);
            update.data.references.overrides.push({ id: overridden._id, type: 'condition' });

            updates.set(update._id, update);
        }
    }

    static async __processTokenEffects(token: TokenPF2e, appliedConditions: Map<string, ConditionData>) {
        const effectUpdates = duplicate(token.data);

        effectUpdates.effects = [];

        const statuses: Array<string> = token.data.effects.filter(
            (item) =>
                Array.from<string>(PF2eConditionManager.statusNames)
                    .map(
                        (status) =>
                            `${CONFIG.PF2E.statusEffects.effectsIconFolder + status}.${
                                CONFIG.PF2E.statusEffects.effectsIconFileType
                            }`,
                    )
                    .indexOf(item) < 0,
        );

        for (const condition of appliedConditions.values()) {
            const url = condition.data.hud.img.useStatusName
                ? `${CONFIG.PF2E.statusEffects.effectsIconFolder}${condition.data.hud.statusName}.${CONFIG.PF2E.statusEffects.effectsIconFileType}`
                : condition.data.hud.img.value;

            effectUpdates.effects.push(url);
        }

        // Dedup the effect list to make sure a status icon only displays once.
        const newSet = [...new Set(effectUpdates.effects)].concat(statuses);

        // See if any effects were added or removed
        // and only update the token if they have been.
        const added = newSet.filter((item) => token.data.effects.indexOf(item) < 0);
        const removed = token.data.effects.filter((item) => newSet.indexOf(item) < 0);

        if (added.length > 0 || removed.length > 0) {
            effectUpdates.effects = newSet;

            await token.update(effectUpdates);
        }

        if (token.hasActiveHUD) {
            PF2eStatusEffects._updateHUD(canvas.tokens.hud.element, token);
        }
    }

    static async processConditions(token: TokenPF2e) {
        const conditions = token.actor.data.items.filter(
            (c) => c.flags.pf2e?.condition && c.type === 'condition',
        ) as ConditionData[];

        // Any updates to items go here.
        const updates = new Map<string, ConditionData>();

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

                if (PF2eConditionManager.getCondition(base).data.value.isValued) {
                    // Condition is normally valued.
                    appliedCondition = PF2eConditionManager.__processValuedCondition(list, updates);
                } else {
                    // Condition is not valued.
                    appliedCondition = PF2eConditionManager.__processToggleCondition(list, updates);
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
            const overrider: ConditionData = updates.has(appliedConditions.get(base)._id)
                ? updates.get(appliedConditions.get(base)._id)
                : appliedConditions.get(base);

            // Iterate the condition's overrides.
            overrider.data.overrides.forEach((overriddenBase) => {
                if (appliedConditions.has(overriddenBase)) {
                    // appliedConditions has a condition that needs to be overridden.

                    // Remove the condition from applied.
                    appliedConditions.delete(overriddenBase);

                    // Ensure all copies of overridden base are updated.
                    conditions
                        .filter((c) => c.data.base === overriddenBase)
                        .forEach((c) => {
                            // List of conditions that have been overridden.

                            const overridden = updates.has(c._id) ? updates.get(c._id) : c;
                            PF2eConditionManager.__processOverride(overridden, overrider, updates);
                        });
                }
            });
        });

        // Make sure to update any items that need updating.
        if (updates.size) {
            await token.actor.updateEmbeddedEntity('OwnedItem', Array.from(updates.values()));
        }

        // Update token effects from applied conditions.
        await PF2eConditionManager.__processTokenEffects(token, appliedConditions);
    }

    /**
     * Gets a map of modifiers from a collection of conditions.
     *
     * @param {IterableIterator<ConditionData>} conditions    A collection of conditions to retrieve modifiers from.
     * @return {Map<string, Array<PF2Modifier>>}              A map of PF2Modifiers from the conditions collection.
     */
    static getModifiersFromConditions(conditions: IterableIterator<ConditionData>): Map<string, Array<PF2Modifier>> {
        const conditionModifiers = new Map<string, Array<PF2Modifier>>();

        for (const condition of conditions) {
            for (const modifier of condition.data.modifiers) {
                if (!conditionModifiers.has(modifier.group)) {
                    conditionModifiers.set(modifier.group, <Array<PF2Modifier>>[]);
                }

                if (condition.data.value.isValued) {
                    conditionModifiers
                        .get(modifier.group)
                        .push(new PF2Modifier(condition.name, -condition.data.value.value, modifier.type));
                } else {
                    conditionModifiers
                        .get(modifier.group)
                        .push(new PF2Modifier(condition.name, modifier.value, modifier.type));
                }
            }
        }

        return conditionModifiers;
    }

    /**
     * Adds a condition to a token.
     *
     * @param {string|ConditionData} name    A collection of conditions to retrieve modifiers from.
     * @param {Token} token    The token to add the condition to.
     */
    static async addConditionToToken(name: string | ConditionData, token: TokenPF2e) {
        const condition: ConditionData = typeof name === 'string' ? PF2eConditionManager.getCondition(name) : name;

        const returnValue = await PF2eConditionManager._addConditionEntity(condition, token);

        PF2eConditionManager.processConditions(token);

        return returnValue;
    }

    static async _addConditionEntity(condition: ConditionData, token: TokenPF2e) {
        let item = await token.actor.createEmbeddedEntity('OwnedItem', condition);

        // Ghetto race condition style fix for unlinked items NOT CREATED THE SAME FUCKING WAY!
        if (!token.data.actorLink) {
            for (const itemData of token.actor.data.items.reverse()) {
                if (itemData.name === condition.name && itemData.type === 'condition') {
                    item = itemData;
                    break;
                }
            }
        }

        let needsItemUpdate = false;
        const itemUpdate = duplicate(item);

        // Needs synchronicity.
        for (const linkedConditionName of condition.data.alsoApplies.linked) {
            const c = PF2eConditionManager.getCondition(linkedConditionName.condition);
            if (linkedConditionName.value) {
                c.data.value.value = linkedConditionName.value;
            }

            c.data.references.parent = { id: item._id, type: 'condition' };
            c.data.sources.hud = condition.data.sources.hud;

            const linkedItem = await PF2eConditionManager._addConditionEntity(c, token); // eslint-disable-line no-await-in-loop

            itemUpdate.data.references.children.push({ id: linkedItem._id, type: 'condition' });
            needsItemUpdate = true;
        }

        // Needs synchronicity.
        for (const unlinkedConditionName of condition.data.alsoApplies.unlinked) {
            const c = PF2eConditionManager.getCondition(unlinkedConditionName.condition);
            if (unlinkedConditionName.value) {
                c.name = `${c.name} ${c.data.value.value}`;
                c.data.value.value = unlinkedConditionName.value;
            }

            c.data.sources.hud = condition.data.sources.hud;

            await PF2eConditionManager._addConditionEntity(c, token); // eslint-disable-line no-await-in-loop
        }

        if (needsItemUpdate) {
            await token.actor.updateEmbeddedEntity('OwnedItem', itemUpdate);
        }

        return item;
    }

    /**
     * Adds a condition to a token.
     *
     * @param {string|string[]} name    A collection of conditions to retrieve modifiers from.
     * @param {Token} token    The token to add the condition to.
     */
    static async removeConditionFromToken(id: string | string[], token: TokenPF2e) {
        id = id instanceof Array ? id : [id];
        await PF2eConditionManager._deleteConditionEntity(id, token);

        PF2eConditionManager.processConditions(token);
    }

    static async _deleteConditionEntity(ids: string[], token: TokenPF2e) {
        const list: string[] = [];
        const stack = new Array<string>(...ids);

        while (stack.length) {
            const id = stack.pop();
            const condition = token.actor.data.items.find((i: ItemData) => i._id === id) as ConditionData;

            if (condition) {
                list.push(id);

                condition.data.references.children.forEach((child) => stack.push(child.id));
            }
        }

        await token.actor.deleteEmbeddedEntity('OwnedItem', list);
    }

    static async updateConditionValue(id: string, token: TokenPF2e, value: number) {
        const condition = token.actor.data.items.find((i: ItemData) => i._id === id) as ConditionData;

        if (condition) {
            if (value === 0) {
                // Value is zero, remove the status.
                await PF2eConditionManager._deleteConditionEntity([id], token);
            } else {
                // Apply new value.
                const update = duplicate(condition);
                update.data.value.value = value;

                await token.actor.updateEmbeddedEntity('OwnedItem', update);

                console.log(`PF2e System | Setting condition '${condition.name}' to ${value}.`);
            }
        }

        PF2eConditionManager.processConditions(token);
    }

    static async renderEffects(token: TokenPF2e): Promise<void> {
        if (token.actor === null) return;

        const conditions = token.actor.data.items.filter(
            (appliedCondtion: ConditionData) =>
                appliedCondtion.flags.pf2e?.condition && appliedCondtion.type === 'condition',
        ) as Array<ConditionData>;

        const updates = duplicate(token.data);
        let updated = false;

        for await (const condition of conditions) {
            const url = condition.data.hud.img.useStatusName
                ? `${CONFIG.PF2E.statusEffects.effectsIconFolder}${condition.data.hud.statusName}.${CONFIG.PF2E.statusEffects.effectsIconFileType}`
                : condition.data.hud.img.value;

            if (!token.data.effects.includes(url)) {
                updates.effects.push(url);
                updated = true;
            }
        }

        if (updated) {
            await token.update(updates);
        }
    }

    static getFlattenedConditions(items: ConditionData[]): any[] {
        const conditions = new Map<string, any>();

        items
            .sort((a: ConditionData, b: ConditionData) => PF2eConditionManager.__sortCondition(a, b))
            .forEach((c: ConditionData) => {
                // Sorted list of conditions.
                // First by active, then by base (lexicographically), then by value (descending).

                let name = `${c.data.base}`;
                let condition;

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
                    const refCondition = items.find((i) => i._id === c.data.references.parent.id);

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

    static __sortCondition(a: ConditionData, b: ConditionData): number {
        if (a.data.active === b.data.active) {
            // Both are active or both inactive.

            if (a.data.base === b.data.base) {
                // Both are same base

                if (a.data.value.isValued) {
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

// Hooks.once("ready", () => { // or init?
//     PF2eConditionManager.init();
// });
