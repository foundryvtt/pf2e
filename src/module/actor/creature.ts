import { ActorPF2e } from './base';
import { CreatureData } from './data-definitions';

/** An "actor" a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
export abstract class PF2ECreature extends ActorPF2e {}

export interface PF2ECreature {
    data: CreatureData;
    _data: CreatureData;
}
