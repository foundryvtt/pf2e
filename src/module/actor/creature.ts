import { ActorPF2e } from './base';
import { CreatureData } from './data-definitions';

/** An "actor" in a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
export abstract class CreaturePF2e extends ActorPF2e {}

export interface CreaturePF2e {
    data: CreatureData;
    _data: CreatureData;
}
