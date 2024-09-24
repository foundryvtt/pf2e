import { ArmyPF2e, CharacterPF2e, FamiliarPF2e, HazardPF2e, LootPF2e, NPCPF2e, PartyPF2e, VehiclePF2e } from "@actor";
import { SenseAcuity } from "@actor/creature/types.ts";
import { LANGUAGES, SENSE_TYPES } from "@actor/creature/values.ts";
import type { ActorType, AttributeString, SkillSlug } from "@actor/types.ts";
import { MOVEMENT_TYPES } from "@actor/values.ts";
import {
    AbilityItemPF2e,
    AfflictionPF2e,
    AncestryPF2e,
    ArmorPF2e,
    BackgroundPF2e,
    BookPF2e,
    CampaignFeaturePF2e,
    ClassPF2e,
    ConditionPF2e,
    ConsumablePF2e,
    ContainerPF2e,
    DeityPF2e,
    EffectPF2e,
    EquipmentPF2e,
    FeatPF2e,
    HeritagePF2e,
    KitPF2e,
    LorePF2e,
    MeleePF2e,
    ShieldPF2e,
    SpellPF2e,
    SpellcastingEntryPF2e,
    TreasurePF2e,
    WeaponPF2e,
} from "@item";
import { ArmorCategory, ArmorGroup } from "@item/armor/types.ts";
import { ConditionSlug } from "@item/condition/types.ts";
import { CONSUMABLE_CATEGORIES } from "@item/consumable/values.ts";
import { DeityDomain } from "@item/deity/types.ts";
import { FeatOrFeatureCategory } from "@item/feat/index.ts";
import { PreciousMaterialGrade } from "@item/physical/types.ts";
import { MeleeWeaponGroup, WeaponCategory, WeaponGroup, WeaponReloadTime } from "@item/weapon/types.ts";
import { Size } from "@module/data.ts";
import { JournalSheetPF2e } from "@module/journal-entry/sheet.ts";
import { configFromLocalization, sluggify } from "@util";
import * as R from "remeda";
import {
    damageCategories,
    damageRollFlavors,
    damageTypes,
    energyDamageTypes,
    materialDamageEffects,
    physicalDamageTypes,
} from "./damage.ts";
import { immunityTypes, resistanceTypes, weaknessTypes } from "./iwr.ts";
import {
    actionTraits,
    ancestryTraits,
    armorTraits,
    classTraits,
    consumableTraits,
    creatureTraits,
    damageTraits,
    effectTraits,
    elementTraits,
    equipmentTraits,
    featTraits,
    hazardTraits,
    kingmakerTraits,
    magicTraditions,
    npcAttackTraits,
    otherArmorTags,
    otherConsumableTags,
    otherWeaponTags,
    preciousMaterials,
    shieldTraits,
    spellTraits,
    traitDescriptions,
    vehicleTraits,
    weaponTraits,
} from "./traits.ts";

export type StatusEffectIconTheme = "default" | "blackWhite";

const actorTypes: Record<ActorType, string> = {
    army: "TYPES.Actor.army",
    character: "TYPES.Actor.character",
    familiar: "TYPES.Actor.familiar",
    hazard: "TYPES.Actor.hazard",
    loot: "TYPES.Actor.loot",
    npc: "TYPES.Actor.npc",
    party: "TYPES.Actor.party",
    vehicle: "TYPES.Actor.vehicle",
};

const abilities: Record<AttributeString, string> = {
    str: "PF2E.AbilityStr",
    dex: "PF2E.AbilityDex",
    con: "PF2E.AbilityCon",
    int: "PF2E.AbilityInt",
    wis: "PF2E.AbilityWis",
    cha: "PF2E.AbilityCha",
};

// Senses
const senses = R.mapToObj(Array.from(SENSE_TYPES), (t) => [
    t,
    `PF2E.Actor.Creature.Sense.Type.${sluggify(t, { camel: "bactrian" })}`,
]);

const senseAcuities: Record<SenseAcuity, string> = {
    imprecise: "PF2E.Actor.Creature.Sense.Acuity.Imprecise",
    precise: "PF2E.Actor.Creature.Sense.Acuity.Precise",
    vague: "PF2E.Actor.Creature.Sense.Acuity.Vague",
};

/** Non-detection- and attitude- related conditions added to the Token HUD */
const tokenHUDConditions = {
    blinded: "PF2E.ConditionTypeBlinded",
    broken: "PF2E.ConditionTypeBroken",
    clumsy: "PF2E.ConditionTypeClumsy",
    concealed: "PF2E.ConditionTypeConcealed",
    confused: "PF2E.ConditionTypeConfused",
    controlled: "PF2E.ConditionTypeControlled",
    dazzled: "PF2E.ConditionTypeDazzled",
    deafened: "PF2E.ConditionTypeDeafened",
    doomed: "PF2E.ConditionTypeDoomed",
    drained: "PF2E.ConditionTypeDrained",
    dying: "PF2E.ConditionTypeDying",
    encumbered: "PF2E.ConditionTypeEncumbered",
    enfeebled: "PF2E.ConditionTypeEnfeebled",
    fascinated: "PF2E.ConditionTypeFascinated",
    fatigued: "PF2E.ConditionTypeFatigued",
    fleeing: "PF2E.ConditionTypeFleeing",
    frightened: "PF2E.ConditionTypeFrightened",
    grabbed: "PF2E.ConditionTypeGrabbed",
    hidden: "PF2E.ConditionTypeHidden",
    immobilized: "PF2E.ConditionTypeImmobilized",
    invisible: "PF2E.ConditionTypeInvisible",
    "off-guard": "PF2E.ConditionTypeOffGuard",
    paralyzed: "PF2E.ConditionTypeParalyzed",
    "persistent-damage": "PF2E.ConditionTypePersistent",
    petrified: "PF2E.ConditionTypePetrified",
    prone: "PF2E.ConditionTypeProne",
    quickened: "PF2E.ConditionTypeQuickened",
    restrained: "PF2E.ConditionTypeRestrained",
    sickened: "PF2E.ConditionTypeSickened",
    slowed: "PF2E.ConditionTypeSlowed",
    stunned: "PF2E.ConditionTypeStunned",
    stupefied: "PF2E.ConditionTypeStupefied",
    unconscious: "PF2E.ConditionTypeUnconscious",
    undetected: "PF2E.ConditionTypeUndetected",
    wounded: "PF2E.ConditionTypeWounded",
};

