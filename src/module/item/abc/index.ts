import { ItemPF2e } from '../index';
import type { AncestryData } from '@item/ancestry/data';
import type { BackgroundData } from '@item/background/data';
import type { ClassData } from '@item/class/data';

/** Abstract base class representing a Pathfinder (A)ncestry, (B)ackground, or (C)lass */
export abstract class ABCItemPF2e extends ItemPF2e {}

export interface ABCItemPF2e {
    readonly data: AncestryData | BackgroundData | ClassData;
}
