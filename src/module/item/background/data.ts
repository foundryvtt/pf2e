import { SkillAbbreviation } from '@actor/creature/data';
import { AbilityString } from '@actor/data/base';
import { ABCSystemData } from '@item/abc/data';
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from '@item/data/non-physical';
import { BackgroundPF2e } from '.';

export type BackgroundSource = BaseNonPhysicalItemSource<'background', BackgroundSystemData>;

export class BackgroundData extends BaseNonPhysicalItemData<BackgroundPF2e> {
    /** @override */
    static DEFAULT_ICON: ImagePath = 'systems/pf2e/icons/default-icons/background.svg';
}

export interface BackgroundData extends Omit<BackgroundSource, '_id' | 'effects'> {
    type: BackgroundSource['type'];
    data: BackgroundSource['data'];
    readonly _source: BackgroundSource;
}

interface BackgroundSystemData extends ABCSystemData {
    boosts: { [key: string]: { value: AbilityString[] } };
    trainedLore: string;
    trainedSkills: {
        value: SkillAbbreviation[];
    };
}