const conditionTypes: Record<ConditionSlug, string> = {
    ...tokenHUDConditions,
    cursebound: "PF2E.ConditionTypeCursebound",
    friendly: "PF2E.ConditionTypeFriendly",
    helpful: "PF2E.ConditionTypeHelpful",
    hostile: "PF2E.ConditionTypeHostile",
    indifferent: "PF2E.ConditionTypeIndifferent",
    malevolence: "PF2E.ConditionTypeMalevolence",
    observed: "PF2E.ConditionTypeObserved",
    unfriendly: "PF2E.ConditionTypeUnfriendly",
    unnoticed: "PF2E.ConditionTypeUnnoticed",
};

const armorCategories: Record<ArmorCategory, string> = {
    unarmored: "PF2E.ArmorTypeUnarmored",
    light: "PF2E.ArmorTypeLight",
    medium: "PF2E.ArmorTypeMedium",
    heavy: "PF2E.ArmorTypeHeavy",
    "light-barding": "PF2E.Item.Armor.Category.light-barding",
    "heavy-barding": "PF2E.Item.Armor.Category.heavy-barding",
};

const armorGroups: Record<ArmorGroup, string> = {
    composite: "PF2E.ArmorGroupComposite",
    chain: "PF2E.ArmorGroupChain",
    cloth: "PF2E.ArmorGroupCloth",
    leather: "PF2E.ArmorGroupLeather",
    plate: "PF2E.ArmorGroupPlate",
    skeletal: "PF2E.ArmorGroupSkeletal",
    wood: "PF2E.ArmorGroupWood",
};

const weaponCategories: Record<WeaponCategory, string> = {
    simple: "PF2E.WeaponTypeSimple",
    martial: "PF2E.WeaponTypeMartial",
    advanced: "PF2E.WeaponTypeAdvanced",
    unarmed: "PF2E.WeaponTypeUnarmed",
};

const baseArmorTypes = R.mapValues(EN_JSON.PF2E.Item.Armor.Base, (_v, slug) => `PF2E.Item.Armor.Base.${slug}`);
const baseShieldTypes = R.mapValues(EN_JSON.PF2E.Item.Shield.Base, (_v, slug) => `PF2E.Item.Shield.Base.${slug}`);
const baseWeaponTypes = R.mapValues(EN_JSON.PF2E.Weapon.Base, (_v, slug) => `PF2E.Weapon.Base.${slug}`);

/** Base weapon types that are considered equivalent for all rules purposes */
const equivalentWeapons = {
    "composite-longbow": "longbow",
    "composite-shortbow": "shortbow",
    "big-boom-gun": "hand-cannon",
    "spoon-gun": "hand-cannon",
} as const;

const preciousMaterialGrades: Record<PreciousMaterialGrade, string> = {
    low: "PF2E.PreciousMaterialLowGrade",
    standard: "PF2E.PreciousMaterialStandardGrade",
    high: "PF2E.PreciousMaterialHighGrade",
};

const meleeWeaponGroups: Record<MeleeWeaponGroup, string> = {
    axe: "PF2E.WeaponGroupAxe",
    brawling: "PF2E.WeaponGroupBrawling",
    club: "PF2E.WeaponGroupClub",
    dart: "PF2E.WeaponGroupDart",
    flail: "PF2E.WeaponGroupFlail",
    hammer: "PF2E.WeaponGroupHammer",
    knife: "PF2E.WeaponGroupKnife",
    pick: "PF2E.WeaponGroupPick",
    polearm: "PF2E.WeaponGroupPolearm",
    shield: "PF2E.WeaponGroupShield",
    spear: "PF2E.WeaponGroupSpear",
    sword: "PF2E.WeaponGroupSword",
};

const weaponGroups: Record<WeaponGroup, string> = {
    ...meleeWeaponGroups,
    bomb: "PF2E.WeaponGroupBomb",
    bow: "PF2E.WeaponGroupBow",
    crossbow: "PF2E.WeaponGroupCrossbow",
    firearm: "PF2E.WeaponGroupFirearm",
    sling: "PF2E.WeaponGroupSling",
};

// Creature and Equipment Sizes
const sizeTypes: Record<Size, string> = {
    tiny: "PF2E.ActorSizeTiny",
    sm: "PF2E.ActorSizeSmall",
    med: "PF2E.ActorSizeMedium",
    lg: "PF2E.ActorSizeLarge",
    huge: "PF2E.ActorSizeHuge",
    grg: "PF2E.ActorSizeGargantuan",
};

const speedTypes = R.mapToObj(MOVEMENT_TYPES, (t) => [
    t,
    `PF2E.Actor.Speed.Type.${sluggify(t, { camel: "bactrian" })}`,
]);

