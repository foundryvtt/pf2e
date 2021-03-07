import { PF2ECharacter } from './character';
import { PF2ENPC } from './npc';
import { RawAnimalCompanionData, AnimalCompanionData } from './actor-data-definitions';
import { PF2ECreature } from './creature';

export class PF2EAnimalCompanion extends PF2ECreature {
    /** @override */
    static readonly type = 'animalCompanion';

    /** @override */
    static get defaultImg() {
        return CONST.DEFAULT_TOKEN;
    }

    /** Prepare Character type specific data. */
    prepareDerivedData(): void {
        super.prepareDerivedData();

        const actorData = this.data;
        const { data } = actorData;
        this._getDataFromMaster(data);
    }

    _getDataFromMaster(data: RawAnimalCompanionData): void {
        const gameActors = game.actors instanceof Actors ? game.actors : new Map();
        const master = gameActors.get(data.master.id);

        if (master instanceof PF2ECharacter || master instanceof PF2ENPC) {
            data.master.name = master.name;
            data.master.level = master.data.data.details.level;
            data.details.level = data.master.level;
        } else {
            //No master, but we still need valid values
            data.master.level = { value: 1, min: 1 };
            data.details.level = data.master.level;
        }
    }
}

export interface PF2EAnimalCompanion {
    data: AnimalCompanionData;
    _data: AnimalCompanionData;
}
