import { ConditionData, ConditionDetailsData } from './item/dataDefinitions'
import { PF2Modifier } from './modifiers';
import PF2EItem from './item/item'
import { PF2eStatusEffects } from '../scripts/actor/statusEffects'


declare let PF2e: any;

/**
 * A helper class to manage PF2e Conditions.
 *
 */
export class PF2eConditionManager {
    static _compediumConditions = new Map<string, ConditionData>();
    static _customConditions = new Map<string, ConditionData>();

    static _compendiumConditionStatusNames = new Map<string, ConditionData>();
    static _customStatusNames = new Map<string, ConditionData>();

    static __conditionsCache:Map<string, ConditionData> = undefined;
    static __statusNameCache:Map<string, ConditionData> = undefined;

    

    /**
     * Gets a collection of conditions.
     *
     * @return {Array<string>}   A list of status names.
     */
    public static get conditions() : Map<string, ConditionData> {
        
        if (!PF2eConditionManager.__conditionsCache) {
            PF2eConditionManager.__conditionsCache = new Map<string, ConditionData>();

            PF2eConditionManager._compediumConditions.forEach((condition, name) => PF2eConditionManager.__conditionsCache.set(name, duplicate(condition)));
            PF2eConditionManager._customConditions.forEach((condition, name) => PF2eConditionManager.__conditionsCache.set(name, duplicate(condition)));

            Object.freeze(PF2eConditionManager.__conditionsCache);
        }

        return PF2eConditionManager.__conditionsCache;
    }

    /**
     * Gets a list of condition names.
     *
     * @return {IterableIterator<string>}   A list of condition names.
     */
    public static get conditionsNames() : IterableIterator<string> {
        return Array.from(PF2eConditionManager._compediumConditions.keys()).concat(
            Array.from(PF2eConditionManager._customConditions.keys())
        ).values();
    }

    /**
     * Gets a list of status names.
     *
     * @return {IterableIterator<string>}   A list of status names.
     */
    public static get statusNames() : IterableIterator<string> {
        return Array.from(PF2eConditionManager._compendiumConditionStatusNames.keys()).concat(
            Array.from(PF2eConditionManager._customStatusNames.keys())
        ).values();
    }

    
    static init() {
        game.packs.get("pf2e.conditionitems").getContent().then(content => {
            content.forEach((condition) => {
                PF2eConditionManager._compediumConditions.set(condition.name.toLowerCase(), condition as ConditionData);
                PF2eConditionManager._compendiumConditionStatusNames.set(condition.data.data.hud.statusName, condition  as ConditionData);
            });
        });

        Object.freeze(PF2eConditionManager._compediumConditions);
        Object.freeze(PF2eConditionManager._compendiumConditionStatusNames);
    }

    /**
     * Get a condition using the condition name.
     *
     * @param {string} condition    A list of conditions
     * @return {ConditionData}                The returned condition.
     */
    public static getCondition(condition:string) : ConditionData {
        condition = condition.toLocaleLowerCase();

        if (PF2eConditionManager._customConditions.has(condition)) {
            return duplicate<ConditionData>(PF2eConditionManager._customConditions.get(condition));
        } else {
            return duplicate<ConditionData>(PF2eConditionManager._compediumConditions.get(condition));
        }
    }

