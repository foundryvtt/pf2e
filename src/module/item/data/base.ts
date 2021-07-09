import { CreatureTrait } from '@actor/creature/data';
import type { ItemPF2e } from '@item/base';
import { FeatTrait } from '@item/feat/data';
import { SpellTrait } from '@item/spell/data';
import type { ActiveEffectPF2e } from '@module/active-effect';
import { RuleElementData } from '@module/rules/rules-data-definitions';
import { DocumentSchemaRecord, Rarity, ValuesList } from '@module/data';
import { ItemType } from '.';
import { PhysicalItemTrait } from '../physical/data';

export interface BaseItemSourcePF2e<
    TItemType extends ItemType = ItemType,
    TSystemData extends ItemSystemData = ItemSystemData,
> extends foundry.data.ItemSource {
    type: TItemType;
    data: TSystemData;
}

export abstract class BaseItemDataPF2e<TItem extends ItemPF2e = ItemPF2e> extends foundry.data.ItemData<
    TItem,
    ActiveEffectPF2e
> {
    /** Is this physical item data? */
    abstract isPhysical: boolean;
}

export interface BaseItemDataPF2e<TItem extends ItemPF2e = ItemPF2e> extends Omit<BaseItemSourcePF2e, 'effects'> {
    type: BaseItemSourcePF2e['type'];
    data: BaseItemSourcePF2e['data'];

    flags: {
        pf2e: {
            grantedBy?: { itemId: string; preDelete: 'block' | 'cascade' | null };
            itemGrants?: { itemId: string; preDelete: 'block' | 'cascade' | null }[];
        } & Record<string, any>;
        [key: string]: Record<string, any>;
    };

    readonly _source: BaseItemSourcePF2e;
}

export type ItemTrait = CreatureTrait | FeatTrait | PhysicalItemTrait | SpellTrait;

export interface ItemTraits<T extends ItemTrait = ItemTrait> extends ValuesList<T> {
    rarity: { value: Rarity };
}

export interface ItemLevelData {
    level: {
        value: number;
    };
}

export interface ItemSystemData {
    description: {
        value: string;
        chat: string;
        unidentified: string;
    };
    source: {
        value: string;
    };
    traits: ItemTraits;
    options?: {
        value: string[];
    };
    usage: {
        value: string;
    };
    rules: RuleElementData[];
    slug: string | null;
    schema: DocumentSchemaRecord;
}
