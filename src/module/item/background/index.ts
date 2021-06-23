import { CharacterPF2e } from '@actor';
import { ZeroToFour } from '@module/data';
import { ABCItemPF2e } from '../abc';
import { BackgroundData } from './data';

export class BackgroundPF2e extends ABCItemPF2e {
    static override get schema(): typeof BackgroundData {
        return BackgroundData;
    }

    /** Apply selected skill training to the actor */
    prepareActorData(actor: CharacterPF2e) {
        const trainedSkill = this.data.data.trainedSkills.value;
        if (trainedSkill.length === 1) {
            const skillKey = trainedSkill[0];
            const skill = actor.data.data.skills[skillKey];
            skill.rank = Math.max(skill.rank, 1) as ZeroToFour;
        }
    }
}

export interface BackgroundPF2e {
    readonly data: BackgroundData;
}
