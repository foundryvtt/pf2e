import { PF2ECharacter } from './character';
import { PF2ENPC } from './npc';
import { PF2EActor } from './actor';
import { AnimalCompanionData } from './actor-data-definitions';

export class PF2EAnimalCompanion extends PF2EActor {
    data!: AnimalCompanionData;

    /** @override */
    static get defaultImg() {
        return CONST.DEFAULT_TOKEN;
    }

    /** Prepare Character type specific data. */
    prepareDerivedData(): void {
        super.prepareDerivedData();

        const actorData = this.data;
        const { data } = actorData;

        const gameActors = game.actors instanceof Actors ? game.actors : new Map();
        const master = gameActors.get(data.master.id);

        if (master instanceof PF2ECharacter || master instanceof PF2ENPC) {
            data.master.level = master.data.data.details.level ?? void 0;
            data.master.name = master.name;
            //to make logic from character work seemlessly(ish)
            data.details.level = data.master.level;
        }
    }
}
