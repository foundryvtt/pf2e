import { PF2EPhysicalItem } from './physical';
import { PF2EItem } from './item';
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
    StatusData,
    TreasureData,
    WeaponData,
} from './data-definitions';

export class PF2EBackpack extends PF2EPhysicalItem {
    data!: BackpackData;
    _data!: BackpackData;
}
export class PF2ETreasure extends PF2EPhysicalItem {
    data!: TreasureData;
    _data!: TreasureData;
}
export class PF2EWeapon extends PF2EPhysicalItem {
    data!: WeaponData;
    _data!: WeaponData;
}
export class PF2EArmor extends PF2EPhysicalItem {
    data!: ArmorData;
    _data!: ArmorData;
}
export class PF2EKit extends PF2EPhysicalItem {
    data!: KitData;
    _data!: KitData;
}
export class PF2EMelee extends PF2EPhysicalItem {
    data!: MeleeData;
    _data!: MeleeData;
}
export class PF2EConsumable extends PF2EPhysicalItem {
    data!: ConsumableData;
    _data!: ConsumableData;
}
export class PF2EEquipment extends PF2EPhysicalItem {
    data!: EquipmentData;
    _data!: EquipmentData;
}
export class PF2EFeat extends PF2EItem {
    data!: FeatData;
    _data!: FeatData;

    get featType(): { value: FeatType; label: string } {
        return {
            value: this.data.data.featType.value,
            label: game.i18n.localize(CONFIG.PF2E.featTypes[this.data.data.featType.value]),
        };
    }
}
export class PF2ELore extends PF2EItem {
    data!: LoreData;
    _data!: LoreData;
}
export class PF2EMartial extends PF2EItem {
    data!: MartialData;
    _data!: MartialData;
}
export class PF2EAction extends PF2EItem {
    data!: ActionData;
    _data!: ActionData;
}
export class PF2ESpell extends PF2EItem {
    data!: SpellData;
    _data!: SpellData;
}
export class PF2ESpellcastingEntry extends PF2EItem {
    data!: SpellcastingEntryData;
    _data!: SpellcastingEntryData;
}
export class PF2EStatus extends PF2EItem {
    data!: StatusData;
    _data!: StatusData;
}
export class PF2ECondition extends PF2EItem {
    data!: ConditionData;
    _data!: ConditionData;
}
