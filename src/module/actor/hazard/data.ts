import { ActorSystemData, BaseActorDataPF2e, BaseActorSourcePF2e, BaseTraitsData } from '@actor/data/base';
import { HazardPF2e } from '.';

/** The stored source data of a hazard actor */
export type HazardSource = BaseActorSourcePF2e<'hazard', HazardSystemData>;

export class HazardData extends BaseActorDataPF2e<HazardPF2e> {
    static override DEFAULT_ICON: ImagePath = 'systems/pf2e/icons/default-icons/hazard.svg';
}

/** Wrapper type for hazard-specific data. */
export interface HazardData extends Omit<HazardSource, 'effects' | 'items' | 'token'> {
    type: HazardSource['type'];
    data: HazardSource['data'];
    readonly _source: HazardSource;
}

interface HazardAttributes {
    ac: {
        value: number;
    };
    hasHealth: boolean;
    hp: {
        value: number;
        max: number;
        temp: number;
        details: string;
    };
    hardness: number;
    stealth: {
        value: number;
        details: string;
    };
}

/** The raw information contained within the actor data object for hazards. */
export interface HazardSystemData extends ActorSystemData {
    attributes: HazardAttributes;
    /** Traits, languages, and other information. */
    traits: BaseTraitsData;
    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}
