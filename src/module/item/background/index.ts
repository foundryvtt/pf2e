import { CharacterPF2e } from "@actor";
import { OneToFour } from "@module/data";
import { ABCItemPF2e } from "../abc";
import { BackgroundData } from "./data";

export class BackgroundPF2e extends ABCItemPF2e {
    static override get schema(): typeof BackgroundData {
        return BackgroundData;
    }

    prepareActorData(this: Embedded<BackgroundPF2e>): void {
        if (!(this.actor instanceof CharacterPF2e)) {
            console.error("Only a character can have a background");
            return;
        }

        const { trainedSkills } = this.data.data;
        if (trainedSkills.value.length === 1) {
            const key = trainedSkills.value[0];
            const skill = this.actor.data.data.skills[key];
            skill.rank = Math.max(skill.rank, 1) as OneToFour;
        }
    }
}

export interface BackgroundPF2e {
    readonly data: BackgroundData;
}
