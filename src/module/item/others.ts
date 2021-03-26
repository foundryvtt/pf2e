import { PhysicalItemPF2e } from './physical';
import { ItemPF2e } from './base';
import {
    ActionData,
    ContainerData,
    ConditionData,
    ConsumableData,
    EquipmentData,
    FeatData,
    FeatType,
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

export class KitPF2e extends PhysicalItemPF2e {}
export interface KitPF2e {
    data: KitData;
    _data: KitData;
}

export class MeleePF2e extends PhysicalItemPF2e {
    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = super.getChatData(htmlOptions);
        data.traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.weaponTraits);

        const isAgile = data.traits.includes('agile');
        data.map2 = isAgile ? '-4' : '-5';
        data.map3 = isAgile ? '-8' : '-10';

        return data;
    }
}

export interface MeleePF2e {
    data: MeleeData;
    _data: MeleeData;
}

export class ConsumablePF2e extends PhysicalItemPF2e {
    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = super.getChatData(htmlOptions);
        const localize = game.i18n.localize.bind(game.i18n);
        const consumableType = CONFIG.PF2E.consumableTypes[data.consumableType.value];
        return {
            ...data,
            consumableType: {
                ...data.consumableType,
                str: consumableType,
            },
            properties: [
                consumableType,
                `${data.charges.value}/${data.charges.max} ${localize('PF2E.ConsumableChargesLabel')}`,
            ],
            hasCharges: data.charges.value >= 0,
        };
    }
}

export interface ConsumablePF2e {
    data: ConsumableData;
    _data: ConsumableData;
}

export class EquipmentPF2e extends PhysicalItemPF2e {
    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = super.getChatData(htmlOptions);
        const properties = [data.equipped.value ? game.i18n.localize('PF2E.EquipmentEquippedLabel') : null];
        return { ...data, properties: properties.filter((p) => p !== null) };
    }
}

export interface EquipmentPF2e {
    data: EquipmentData;
    _data: EquipmentData;
}

export class FeatPF2e extends ItemPF2e {
    get featType(): { value: FeatType; label: string } {
        return {
            value: this.data.data.featType.value,
            label: game.i18n.localize(CONFIG.PF2E.featTypes[this.data.data.featType.value]),
        };
    }

    /**
     * Prepare chat card data for items of the "Feat" type
     */
    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = super.getChatData(htmlOptions);
        const properties = [
            `Level ${data.level.value || 0}`,
            data.actionType.value ? CONFIG.PF2E.actionTypes[data.actionType.value] : null,
        ].filter((p) => p);
        const traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.featTraits);
        return { ...data, properties, traits };
    }
}
export interface FeatPF2e {
    data: FeatData;
    _data: FeatData;
}

export class LorePF2e extends ItemPF2e {
    // todo: this doesn't seem to ever be called...should it be killed?
    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = super.getChatData(htmlOptions);
        if (this.actor.data.type !== 'npc') {
            const abl = this.actor.data.data.abilities[data.ability.value].label;
            const prof = data.proficient.value || 0;
            const properties = [abl, CONFIG.PF2E.proficiencyLevels[prof]];
            data.properties = properties.filter((p) => p !== null);
        }
        return data;
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

export class ActionPF2e extends ItemPF2e {
    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = super.getChatData(htmlOptions);

        let associatedWeapon: ItemPF2e | null = null;
        if (data.weapon.value) associatedWeapon = this.actor.getOwnedItem(data.weapon.value);

        // Feat properties
        const props = [CONFIG.PF2E.actionTypes[data.actionType.value], associatedWeapon ? associatedWeapon.name : null];
        const traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.featTraits);
        return { ...data, properties: props.filter((p) => p), traits };
    }
}

export interface ActionPF2e {
    data: ActionData;
    _data: ActionData;
}

export class ConditionPF2e extends ItemPF2e {}
export interface ConditionPF2e {
    data: ConditionData;
    _data: ConditionData;
}
