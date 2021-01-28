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

    /** @override */
    static get defaultImg() {
        return 'systems/pf2e/icons/actions/OneAction.png';
    }
}
export class PF2EConsumable extends PF2EPhysicalItem {
    data!: ConsumableData;
}
export class PF2EEquipment extends PF2EPhysicalItem {
    data!: EquipmentData;
}
export class PF2EFeat extends PF2EItem {
    data!: FeatData;
}
export class PF2ELore extends PF2EItem {
    data!: LoreData;

    /** @override */
    static get defaultImg() {
        return 'icons/svg/d20-black.svg';
    }
}
export class PF2EMartial extends PF2EItem {
    data!: MartialData;
}
export class PF2EAction extends PF2EItem {
    data!: ActionData;

    /** @override */
    static get defaultImg() {
        return 'systems/pf2e/icons/actions/OneAction.png';
    }
}
export class PF2ESpell extends PF2EItem {
    data!: SpellData;
}
export class PF2ESpellcastingEntry extends PF2EItem {
    data!: SpellcastingEntryData;
}
export class PF2EStatus extends PF2EItem {
    data!: StatusData;

    /** @override */
    static get defaultImg() {
        return CONST.DEFAULT_TOKEN;
    }
}
export class PF2ECondition extends PF2EItem {
    data!: ConditionData;
}
