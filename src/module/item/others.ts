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

export class MeleePF2e extends PhysicalItemPF2e {}
export interface MeleePF2e {
    data: MeleeData;
    _data: MeleeData;
}

export class ConsumablePF2e extends PhysicalItemPF2e {}
export interface ConsumablePF2e {
    data: ConsumableData;
    _data: ConsumableData;
}

export class EquipmentPF2e extends PhysicalItemPF2e {}
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
}
export interface FeatPF2e {
    data: FeatData;
    _data: FeatData;
}

export class LorePF2e extends ItemPF2e {}
export interface LorePF2e {
    data: LoreData;
    _data: LoreData;
}

export class MartialPF2e extends ItemPF2e {}
export interface MartialPF2e {
    data: MartialData;
    _data: MartialData;
}

export class ActionPF2e extends ItemPF2e {}
export interface ActionPF2e {
    data: ActionData;
    _data: ActionData;
}

export class ConditionPF2e extends ItemPF2e {}
export interface ConditionPF2e {
    data: ConditionData;
    _data: ConditionData;
}
