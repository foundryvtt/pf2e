import { ItemPF2e } from '@item/base';
import { Rarity } from '@module/data';
import { MeleeData } from './data';

export class MeleePF2e extends ItemPF2e {
    /** @override */
    static get schema(): typeof MeleeData {
        return MeleeData;
    }

    /** @override */
    get rarity(): Rarity {
        return 'common';
    }

    /** @override */
    get isEquipped(): true {
        return true;
    }

    /** @override */
    getChatData(this: Embedded<MeleePF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        const data = this.data.data;
        const traits = this.traitChatData(CONFIG.PF2E.weaponTraits);

        const isAgile = this.traits.has('agile');
        const map2 = isAgile ? '-4' : '-5';
        const map3 = isAgile ? '-8' : '-10';

        return this.processChatData(htmlOptions, { ...data, traits, map2, map3 });
    }
}

export interface MeleePF2e {
    readonly data: MeleeData;
}