const featCategories: Record<FeatOrFeatureCategory, string> = {
    ancestry: "PF2E.FeatTypeAncestry",
    ancestryfeature: "PF2E.FeatTypeAncestryfeature",
    class: "PF2E.FeatTypeClass",
    classfeature: "PF2E.FeatTypeClassfeature",
    skill: "PF2E.FeatTypeSkill",
    general: "PF2E.FeatTypeGeneral",
    bonus: "PF2E.FeatTypeBonus",
    pfsboon: "PF2E.FeatTypePfsboon",
    deityboon: "PF2E.FeatTypeDeityboon",
    curse: "PF2E.FeatTypeCurse",
};

const creatureTypes = R.pick(creatureTraits, [
    "aberration",
    "animal",
    "astral",
    "beast",
    "celestial",
    "construct",
    "dragon",
    "dream",
    "elemental",
    "ethereal",
    "fey",
    "fiend",
    "fungus",
    "giant",
    "humanoid",
    "monitor",
    "ooze",
    "petitioner",
    "plant",
    "shadow",
    "spirit",
    "time",
    "vitality",
    "void",
    "undead",
]);

const consumableCategories = R.mapToObj(Array.from(CONSUMABLE_CATEGORIES), (c) => [
    c,
    `PF2E.Item.Consumable.Category.${c}`,
]);

const deityDomains = R.mapToObj(Object.keys(EN_JSON.PF2E.Item.Deity.Domain), (key) => {
    const label = `PF2E.Item.Deity.Domain.${key}.Label`;
    const description = `PF2E.Item.Deity.Domain.${key}.Description`;
    return [sluggify(key) as DeityDomain, { label, description }];
});

const weaponReload: Record<WeaponReloadTime, string> = {
    "-": "—", // Reload value for thrown weapons
    0: "0",
    1: "1",
    2: "2",
    3: "3",
    10: "PF2E.Item.Weapon.Reload.OneMinute",
};

