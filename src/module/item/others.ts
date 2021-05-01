import { PhysicalItemPF2e } from './physical';
import { ItemPF2e } from './base';
import {
    ContainerData,
    ConditionData,
    EquipmentData,
    KitData,
    LoreData,
    MartialData,
    MeleeData,
    TreasureData,
} from './data-definitions';

export class ContainerPF2e extends PhysicalItemPF2e {}
export interface ContainerPF2e {
    data: ContainerData;
    _data: ContainerData;
}

export class TreasurePF2e extends PhysicalItemPF2e {}
export interface TreasurePF2e {
    data: TreasureData;
    _data: TreasureData;
}

export class KitPF2e extends PhysicalItemPF2e {
    get isEquipped(): false {
        return false;
    }
}

export interface KitPF2e {
    data: KitData;
    _data: KitData;
}

export class MeleePF2e extends PhysicalItemPF2e {
    getChatData(this: Owned<MeleePF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        const data = this.data.data;
        const traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.weaponTraits);

        const isAgile = this.traits.has('agile');
        const map2 = isAgile ? '-4' : '-5';
        const map3 = isAgile ? '-8' : '-10';

        return this.processChatData(htmlOptions, { ...data, traits, map2, map3 });
    }
}

export interface MeleePF2e {
    data: MeleeData;
    _data: MeleeData;
}

export class EquipmentPF2e extends PhysicalItemPF2e {
    getChatData(this: Owned<EquipmentPF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        const data = this.data.data;
        const properties = [data.equipped.value ? game.i18n.localize('PF2E.EquipmentEquippedLabel') : null].filter(
            (p) => p !== null,
        );
        return this.processChatData(htmlOptions, { ...data, properties });
    }
}

export interface EquipmentPF2e {
    data: EquipmentData;
    _data: EquipmentData;
}

export class LorePF2e extends ItemPF2e {
    // todo: this doesn't seem to ever be called...should it be killed?
    // types actually fail if its not any, so it probably doesn't even work
    getChatData(this: Owned<LorePF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        if (!this.actor) return {};
        const data: any = this.data.data;
        let properties = [];
        if (this.actor.data.type !== 'npc') {
            const abl = this.actor.data.data.abilities[data.ability.value].label;
            const prof = data.proficient.value || 0;
            properties = [abl, CONFIG.PF2E.proficiencyLevels[prof]].filter((p) => p !== null);
        }
        return this.processChatData(htmlOptions, { ...data, properties });
    }
}

export interface LorePF2e {
    data: LoreData;
    _data: LoreData;
}

export class MartialPF2e extends ItemPF2e {}
export interface MartialPF2e {
    data: MartialData;
    _data: MartialData;
}

export class ConditionPF2e extends ItemPF2e {
    /** Is the condition from the pf2e system or a module */
    get fromSystem(): boolean {
        return !!this.getFlag('pf2e', 'condition');
    }
}

export interface ConditionPF2e {
    data: ConditionData;
    _data: ConditionData;

    getFlag(scope: string, key: string): any;
    getFlag(scope: 'core', key: 'sourceId'): string | undefined;
    getFlag(scope: 'pf2e', key: 'condition'): true | undefined;
}
