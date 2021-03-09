import { PF2EPhysicalItem } from './physical';
import { ItemPF2e } from './item';
import {
    ActionData,
    ArmorData,
    BackpackData,
    ConditionData,
    ConsumableData,
    EquipmentData,
    FeatData,
    FeatType,
    KitData,
    LoreData,
    MartialData,
    MeleeData,
    SpellcastingEntryData,
    SpellData,
    TreasureData,
    WeaponData,
} from './data-definitions';

export class ContainerPF2e extends PF2EPhysicalItem {
    data!: BackpackData;
    _data!: BackpackData;
}
export class TreasurePF2e extends PF2EPhysicalItem {
    data!: TreasureData;
    _data!: TreasureData;
}
export class WeaponPF2e extends PF2EPhysicalItem {
    data!: WeaponData;
    _data!: WeaponData;
}
export class ArmorPF2e extends PF2EPhysicalItem {
    data!: ArmorData;
    _data!: ArmorData;
}
export class KitPF2e extends PF2EPhysicalItem {
    data!: KitData;
    _data!: KitData;
}
export class MeleePF2e extends PF2EPhysicalItem {
    data!: MeleeData;
    _data!: MeleeData;
}
export class ConsumablePF2e extends PF2EPhysicalItem {
    data!: ConsumableData;
    _data!: ConsumableData;
}
export class EquipmentPF2e extends PF2EPhysicalItem {
    data!: EquipmentData;
    _data!: EquipmentData;
}
export class FeatPF2e extends ItemPF2e {
    data!: FeatData;
    _data!: FeatData;

    get featType(): { value: FeatType; label: string } {
        return {
            value: this.data.data.featType.value,
            label: game.i18n.localize(CONFIG.PF2E.featTypes[this.data.data.featType.value]),
        };
    }
}
export class LorePF2e extends ItemPF2e {
    data!: LoreData;
    _data!: LoreData;
}
export class MartialPF2e extends ItemPF2e {
    data!: MartialData;
    _data!: MartialData;
}
export class ActionPF2e extends ItemPF2e {
    data!: ActionData;
    _data!: ActionData;
}
export class SpellPF2e extends ItemPF2e {
    data!: SpellData;
    _data!: SpellData;
}
export class SpellcastingEntryPF2e extends ItemPF2e {
    data!: SpellcastingEntryData;
    _data!: SpellcastingEntryData;
}
export class ConditionPF2e extends ItemPF2e {
    data!: ConditionData;
    _data!: ConditionData;
}
