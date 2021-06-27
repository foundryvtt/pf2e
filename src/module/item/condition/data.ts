import { CONDITION_TYPES } from '@actor/data/values';
import { ItemSystemData } from '@item/data/base';
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from '@item/data/non-physical';
import { ConditionPF2e } from '.';

export type ConditionSource = BaseNonPhysicalItemSource<'condition', ConditionSystemData>;

export class ConditionData extends BaseNonPhysicalItemData<ConditionPF2e> {
    static override DEFAULT_ICON: ImagePath = 'systems/pf2e/icons/default-icons/condition.svg';
}

export interface ConditionData extends Omit<ConditionSource, '_id' | 'effects'> {
    type: ConditionSource['type'];
    data: ConditionSource['data'];
    readonly _source: ConditionSource;
}

export interface ConditionSystemData extends ItemSystemData {
    slug: ConditionType;
    active: boolean;
    removable: boolean;
    references: {
        parent?: {
            id: string;
            type: 'status' | 'condition' | 'feat' | 'weapon' | 'armor' | 'consumable' | 'equipment' | 'spell';
        };
        children: [
            {
                id: string;
                type: 'condition';
            },
        ];
        overriddenBy: [
            {
                id: string;
                type: 'condition';
            },
        ];
        overrides: [
            {
                id: string;
                type: 'condition';
            },
        ];
        /**
         * This status is immune, and thereby inactive, from the following list.
         */
        immunityFrom: [
            {
                id: string;
                type: 'status' | 'condition' | 'feat' | 'weapon' | 'armor' | 'consumable' | 'equipment' | 'spell';
            },
        ];
    };
    hud: {
        statusName: string;
        img: {
            useStatusName: boolean;
            value: ImagePath;
        };
        selectable: boolean;
    };
    duration: {
        perpetual: boolean;
        value: number;
        text: string;
    };
    modifiers: [
        {
            type: 'ability' | 'proficiency' | 'status' | 'circumstance' | 'item' | 'untyped';
            name: string;
            group: string;
            value?: number;
        },
    ];
    base: string;
    group: string;
    value: ConditionValueData;
    sources: {
        hud: boolean;
    };
    alsoApplies: {
        linked: [
            {
                condition: string;
                value?: number;
            },
        ];
        unlinked: [
            {
                condition: string;
                value?: number;
            },
        ];
    };
    overrides: string[];
}

type ConditionValueData =
    | {
          isValued: true;
          immutable: boolean;
          value: number;
          modifiers: [
              {
                  value: number;
                  source: string;
              },
          ];
      }
    | {
          isValued: false;
          immutable: boolean;
          value: null;
          modifiers: [
              {
                  value: number;
                  source: string;
              },
          ];
      };

export type ConditionType = typeof CONDITION_TYPES[number];
