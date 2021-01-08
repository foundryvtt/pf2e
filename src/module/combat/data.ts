/* global CombatData, CombatantData */

import { PF2EActor } from '../actor/actor';

export interface CombatantDataPF2e<ActorType extends PF2EActor = PF2EActor> extends CombatantData<ActorType> {
    flags: {
        pf2e: {
            trackerPosition: number;
        };
    };
    hasTieBreakerItem: boolean;
    isNPC: boolean;
    sort: number | null;
    trackerPosition: number | null;
}

export type CombatDataPF2e = CombatData<CombatantDataPF2e>;
