/**
 * Single-module export for all Enitity classes
 */

import '../styles/actor/_index.scss';
import '../styles/item/_index.scss';

/** Actor */
export { PF2EActor, PF2EHazard, PF2EVehicle, SKILL_DICTIONARY, SKILL_EXPANDED, TokenPF2e } from './actor/actor';
export { PF2ECharacter } from './actor/character';
export { PF2ENPC } from './actor/npc';
export { PF2EFamiliar } from './actor/familiar';
export { PF2ELoot, LootTransfer, LootTransferData } from './actor/loot';
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
} from './actor/actorDataDefinitions';

/** Item */
export { PF2EItem } from './item/item';
export { PF2EPhysicalItem } from './item/physical';
export {
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
} from './item/dataDefinitions';

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
} from './item/bulk';
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
} from './item/treasure';
export { getContainerMap, isCycle } from './item/container';
export { calculateEncumbrance } from './item/encumbrance';
export { identifyItem, IdentifyAlchemyDCs, IdentifyMagicDCs } from './item/identification';
export { addKit } from './item/kits';
export {
    getPropertyRuneModifiers,
    getStrikingDice,
    hasGhostTouchRune,
    getArmorBonus,
    getAttackBonus,
    getResiliencyBonus,
} from './item/runes';
