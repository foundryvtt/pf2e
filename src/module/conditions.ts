import PF2EItem from './item/item';
import { ConditionData, ConditionDetailsData } from './item/dataDefinitions'
import { string } from 'yargs';
import { ConditionModifiers } from './condition-modifiers';
import { PF2Modifier } from './modifiers';

declare var PF2e: any;

/**
 * A helper class to manage PF2e Conditions.
 *
 */
export class PF2eConditionManager {
    static _conditionCache = new Map<string, any>();
    static _customConditions = new Map<string, any>();

    static _statusNames = new Map<string, any>();
    static _customStatusNames = new Map<string, any>();

    public static get conditionsNames() : IterableIterator<any> {
        return Array.from(PF2eConditionManager._conditionCache.keys()).concat(
            Array.from(PF2eConditionManager._customConditions.keys())
        ).values();
    }

    /**
     * Gets a collection of conditions.
     *
     * @return {Array<string>}   A list of status names.
     */
    public static get conditions() : IterableIterator<any> {
        return Array.from(PF2eConditionManager._conditionCache.values()).concat(
            Array.from(PF2eConditionManager._customConditions.values())
        ).values();
    }

    /**
     * Gets a list of status names.
     *
     * @return {Array<string>}   A list of status names.
     */
    public static get statusNames() :IterableIterator<string> {
        return Array.from(PF2eConditionManager._statusNames.keys()).concat(
            Array.from(PF2eConditionManager._customStatusNames.keys())
        ).values();
    }

    
    static init() {
        game.packs.get("pf2e.conditionitems").getContent().then(content => {
            content.forEach((condition) => {
                PF2eConditionManager._conditionCache.set(condition.name.toLowerCase(), condition);
                PF2eConditionManager._statusNames.set(condition.data.data.hud.statusName, condition);
            });
        });

        Object.freeze(PF2eConditionManager._conditionCache);
        Object.freeze(PF2eConditionManager._statusNames);
    }

    /**
     * Get a condition using the condition name.
     *
     * @param {string} condition    A list of conditions
     * @return {any}                The returned condition.
     */
    public static getCondition(condition:string) {
        condition = condition.toLocaleLowerCase();

        if (PF2eConditionManager._customConditions.has(condition)) {
            return PF2eConditionManager._customConditions.get(condition);
        } else {
            return PF2eConditionManager._conditionCache.get(condition);
        }
    }

    /**
     * Get a condition using the status name.
     *
     * @param {string} statusName    A list of conditions
     * @return {any}                 The condition.
     */
    public static getConditionByStatusName(statusName:string) {
        return PF2eConditionManager._statusNames.get(statusName);
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
        let overrides = new Array<string>();

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
                    conditionModifiers.set(modifier.group, new Array<PF2Modifier>());
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
}

Hooks.once("ready", function() { //or init?
    PF2eConditionManager.init();
});