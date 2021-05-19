import { CharacterPF2e } from './character';
import { NPCPF2e } from './npc';
import { RawAnimalCompanionData, AnimalCompanionData } from './data-definitions';
import { CreaturePF2e } from './creature';

export class AnimalCompanionPF2e extends CreaturePF2e {
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

        if (master instanceof CharacterPF2e || master instanceof NPCPF2e) {
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

export interface AnimalCompanionPF2e {
    data: AnimalCompanionData;
}