    /**
     * Get a condition using the status name.
     *
     * @param {string} statusName    A list of conditions
     * @return {ConditionData}       The condition.
     */
    public static getConditionByStatusName(statusName:string) : ConditionData {
        if (PF2eConditionManager._customStatusNames.has(statusName)) {
            return duplicate<ConditionData>(PF2eConditionManager._customStatusNames.get(statusName));
        } else {
            return duplicate<ConditionData>(PF2eConditionManager._compendiumConditionStatusNames.get(statusName));
        }
    }

    
    /**
     * Creates a new custom condition object.
     *
     * @param {string} name          The name of the condition.
     * @param {ConditionData} data   The condition data to use.
     * @return {boolean}             True if the object was created.
     */
    public static createCustomCondition(name:string, data:ConditionData) : boolean {
        name = name.toLocaleLowerCase();

        if (PF2eConditionManager._customConditions.has(name)) {
            return false;
        }

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
    public static deleteCustomCondition(name:string) : boolean {
        name = name.toLocaleLowerCase();

        if (PF2eConditionManager._customConditions.has(name)) {
            PF2eConditionManager._customConditions.delete(name);
            return true;
        }

        return false;
    }

    static async processConditions(token:Token) {
        const conditions = token.actor.data.items.filter(c => c.type === 'condition') as ConditionData[];

        const appliedConditions = Array.from(PF2eConditionManager.getAppliedConditions(conditions));

        const updates:ConditionData[] = [];
        

        conditions.forEach(
            (condition:ConditionData) => {
                if (appliedConditions.some(i => i._id === condition._id) && !condition.data.active) {
                    // Condition is applied and is not marked active
                    const c = duplicate(condition);
                    c.data.active = true;
                    updates.push(c);
                } else if (!appliedConditions.some(i => i._id === condition._id) && condition.data.active) {
                    // Condition is not applied, but is marked active
                    const c = duplicate(condition);
                    c.data.active = false;
                    updates.push(c);
                }
            }
        );

        if (updates.length) {
            await token.actor.updateEmbeddedEntity('OwnedItem', updates);
        }

        // Update effects
        const effectUpdates = duplicate(token.data);

        effectUpdates.effects = [];

        const statuses:Array<string> = token.data.effects.filter(
            item => Array.from<string>(PF2eConditionManager.statusNames).map(
                status => `${CONFIG.PF2eStatusEffects.effectsIconFolder + status }.${ CONFIG.PF2eStatusEffects.effectsIconFileType}`
            ).indexOf(item) < 0
        );

        for (const condition of appliedConditions) {
            const url = (condition.data.hud.img.useStatusName)?
                `${CONFIG.PF2eStatusEffects.effectsIconFolder}${condition.data.hud.statusName}.${CONFIG.PF2eStatusEffects.effectsIconFileType}`:
                condition.data.hud.img.value;

            effectUpdates.effects.push(url);
        }

        // Dedup the effect list to make sure a status icon only displays once.
        const newSet = [...new Set(effectUpdates.effects)].concat(statuses);

        // See if any effects were added or removed
        // and only update the token if they have been.
        const added = newSet.filter(item => token.data.effects.indexOf(item) < 0);
        const removed = token.data.effects.filter(item => newSet.indexOf(item) < 0);
        
        if (added.length > 0 || removed.length > 0) {
            effectUpdates.effects = newSet;
        
            await token.update(effectUpdates);
        }

        if (token.hasActiveHUD) {
            PF2eStatusEffects._updateHUD(canvas.tokens.hud.element, token);
        }
    }

    /**
     * Applies condition logic to retrieve only those conditions that are affecting a character.
     *
     * @param {Array<ConditionData>} conditions    A list of conditions
     * @param {any} conditions    A list of value modifiers. NOT IMPLEMENTED.
     * @return {IterableIterator<ConditionData>}   The collection of conditions applied.
     */
    static getAppliedConditions(conditions:Array<ConditionData>, modifiers?) : IterableIterator<ConditionData> {
        const appliedConditions = new Map<string, ConditionData>();
        let overrides: string[] = [];

        for (const condition of conditions) {
            const data = condition.data as ConditionDetailsData;

            if (appliedConditions.has(data.base)) {
                // Already seen the condition

                if (data.value.isValued) {
                    // Only need to update if the condition has a value that needs to be updated

                    const value = (appliedConditions.get(data.base).data as ConditionDetailsData).value.value;

                    if (data.value.value > value) {
                        appliedConditions.set(data.base, condition);
                    }
                }
            } else {
                // Have not seen this condition before
                appliedConditions.set(data.base, condition);

                overrides = overrides.concat(data.overrides);
            }
        }

        for (const override of overrides) {
            if (appliedConditions.has(override)){
                appliedConditions.delete(override);
            }
        }

        return appliedConditions.values();
    }

    /**
     * Gets a map of modifiers from a collection of conditions.
     *
     * @param {IterableIterator<ConditionData>} conditions    A collection of conditions to retrieve modifiers from.
     * @return {Map<string, Array<PF2Modifier>>}              A map of PF2Modifiers from the conditions collection.
     */
    static getModifiersFromConditions(conditions:IterableIterator<ConditionData>) : Map<string, Array<PF2Modifier>> {
        const conditionModifiers = new Map<string, Array<PF2Modifier>>();

        for (const condition of conditions) {
            for (const modifier of condition.data.modifiers) {
                if (!(conditionModifiers.has(modifier.group))) {
                    conditionModifiers.set(modifier.group, <Array<PF2Modifier>>[]);
                }

                if (condition.data.value.isValued) {
                    conditionModifiers.get(modifier.group).push(new PF2Modifier(condition.name, -condition.data.value.value, modifier.type));
                } else {
                    conditionModifiers.get(modifier.group).push(new PF2Modifier(condition.name, modifier.value, modifier.type))
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
    static async addConditionToToken(name:string|ConditionData, token:Token) {
        const condition:ConditionData = name instanceof String ? PF2eConditionManager.getCondition(name as string) : name as ConditionData;

        const returnValue = await PF2eConditionManager._addConditionEntity(condition, token);

        PF2eConditionManager.processConditions(token);

        return returnValue;
    }

    static async _addConditionEntity(condition:ConditionData, token:Token) {
        let returnValue = await token.actor.createEmbeddedEntity('OwnedItem', new PF2EItem(condition)) as any;

        // Ghetto race condition style fix for unlinked items NOT CREATED THE SAME FUCKING WAY!
        if (!token.data.actorLink) {
            for (let i:number = token.actor.data.items.length - 1; i>=0; i--) {
                if (token.actor.data.items[i].name === condition.name) {
                    returnValue = token.actor.data.items[i];
                    break;
                }
            }
        }

        returnValue = returnValue as ConditionData;

        // Needs synchronicity.
        for (const item of condition.data.alsoApplies.linked) {
            const c = PF2eConditionManager.getCondition(item.condition);
            if (item.value) {
                c.data.value.value = item.value;
            }

            c.data.sources.values.push({id:returnValue._id, type:'condition'});
            c.data.sources.hud = condition.data.sources.hud;
            
            await PF2eConditionManager._addConditionEntity(c, token); // eslint-disable-line no-await-in-loop
        }

        // Needs synchronicity.
        for (const item of condition.data.alsoApplies.unlinked) {
            const c = PF2eConditionManager.getCondition(item.condition);
            if (item.value) {
                c.name = `${c.name} ${c.data.value.value}`;
                c.data.value.value = item.value;
            }
            
            await PF2eConditionManager._addConditionEntity(c, token); // eslint-disable-line no-await-in-loop
        }

        return returnValue;
    }

    /**
     * Adds a condition to a token.
     *
     * @param {string|string[]} name    A collection of conditions to retrieve modifiers from.
     * @param {Token} token    The token to add the condition to.
     */
    static async removeConditionFromToken(id:string[], token:Token) {
        id = id instanceof Array ? id : [id];
        await PF2eConditionManager._deleteConditionEntity(id, token);

        PF2eConditionManager.processConditions(token);
    }

    static async _deleteConditionEntity(ids:string[], token) {
        const list:string[] = [];
        const stack = new Array<string>(...ids);

        while (stack.length) {
            const id = stack.pop();
            const condition = token.actor.data.items.find((i:ConditionData) => i._id === id) as ConditionData;

            if (condition) {
                list.push(id);

                token.actor.data.items
                .filter((appliedCondtion:ConditionData) => appliedCondtion.type === 'condition' && appliedCondtion.data.sources.values.some(i => i.id === id))
                .map(i => stack.push(i._id));
            }
        };

        await token.actor.deleteEmbeddedEntity('OwnedItem', list);
    }


    static async updateConditionValue(id:string, token:Token, value:number) {
        const condition = token.actor.data.items.find((i:ConditionData) => i._id === id) as ConditionData;

        if (condition) {
            if (value === 0) {
                // Value is zero, remove the status.
                await PF2eConditionManager._deleteConditionEntity([id], token);
            } else {
                // Apply new value.
                const update = duplicate(condition);
                update.data.value.value = value;

                await token.actor.updateEmbeddedEntity("OwnedItem", update);

                console.log(`PF2e System | Setting condition '${condition.name}' to ${value}.`);
            }
        }

        PF2eConditionManager.processConditions(token);
    }

    static async renderEffects(token:Token) {
        const conditions = token.actor.data.items.filter((appliedCondtion:ConditionData) => appliedCondtion.type === 'condition') as Array<ConditionData>;

        const updates = duplicate(token.data);
        let updated = false;
        
        for (const condition of conditions) {
            const url = (condition.data.hud.img.useStatusName)?
            `${CONFIG.PF2eStatusEffects.effectsIconFolder}${condition.data.hud.statusName}.${CONFIG.PF2eStatusEffects.effectsIconFileType}`:
                condition.data.hud.img.value;

            if (!token.data.effects.includes(url)) {
                updates.effects.push(url);
                updated = true;
            }
        }

        if (updated) {
            await token.update(updates); // eslint-disable-line no-await-in-loop
        }
    }
}

Hooks.once("ready", () => { // or init?
    PF2eConditionManager.init();
});