import { PF2EActor } from './actor';
import { CreatureData } from './actor-data-definitions';

/** An "actor" a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
export abstract class PF2ECreature extends PF2EActor {}

export interface PF2ECreature {
    data: CreatureData;
    _data: CreatureData;
}
