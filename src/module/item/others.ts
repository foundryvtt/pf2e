import { PF2EPhysicalItem } from './physical';
import { PF2EItem } from './item';
import {
    ActionData,
    AncestryData,
    ArmorData,
    BackgroundData,
    BackpackData,
    ClassData,
    ConditionData,
    ConsumableData,
    EquipmentData,
    FeatData,
    KitData,
    LoreData,
    MartialData,
    MeleeData,
    SpellcastingEntryData,
    SpellData,
    StatusData,
    TreasureData,
    WeaponData,
} from './dataDefinitions';

export class PF2EBackpack extends PF2EPhysicalItem {
    data!: BackpackData;
}
export class PF2ETreasure extends PF2EPhysicalItem {
    data!: TreasureData;
}
export class PF2EWeapon extends PF2EPhysicalItem {
    data!: WeaponData;
}
export class PF2EArmor extends PF2EPhysicalItem {
    data!: ArmorData;
}
export class PF2EKit extends PF2EPhysicalItem {
    data!: KitData;
}
export class PF2EMelee extends PF2EPhysicalItem {
    data!: MeleeData;
}
export class PF2EConsumable extends PF2EPhysicalItem {
    data!: ConsumableData;
}
export class PF2EEquipment extends PF2EPhysicalItem {
    data!: EquipmentData;
}
export class PF2EAncestry extends PF2EItem {
    data!: AncestryData;
}
export class PF2EBackground extends PF2EItem {
    data!: BackgroundData;
}
export class PF2EClass extends PF2EItem {
    data!: ClassData;
}
export class PF2EFeat extends PF2EItem {
    data!: FeatData;
}
export class PF2ELore extends PF2EItem {
    data!: LoreData;
}
export class PF2EMartial extends PF2EItem {
    data!: MartialData;
}
export class PF2EAction extends PF2EItem {
    data!: ActionData;
}
export class PF2ESpell extends PF2EItem {
    data!: SpellData;
}
export class PF2ESpellcastingEntry extends PF2EItem {
    data!: SpellcastingEntryData;
}
export class PF2EStatus extends PF2EItem {
    data!: StatusData;
}
export class PF2ECondition extends PF2EItem {
    data!: ConditionData;
}
