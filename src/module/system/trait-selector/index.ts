import { ActorPF2e } from '@actor/base';
import { ItemPF2e } from '@item/base';
import { ErrorPF2e } from '@module/utils';
import { TraitSelectorBasic } from './basic';
import { TraitSelectorResistances } from './resistances';
import { TraitSelectorSenses } from './senses';
import { TraitSelectorSpeedTypes } from './speed-types';
import { TraitSelectorWeaknesses } from './weaknesses';

export interface TraitSelectorOptions {
    /* Any FormApplication options to pass through */
    formOptions?: FormApplicationOptions;
    /* Basic trait selector options */
    basicTraitSelector: {
        /* The base property to update e.g. 'data.traits.languages' */
        objectProperty: string;
        /* An array of keys from CONFIG.PF2E */
        configTypes: string[];
        /* Show the custom input field (defaults to true) */
        allowCustom?: boolean;
        /* Custom choices to add to the list of choices */
        customChoices?: Record<string, string>;
    };
}

export type TraitSelectorTypes = 'basic' | 'resistances' | 'senses' | 'speed-types' | 'weaknesses';

export function getTraitSelector(
    object: ActorPF2e | ItemPF2e,
    selectorType: TraitSelectorTypes,
    options?: TraitSelectorOptions,
) {
    switch (selectorType) {
        case 'basic':
            return new TraitSelectorBasic(object, options);
        case 'resistances':
            return new TraitSelectorResistances(object, options);
        case 'senses':
            return new TraitSelectorSenses(object, options);
        case 'speed-types':
            return new TraitSelectorSpeedTypes(object, options);
        case 'weaknesses':
            return new TraitSelectorWeaknesses(object, options);
        default:
            throw ErrorPF2e(`Unknown trait selector: '${selectorType}'`);
    }
}
