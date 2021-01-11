/**
 * Single-module export for all Enitity classes
 */

/** Actor */
import { PF2EActor, PF2EHazard, PF2EVehicle, SKILL_DICTIONARY, SKILL_EXPANDED, TokenPF2e } from './actor/actor';
import { PF2ECharacter } from './actor/character';
import { PF2ENPC } from './actor/npc';
import { PF2EFamiliar } from './actor/familiar';
import { PF2ELoot, LootTransfer, LootTransferData } from './actor/loot';
import {
    CharacterData,
    NpcData,
    FamiliarData,
    LootData,
    InitiativeData,
    DexterityModifierCapData,
    ActorDataPF2e,
    CharacterStrike,
    CharacterStrikeTrait,
    SkillData,
    RawCharacterData,
    AbilityString,
    Proficency,
} from './actor/actorDataDefinitions';

/** Item */
import { PF2EItem } from './item/item';
import { PF2EPhysicalItem } from './item/physical';
import {
    PF2EBackpack,
    PF2ETreasure,
    PF2EWeapon,
    PF2EArmor,
    PF2EKit,
    PF2EMelee,
    PF2EConsumable,
    PF2EEquipment,
    PF2EAncestry,
    PF2EBackground,
    PF2EClass,
    PF2EFeat,
    PF2ELore,
    PF2EMartial,
    PF2EAction,
    PF2ESpell,
    PF2ESpellcastingEntry,
    PF2EStatus,
    PF2ECondition,
} from './item/others';
import {
    ItemData,
    ActionData,
    AncestryData,
    ArmorData,
    ArmorDetailsData,
    BackgroundData,
    BackpackData,
    ClassData,
    ConditionData,
    ConditionDetailsData,
    ConsumableData,
    EquipmentData,
    FeatData,
    KitData,
    KitDetailsData,
    KitEntryData,
    LoreData,
    MartialData,
    MeleeData,
    SpellcastingEntryData,
    SpellData,
    StatusData,
    TreasureData,
    WeaponData,
    WeaponDetailsData,
    isPhysicalItem,
    isLevelItem,
    PhysicalItemData,
    ProficiencyRank,
    Rarity,
    ABCFeatureEntryData,
} from './item/dataDefinitions';

import {
    Bulk,
    BulkConfig,
    BulkItem,
    defaultBulkConfig,
    StackDefinitions,
    weightToBulk,
    calculateBulk,
    itemsFromActorData,
    stacks,
    formatBulk,
    indexBulkItemsById,
    calculateCarriedArmorBulk,
    fixWeight,
    toBulkItems,
} from './item/bulk';
import {
    Coins,
    calculateWealth,
    calculateTotalWealth,
    addCoins,
    calculateValueOfCurrency,
    attemptToRemoveCoinsByValue,
    addCoinsSimple,
    removeCoinsSimple,
    sellAllTreasureSimple,
    sellTreasure,
} from './item/treasure';
import { getContainerMap, isCycle } from './item/container';
import { calculateEncumbrance } from './item/encumbrance';
import { identifyItem, IdentifyAlchemyDCs, IdentifyMagicDCs } from './item/identification';
import { addKit } from './item/kits';
import {
    getPropertyRuneModifiers,
    getStrikingDice,
    hasGhostTouchRune,
    getArmorBonus,
    getAttackBonus,
    getResiliencyBonus,
} from './item/runes';
export {
    PF2EActor,
    PF2ECharacter,
    PF2ENPC,
    PF2EHazard,
    PF2ELoot,
    PF2EVehicle,
    PF2EFamiliar,
    SKILL_DICTIONARY,
    SKILL_EXPANDED,
    TokenPF2e,
};
export {
    PF2EItem,
    PF2EPhysicalItem,
    PF2EBackpack,
    PF2ETreasure,
    PF2EWeapon,
    PF2EArmor,
    PF2EKit,
    PF2EMelee,
    PF2EConsumable,
    PF2EEquipment,
    PF2EAncestry,
    PF2EBackground,
    PF2EClass,
    PF2EFeat,
    PF2ELore,
    PF2EMartial,
    PF2EAction,
    PF2ESpell,
    PF2ESpellcastingEntry,
    PF2EStatus,
    PF2ECondition,
    LootTransfer,
    LootTransferData,
};
export {
    CharacterData,
    NpcData,
    FamiliarData,
    LootData,
    InitiativeData,
    DexterityModifierCapData,
    ActorDataPF2e,
    CharacterStrike,
    CharacterStrikeTrait,
    SkillData,
    RawCharacterData,
    AbilityString,
    Proficency,
};
export {
    ItemData,
    ActionData,
    AncestryData,
    ArmorData,
    ArmorDetailsData,
    BackgroundData,
    BackpackData,
    ClassData,
    ConditionData,
    ConditionDetailsData,
    ConsumableData,
    EquipmentData,
    FeatData,
    KitData,
    KitDetailsData,
    KitEntryData,
    LoreData,
    MartialData,
    MeleeData,
    SpellcastingEntryData,
    SpellData,
    StatusData,
    TreasureData,
    WeaponData,
    WeaponDetailsData,
    isPhysicalItem,
    isLevelItem,
    PhysicalItemData,
    ProficiencyRank,
    Rarity,
    ABCFeatureEntryData,
};
export {
    Coins,
    calculateWealth,
    calculateTotalWealth,
    addCoins,
    calculateValueOfCurrency,
    attemptToRemoveCoinsByValue,
    addCoinsSimple,
    removeCoinsSimple,
    sellAllTreasureSimple,
    sellTreasure,
};
export {
    Bulk,
    BulkConfig,
    BulkItem,
    defaultBulkConfig,
    StackDefinitions,
    weightToBulk,
    calculateBulk,
    itemsFromActorData,
    stacks,
    formatBulk,
    indexBulkItemsById,
    calculateCarriedArmorBulk,
    fixWeight,
    toBulkItems,
};
export { getContainerMap, isCycle };
export { calculateEncumbrance };
export { identifyItem, IdentifyAlchemyDCs, IdentifyMagicDCs };
export { addKit };
export {
    getPropertyRuneModifiers,
    getStrikingDice,
    hasGhostTouchRune,
    getArmorBonus,
    getAttackBonus,
    getResiliencyBonus,
};