export const PF2ECONFIG = {
    defaultPartyId: "xxxPF2ExPARTYxxx",
    chatDamageButtonShieldToggle: false,

    statusEffects: {
        lastIconTheme: "default" as StatusEffectIconTheme,
        iconDir: "systems/pf2e/icons/conditions/",
        conditions: tokenHUDConditions,
    },

    levels: {
        1: "PF2E.Level1",
        2: "PF2E.Level2",
        3: "PF2E.Level3",
        4: "PF2E.Level4",
        5: "PF2E.Level5",
        6: "PF2E.Level6",
        7: "PF2E.Level7",
        8: "PF2E.Level8",
        9: "PF2E.Level9",
        10: "PF2E.Level10",
        11: "PF2E.Level11",
        12: "PF2E.Level12",
        13: "PF2E.Level13",
        14: "PF2E.Level14",
        15: "PF2E.Level15",
        16: "PF2E.Level16",
        17: "PF2E.Level17",
        18: "PF2E.Level18",
        19: "PF2E.Level19",
        20: "PF2E.Level20",
    },

    abilities,

    dcAdjustments: {
        "incredibly-easy": "PF2E.DCAdjustmentIncrediblyEasy",
        "very-easy": "PF2E.DCAdjustmentVeryEasy",
        easy: "PF2E.DCAdjustmentEasy",
        normal: "PF2E.DCAdjustmentNormal",
        hard: "PF2E.DCAdjustmentHard",
        "very-hard": "PF2E.DCAdjustmentVeryHard",
        "incredibly-hard": "PF2E.DCAdjustmentIncrediblyHard",
    },

    checkDCs: configFromLocalization(EN_JSON.PF2E.Check.DC, "PF2E.Check.DC"),

    saves: {
        fortitude: "PF2E.SavesFortitude",
        reflex: "PF2E.SavesReflex",
        will: "PF2E.SavesWill",
    },

    savingThrowDefaultAttributes: {
        fortitude: "con",
        reflex: "dex",
        will: "wis",
    } as const,

    currencies: {
        pp: "PF2E.CurrencyPP",
        gp: "PF2E.CurrencyGP",
        sp: "PF2E.CurrencySP",
        cp: "PF2E.CurrencyCP",
    },

    preciousMaterialGrades,
    preciousMaterials,

    accessoryPropertyRunes: {
        called: "PF2E.AccessoryPropertyRuneCalled",
        dragonsBreath: "PF2E.AccessoryPropertyRuneDragonsBreath",
        paired: "PF2E.AccessoryPropertyRunePaired",
        greaterPaired: "PF2E.AccessoryPropertyRuneGreaterPaired",
        majorPaired: "PF2E.AccessoryPropertyRuneMajorPaired",
        presentable: "PF2E.AccessoryPropertyRunePresentable",
        snagging: "PF2E.AccessoryPropertyRuneSnagging",
        softLanding: "PF2E.AccessoryPropertyRuneSoftLanding",
        spellBastion: "PF2E.AccessoryPropertyRuneSpellBastion",
        windCatcher: "PF2E.AccessoryPropertyRuneWindCatcher",
        greaterWindCatcher: "PF2E.AccessoryPropertyRuneGreaterWindCatcher",
    },
    damageTraits,
    damageTypes,
    damageRollFlavors,
    damageCategories,
    energyDamageTypes,
    materialDamageEffects,
    physicalDamageTypes,
    resistanceTypes,

    stackGroups: {
        arrows: "PF2E.StackGroupArrows",
        blowgunDarts: "PF2E.StackGroupBlowgunDarts",
        bolts: "PF2E.StackGroupBolts",
        coins: "PF2E.StackGroupCoins",
        gems: "PF2E.StackGroupGems",
        rounds5: "PF2E.StackGroupRounds5",
        rounds10: "PF2E.StackGroupRounds10",
        slingBullets: "PF2E.StackGroupSlingBullets",
        sprayPellets: "PF2E.StackGroupSprayPellets",
        woodenTaws: "PF2E.StackGroupWoodenTaws",
    },

    weaknessTypes,
    weaponCategories,
    weaponGroups,

    meleeWeaponGroups,

    baseArmorTypes,
    baseShieldTypes,
    baseWeaponTypes,
    equivalentWeapons,

    weaponDescriptions: {
        club: "PF2E.WeaponDescriptionClub",
        knife: "PF2E.WeaponDescriptionKnife",
        brawling: "PF2E.WeaponDescriptionBrawling",
        spear: "PF2E.WeaponDescriptionSpear",
        sword: "PF2E.WeaponDescriptionSword",
        axe: "PF2E.WeaponDescriptionAxe",
        flail: "PF2E.WeaponDescriptionFlail",
        polearm: "PF2E.WeaponDescriptionPolearm",
        pick: "PF2E.WeaponDescriptionPick",
        hammer: "PF2E.WeaponDescriptionHammer",
        shield: "PF2E.WeaponDescriptionShield",
        dart: "PF2E.WeaponDescriptionDart",
        bow: "PF2E.WeaponDescriptionBow",
        sling: "PF2E.WeaponDescriptionSling",
        bomb: "PF2E.WeaponDescriptionBomb",
    },

    usages: {
        "affixed-to-a-creature": "PF2E.TraitAffixedToCreature",
        "affixed-to-a-magical-staff": "PF2E.TraitAffixedToMagicalStaff",
        "affixed-to-a-metal-weapon": "PF2E.TraitAffixedToAMetalWeapon",
        "affixed-to-a-ranged-weapon": "PF2E.TraitAffixedToARangedWeapon",
        "affixed-to-a-shield": "PF2E.TraitAffixedToAShield",
        "affixed-to-a-shield-or-weapon": "PF2E.TraitAffixedToAShieldOrWeapon",
        "affixed-to-a-thrown-weapon": "PF2E.TraitAffixedToThrownWeapon",
        "affixed-to-a-two-handed-firearm-or-crossbow": "PF2E.TraitAffixedToATwoHandedFirearmOrCrossbow",
        "affixed-to-an-innovation": "PF2E.TraitAffixedToInnovation",
        "affixed-to-an-object-or-structure": "PF2E.TraitAffixedToObjectOrStructure",
        "affixed-to-armor": "PF2E.TraitAffixedToArmor",
        "affixed-to-medium-heavy-armor": "PF2E.TraitAffixedToMediumHeavyArmor",
        "affixed-to-medium-heavy-metal-armor": "PF2E.TraitAffixedToMediumHeavyMetalArmor",
        "affixed-to-armor-or-a-weapon": "PF2E.TraitAffixedToArmorOrAWeapon",
        "affixed-to-armor-or-travelers-clothing": "PF2E.TraitAffixedToArmorOrTravelersClothing",
        "affixed-to-crossbow-or-firearm": "PF2E.TraitAffixedToCrossbowOrFirearm",
        "affixed-to-firearm": "PF2E.TraitAffixedToFirearm",
        "affixed-to-firearm-with-a-reload-of-1": "PF2E.TraitAffixedToFirearmWithAReloadOf1",
        "affixed-to-firearm-with-the-kickback-trait": "PF2E.TraitAffixedToFirearmWithTheKickbackTrait",
        "affixed-to-ground-in-10-foot-radius": "PF2E.TraitAffixedToGroundIn10FtRadius",
        "affixed-to-ground-in-20-foot-radius": "PF2E.TraitAffixedToGroundIn20FtRadius",
        "affixed-to-harness": "PF2E.TraitAffixedToHarness",
        "affixed-to-headgear": "PF2E.TraitAffixedToHeadgear",
        "affixed-to-instrument": "PF2E.TraitAffixedToInstrument",
        "affixed-to-load-bearing-wall-or-pillar": "PF2E.TraitAffixedToLoadBearingWallOrPillar",
        "affixed-to-melee-weapon": "PF2E.TraitAffixedToMeleeWeapon",
        "affixed-to-metal-weapon": "PF2E.TraitAffixedToMetalWeapon",
        "affixed-to-object-structure-or-creature": "PF2E.TraitAffixedToStructureObjectOrCreature",
        "affixed-to-the-ground": "PF2E.TraitAffixedToGround",
        "affixed-to-unarmored-defense-item": "PF2E.TraitAffixedToUnarmoredItem",
        "affixed-to-weapon": "PF2E.TraitAffixedToWeapon",
        "applied-to-a-basket-bag-or-other-container": "PF2E.TraitAppliedToBasketBagOrContainer",
        "applied-to-a-weapon": "PF2E.TraitAppliedToAWeapon",
        "applied-to-a-wind-powered-vehicle": "PF2E.TraitAppliedToAWindPoweredVehicle",
        "applied-to-a-non-injection-melee-weapon-piercing-damage":
            "PF2E.TraitAppliedToANoninjectionMeleePiercingWeapon",
        "applied-to-any-item-of-light-or-negligible-bulk": "PF2E.TraitAppliedToAnyItemOfLightOrNegligibleBulk",
        "applied-to-any-visible-article-of-clothing": "PF2E.TraitAppliedToAnyVisibleArticleOfClothing",
        "applied-to-armor": "PF2E.TraitAppliedToArmor",
        "applied-to-armor-or-unarmored-defense-clothing": "PF2E.TraitAppliedToArmorOrUnarmored",
        "applied-to-belt-cape-cloak-or-scarf": "PF2E.TraitAppliedToBeltCapeCloakOrScarf",
        "applied-to-boots-cape-cloak-or-umbrella": "PF2E.TraitAppliedToBootsCapeCloakOrUmbrella",
        "applied-to-buckler-shield": "PF2E.TraitAppliedToBucklerShield",
        "applied-to-dueling-cape-or-shield": "PF2E.TraitAppliedToDuelingCapeOrShield",
        "applied-to-footwear": "PF2E.TraitAppliedToFootwear",
        "applied-to-medium-heavy-armor": "PF2E.TraitAppliedToMediumHeavyArmor",
        "applied-to-shield": "PF2E.TraitAppliedToShield",
        "attached-to-a-thrown-weapon": "PF2E.TraitAttachedToAThrownWeapon",
        "attached-to-crossbow-or-firearm": "PF2E.TraitAttachedToCrossbowOrFirearm",
        "attached-to-crossbow-or-firearm-firing-mechanism": "PF2E.TraitAttachedToCrossbowOrFirearmFiringMechanism",
        "attached-to-crossbow-or-firearm-scope": "PF2E.TraitAttachedToCrossbowOrFirearmScope",
        "attached-to-firearm": "PF2E.TraitAttachedToFirearm",
        "attached-to-firearm-scope": "PF2E.TraitAttachedToFirearmScope",
        "attached-to-ships-bow": "PF2E.TraitAttachedToShipsBow",
        bonded: "PF2E.TraitBonded",
        carried: "PF2E.TraitCarried",
        "each-rune-applied-to-a-separate-item-that-has-pockets":
            "PF2E.TraitEachRuneAppliedToASeparateItemThatHasPockets",
        "etched-onto-a-weapon": "PF2E.TraitEtchedOntoAWeapon",
        "etched-onto-a-shield": "PF2E.TraitEtchedOntoAShield",
        "etched-onto-armor": "PF2E.TraitEtchedOntoArmor",
        "etched-onto-heavy-armor": "PF2E.TraitEtchedOntoHeavyArmor",
        "etched-onto-light-armor": "PF2E.TraitEtchedOntoLightArmor",
        "etched-onto-metal-armor": "PF2E.TraitEtchedOntoMetalArmor",
        "etched-onto-clan-dagger": "PF2E.TraitEtchedOntoAClanDagger",
        "etched-onto-lm-nonmetal-armor": "PF2E.TraitEtchedOntoLightMedNMArmor",
        "etched-onto-med-heavy-armor": "PF2E.TraitEtchedOntoMedHeavyArmor",
        "etched-onto-medium-heavy-metal-armor": "PF2E.TraitEtchedOntoMediumHeavyMetalArmor",
        "etched-onto-bludgeoning-weapon": "PF2E.TraitEtchedOntoABludgeoningWeapon",
        "etched-onto-melee-weapon": "PF2E.TraitEtchedOntoAMeleeWeapon",
        "etched-onto-slashing-melee-weapon": "PF2E.TraitEtchedOntoASlashingMeleeWeapon",
        "etched-onto-piercing-or-slashing-melee-weapon": "PF2E.TraitEtchedOntoAPiercingOrSlashingMeleeWeapon",
        "etched-onto-piercing-or-slashing-weapon": "PF2E.TraitEtchedOntoAPiercingOrSlashingWeapon",
        "etched-onto-weapon-wo-anarchic-rune": "PF2E.TraitEtchedOntoAWeaponWOAxiomaticRune",
        "etched-onto-weapon-wo-axiomatic-rune": "PF2E.TraitEtchedOntoAWeaponWOAnarchicRune",
        "etched-onto-weapon-wo-unholy-rune": "PF2E.TraitEtchedOntoAWeaponWOHolyRune",
        "etched-onto-weapon-wo-holy-rune": "PF2E.TraitEtchedOntoAWeaponWOUnholyRune",
        "etched-onto-melee-weapon-monk": "PF2E.TraitEtchedOntoAMeleeWeaponMonk",
        "etched-onto-thrown-weapon": "PF2E.TraitEtchedOntoAThrownWeapon",
        "held-in-one-hand": "PF2E.TraitHeldOneHand",
        "held-in-one-hand-or-free-standing": "PF2E.TraitHeldOneHandFreeStanding",
        "held-in-one-or-two-hands": "PF2E.TraitHeldOneTwoHands",
        "held-in-two-hands": "PF2E.TraitHeldTwoHands",
        implanted: "PF2E.TraitImplanted",
        other: "Other",
        "sewn-into-clothing": "PF2E.TraitSewnIntoClothing",
        "tattooed-on-the-body": "PF2E.TraitTattooedOnTheBody",
        touched: "PF2E.TraitTouched",
        worn: "PF2E.TraitWorn",
        wornamulet: "PF2E.TraitWornAmulet",
        wornanklets: "PF2E.TraitWornAnklets",
        wornarmbands: "PF2E.TraitWornArmbands",
        wornbackpack: "PF2E.TraitWornBackpack",
        wornbarding: "PF2E.TraitWornBarding",
        wornbelt: "PF2E.TraitWornBelt",
        wornbeltpouch: "PF2E.TraitWornBeltPouch",
        wornboots: "PF2E.TraitWornBoots",
        wornbracelet: "PF2E.TraitWornBracelet",
        wornbracers: "PF2E.TraitWornBracers",
        worncap: "PF2E.TraitWornCap",
        worncape: "PF2E.TraitWornCape",
        worncirclet: "PF2E.TraitWornCirclet",
        worncloak: "PF2E.TraitWornCloak",
        wornclothing: "PF2E.TraitWornClothing",
        worncollar: "PF2E.TraitWornCollar",
        worncrown: "PF2E.TraitWornCrown",
        wornepaulet: "PF2E.TraitWornEpaulet",
        worneyeglasses: "PF2E.TraitWornEyeglasses",
        worneyepiece: "PF2E.TraitWornEyepiece",
        wornfootwear: "PF2E.TraitWornFootwear",
        worngarment: "PF2E.TraitWornGarment",
        worngloves: "PF2E.TraitWornGloves",
        wornheadwear: "PF2E.TraitWornHeadwear",
        wornhorseshoes: "PF2E.TraitWornHorseshoes",
        wornmask: "PF2E.TraitWornMask",
        wornnecklace: "PF2E.TraitWornNecklace",
        wornonbelt: "PF2E.TraitWornOnBelt",
        wornoronehand: "PF2E.TraitWornOrOneHand",
        wornring: "PF2E.TraitWornRing",
        wornsaddle: "PF2E.TraitWornSaddle",
        wornsandles: "PF2E.TraitWornSandles",
        wornshoes: "PF2E.TraitWornShoes",
        wornwrist: "PF2E.TraitWornOnWrists",
        "worn-and-attached-to-two-weapons": "PF2E.TraitWornAndAttachedToTwoWeapons",
        "worn-under-armor": "PF2E.TraitWornUnderArmor",
    },

    magicTraditions,
    deityDomains,

    otherArmorTags,
    otherConsumableTags,
    otherWeaponTags,

    actionTraits,
    ancestryTraits,
    armorTraits,
    classTraits,
    consumableTraits,
    creatureTraits,
    effectTraits,
    elementTraits,
    equipmentTraits,
    featTraits,
    hazardTraits,
    kingmakerTraits,
    npcAttackTraits,
    shieldTraits,
    spellTraits,
    vehicleTraits,
    weaponTraits,

    rarityTraits: {
        common: "PF2E.TraitCommon",
        uncommon: "PF2E.TraitUncommon",
        rare: "PF2E.TraitRare",
        unique: "PF2E.TraitUnique",
    },

    traitsDescriptions: traitDescriptions,

    creatureTypes,

    weaponHands: {
        1: "PF2E.WeaponHands1",
        "1+": "PF2E.WeaponHands1Plus",
        2: "PF2E.WeaponHands2",
    },

    itemBonuses: {
        "-2": "PF2E.ItemBonusMinus2",
        0: "PF2E.ItemBonus0",
        1: "PF2E.ItemBonus1",
        2: "PF2E.ItemBonus2",
        3: "PF2E.ItemBonus3",
    },

    damageDice: {
        0: "0",
        1: "1",
        2: "2",
        3: "3",
        4: "4",
    },

    damageDie: {
        d4: "PF2E.DamageDieD4",
        d6: "PF2E.DamageDieD6",
        d8: "PF2E.DamageDieD8",
        d10: "PF2E.DamageDieD10",
        d12: "PF2E.DamageDieD12",
    },

    weaponMAP: {
        1: "-1/-2",
        2: "-2/-4",
        3: "-3/-6",
        4: "-4/-8",
        5: "-5/-10",
    },

    weaponReload,
    armorCategories,
    armorGroups,
    consumableCategories,
    identification: configFromLocalization(EN_JSON.PF2E.identification, "PF2E.identification"),

    preparationType: {
        prepared: "PF2E.PreparationTypePrepared",
        spontaneous: "PF2E.PreparationTypeSpontaneous",
        innate: "PF2E.PreparationTypeInnate",
        focus: "PF2E.TraitFocus",
        items: "PF2E.PreparationTypeItems",
        ritual: "PF2E.Item.Spell.Ritual.Label",
    },

    attitude: {
        hostile: "PF2E.Attitudes.Hostile",
        unfriendly: "PF2E.Attitudes.Unfriendly",
        indifferent: "PF2E.Attitudes.Indifferent",
        friendly: "PF2E.Attitudes.Friendly",
        helpful: "PF2E.Attitudes.Helpful",
    },

    skills: Object.freeze({
        acrobatics: { label: "PF2E.Skill.Acrobatics", attribute: "dex" },
        arcana: { label: "PF2E.Skill.Arcana", attribute: "int" },
        athletics: { label: "PF2E.Skill.Athletics", attribute: "str" },
        crafting: { label: "PF2E.Skill.Crafting", attribute: "int" },
        deception: { label: "PF2E.Skill.Deception", attribute: "cha" },
        diplomacy: { label: "PF2E.Skill.Diplomacy", attribute: "cha" },
        intimidation: { label: "PF2E.Skill.Intimidation", attribute: "cha" },
        medicine: { label: "PF2E.Skill.Medicine", attribute: "wis" },
        nature: { label: "PF2E.Skill.Nature", attribute: "wis" },
        occultism: { label: "PF2E.Skill.Occultism", attribute: "int" },
        performance: { label: "PF2E.Skill.Performance", attribute: "cha" },
        religion: { label: "PF2E.Skill.Religion", attribute: "wis" },
        society: { label: "PF2E.Skill.Society", attribute: "int" },
        stealth: { label: "PF2E.Skill.Stealth", attribute: "dex" },
        survival: { label: "PF2E.Skill.Survival", attribute: "wis" },
        thievery: { label: "PF2E.Skill.Thievery", attribute: "dex" },
    }) satisfies Record<SkillSlug, { label: string; attribute: AttributeString }>,

    featCategories,

    actionTypes: {
        action: "PF2E.ActionTypeAction",
        reaction: "PF2E.ActionTypeReaction",
        free: "PF2E.ActionTypeFree",
        passive: "PF2E.ActionTypePassive",
    },

    actionsNumber: {
        1: "PF2E.ActionNumber1",
        2: "PF2E.ActionNumber2",
        3: "PF2E.ActionNumber3",
    },

    actionCategories: {
        interaction: "PF2E.Item.Action.Category.Interaction",
        defensive: "PF2E.Item.Action.Category.Defensive",
        offensive: "PF2E.Item.Action.Category.Offensive",
        familiar: "PF2E.Item.Action.Category.Familiar",
    },

    frequencies: {
        turn: "PF2E.Duration.turn",
        round: "PF2E.Duration.round",
        PT1M: "PF2E.Duration.PT1M",
        PT10M: "PF2E.Duration.PT10M",
        PT1H: "PF2E.Duration.PT1H",
        PT24H: "PF2E.Duration.PT24H",
        day: "PF2E.Duration.day",
        P1W: "PF2E.Duration.P1W",
        P1M: "PF2E.Duration.P1M",
        P1Y: "PF2E.Duration.P1Y",
    },

    timeUnits: {
        rounds: "PF2E.Time.Unit.Rounds",
        minutes: "PF2E.Time.Unit.Minutes",
        hours: "PF2E.Time.Unit.Hours",
        days: "PF2E.Time.Unit.Days",
        unlimited: "PF2E.Time.Unit.Unlimited",
        encounter: "PF2E.Time.Unit.UntilEncounterEnds",
    },

    // Proficiency Multipliers
    proficiencyLevels: [
        "PF2E.ProficiencyLevel0", // untrained
        "PF2E.ProficiencyLevel1", // trained
        "PF2E.ProficiencyLevel2", // expert
        "PF2E.ProficiencyLevel3", // master
        "PF2E.ProficiencyLevel4", // legendary
    ] as const,

    proficiencyRanks: {
        untrained: "PF2E.ProficiencyLevel0",
        trained: "PF2E.ProficiencyLevel1",
        expert: "PF2E.ProficiencyLevel2",
        master: "PF2E.ProficiencyLevel3",
        legendary: "PF2E.ProficiencyLevel4",
    } as const,

    actorSizes: sizeTypes,

    actorTypes,

    speedTypes,

    prerequisitePlaceholders: {
        prerequisite1: "PF2E.Prerequisite1",
        prerequisite2: "PF2E.Prerequisite2",
        prerequisite3: "PF2E.Prerequisite3",
        prerequisite4: "PF2E.Prerequisite4",
        prerequisite5: "PF2E.Prerequisite5",
    },

    senses,

    senseAcuities,

    conditionTypes,

    pfsFactions: {
        EA: "PF2E.PFS.Factions.EA",
        GA: "PF2E.PFS.Factions.GA",
        HH: "PF2E.PFS.Factions.HH",
        VS: "PF2E.PFS.Factions.VS",
        RO: "PF2E.PFS.Factions.RO",
        VW: "PF2E.PFS.Factions.VW",
    },

    pfsSchools: {
        none: "PF2E.PFS.School.None",
        scrolls: "PF2E.PFS.School.Scrolls",
        spells: "PF2E.PFS.School.Spells",
        swords: "PF2E.PFS.School.Swords",
    },

    immunityTypes,

    languages: R.mapToObj(LANGUAGES, (l) => [l, `PF2E.Actor.Creature.Language.${l}`]),

    attackEffects: {
        grab: "PF2E.AttackEffectGrab",
        "improved-grab": "PF2E.AttackEffectImprovedGrab",
        constrict: "PF2E.AttackEffectConstrict",
        "greater-constrict": "PF2E.AttackEffectGreaterConstrict",
        knockdown: "PF2E.AttackEffectKnockdown",
        "improved-knockdown": "PF2E.AttackEffectImprovedKnockdown",
        push: "PF2E.AttackEffectPush",
        "improved-push": "PF2E.AttackEffectImprovedPush",
        trip: "PF2E.AttackEffectTrip",
    },

    // Year offsets relative to the current actual year
    worldClock: fu.mergeObject(configFromLocalization(EN_JSON.PF2E.WorldClock, "PF2E.WorldClock"), {
        AR: { yearOffset: 2700 },
        IC: { yearOffset: 5200 },
        AD: { yearOffset: -95 },
        CE: { yearOffset: 0 },
    }),

    /** Max speed for number of hexploration activities */
    hexplorationActivities: {
        10: 0.5,
        25: 1,
        40: 2,
        55: 3,
        Infinity: 4,
    },

    environmentFeatures: {
        crowd: "PF2E.Environment.Feature.Crowd",
        ice: "PF2E.Environment.Feature.Ice",
        lava: "PF2E.Environment.Feature.Lava",
        rubble: "PF2E.Environment.Feature.Rubble",
        sand: "PF2E.Environment.Feature.Sand",
        sewer: "PF2E.Environment.Feature.Sewer",
        snow: "PF2E.Environment.Feature.Snow",
    },

    environmentTypes: {
        aquatic: "PF2E.Environment.Type.Aquatic",
        arctic: "PF2E.Environment.Type.Arctic",
        desert: "PF2E.Environment.Type.Desert",
        forest: "PF2E.Environment.Type.Forest",
        mountain: "PF2E.Environment.Type.Mountain",
        plains: "PF2E.Environment.Type.Plains",
        swamp: "PF2E.Environment.Type.Swamp",
        underground: "PF2E.Environment.Type.Underground",
        urban: "PF2E.Environment.Type.Urban",
    },

    SETTINGS: {
        automation: {
            rulesBasedVision: {
                name: "PF2E.SETTINGS.Automation.RulesBasedVision.Name",
                hint: "PF2E.SETTINGS.Automation.RulesBasedVision.Hint",
            },
            iwr: {
                name: "PF2E.SETTINGS.Automation.IWR.Name",
                hint: "PF2E.SETTINGS.Automation.IWR.Hint",
            },
            effectExpiration: {
                name: "PF2E.SETTINGS.Automation.EffectExpiration.Name",
                hint: "PF2E.SETTINGS.Automation.EffectExpiration.Hint",
            },
            removeExpiredEffects: {
                name: "PF2E.SETTINGS.Automation.RemoveExpiredEffects.Name",
                hint: "PF2E.SETTINGS.Automation.RemoveExpiredEffects.Hint",
            },
            flankingDetection: {
                name: "PF2E.SETTINGS.Automation.FlankingDetection.Name",
                hint: "PF2E.SETTINGS.Automation.FlankingDetection.Hint",
            },
            actorsDeadAtZero: {
                name: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.Name",
                hint: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.Hint",
                neither: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.Neither",
                npcsOnly: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.NPCsOnly",
                both: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.Both",
            },
            lootableNPCs: {
                name: "PF2E.SETTINGS.Automation.LootableNPCs.Name",
                hint: "PF2E.SETTINGS.Automation.LootableNPCs.Hint",
            },
        },
        worldClock: {
            name: "PF2E.SETTINGS.WorldClock.Name",
            label: "PF2E.SETTINGS.WorldClock.Label",
            hint: "PF2E.SETTINGS.WorldClock.Hint",
            dateTheme: {
                name: "PF2E.SETTINGS.WorldClock.DateTheme.Name",
                hint: "PF2E.SETTINGS.WorldClock.DateTheme.Hint",
                AR: "PF2E.SETTINGS.WorldClock.DateTheme.AR",
                IC: "PF2E.SETTINGS.WorldClock.DateTheme.IC",
                AD: "PF2E.SETTINGS.WorldClock.DateTheme.AD",
                CE: "PF2E.SETTINGS.WorldClock.DateTheme.CE",
            },
            timeConvention: {
                name: "PF2E.SETTINGS.WorldClock.TimeConvention.Name",
                hint: "PF2E.SETTINGS.WorldClock.TimeConvention.Hint",
                twentyFour: "PF2E.SETTINGS.WorldClock.TimeConvention.TwentyFour",
                twelve: "PF2E.SETTINGS.WorldClock.TimeConvention.Twelve",
            },
            showClockButton: {
                name: "PF2E.SETTINGS.WorldClock.ShowClockButton.Name",
                hint: "PF2E.SETTINGS.WorldClock.ShowClockButton.Hint",
            },
            playersCanView: {
                name: "PF2E.SETTINGS.WorldClock.PlayersCanView.Name",
                hint: "PF2E.SETTINGS.WorldClock.PlayersCanView.Hint",
            },
            syncDarkness: {
                name: "PF2E.SETTINGS.WorldClock.SyncDarkness.Name",
                hint: "PF2E.SETTINGS.WorldClock.SyncDarkness.Hint",
            },
            syncDarknessScene: {
                name: "PF2E.SETTINGS.WorldClock.SyncDarknessScene.Name",
                hint: "PF2E.SETTINGS.WorldClock.SyncDarknessScene.Hint",
                enabled: "PF2E.SETTINGS.EnabledDisabled.Enabled",
                default: "PF2E.SETTINGS.EnabledDisabled.Default",
                disabled: "PF2E.SETTINGS.EnabledDisabled.Disabled",
            },
            worldCreatedOn: {
                name: "PF2E.SETTINGS.WorldClock.WorldCreatedOn.Name",
                hint: "PF2E.SETTINGS.WorldClock.WorldCreatedOn.Hint",
            },
        },
        CampaignFeats: {
            name: "PF2E.SETTINGS.CampaignFeats.Name",
            hint: "PF2E.SETTINGS.CampaignFeats.Hint",
        },
    },

    Actor: {
        documentClasses: {
            army: ArmyPF2e,
            character: CharacterPF2e,
            npc: NPCPF2e,
            hazard: HazardPF2e,
            loot: LootPF2e,
            familiar: FamiliarPF2e,
            party: PartyPF2e,
            vehicle: VehiclePF2e,
        },
    },

    Item: {
        documentClasses: {
            action: AbilityItemPF2e,
            affliction: AfflictionPF2e,
            ancestry: AncestryPF2e,
            armor: ArmorPF2e,
            background: BackgroundPF2e,
            backpack: ContainerPF2e,
            book: BookPF2e,
            campaignFeature: CampaignFeaturePF2e,
            class: ClassPF2e,
            condition: ConditionPF2e,
            consumable: ConsumablePF2e,
            deity: DeityPF2e,
            effect: EffectPF2e,
            equipment: EquipmentPF2e,
            feat: FeatPF2e,
            heritage: HeritagePF2e,
            kit: KitPF2e,
            lore: LorePF2e,
            melee: MeleePF2e,
            shield: ShieldPF2e,
            spell: SpellPF2e,
            spellcastingEntry: SpellcastingEntryPF2e,
            treasure: TreasurePF2e,
            weapon: WeaponPF2e,
        },
    },

    JournalEntry: { sheetClass: JournalSheetPF2e },

    Canvas: {
        darkness: {
            default: CONFIG.Canvas.darknessColor,
            gmVision: 0xd1ccff,
        },
    },
};
