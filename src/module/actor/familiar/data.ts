import { BaseCreatureAttributes, BaseCreatureData, BaseCreatureSource, CreatureSystemData } from '@actor/creature/data';
import { AbilityString, RawSkillData, Rollable } from '@actor/data/base';
import { LabeledValue } from '@module/data';
import type { FamiliarPF2e } from '.';

export type FamiliarSource = BaseCreatureSource<'familiar', FamiliarSystemData>;

export class FamiliarData extends BaseCreatureData<FamiliarPF2e, FamiliarSystemData> {
    static DEFAULT_ICON: ImagePath = 'systems/pf2e/icons/default-icons/familiar.svg';
}

export interface FamiliarData extends Omit<FamiliarSource, 'effects' | 'items' | 'token'> {
    readonly type: FamiliarSource['type'];
    data: FamiliarSource['data'];
    readonly _source: FamiliarSource;
}

interface FamiliarAttributes extends BaseCreatureAttributes {
    ac: { value: number; breakdown: string; check?: number };
    perception: { value: number } & Partial<RawSkillData> & Rollable;
    /** The movement speeds that this Familiar has. */
    speed: {
        /** The land speed for this actor. */
        value: string;
        /** A list of other movement speeds the actor possesses. */
        otherSpeeds: LabeledValue[];
    };
}

/** The raw information contained within the actor data object for familiar actors. */
interface FamiliarSystemData extends CreatureSystemData {
    details: {
        level: {
            value: number;
        };
        creature: {
            value: string;
        };
    };
    attributes: FamiliarAttributes;
    master: {
        id: string | null;
        ability: AbilityString | null;
    };
    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}
