import { CharacterPF2e, FamiliarPF2e, HazardPF2e, LootPF2e, NPCPF2e, PartyPF2e, VehiclePF2e } from "@actor";
import { SenseAcuity, SenseType } from "@actor/creature/sense.ts";
import { Alignment } from "@actor/creature/types.ts";
import { ActorType } from "@actor/data/index.ts";
import {
    ActionItemPF2e,
    AfflictionPF2e,
    AncestryPF2e,
    ArmorPF2e,
    BackgroundPF2e,
    BookPF2e,
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
    SpellcastingEntryPF2e,
    SpellPF2e,
    TreasurePF2e,
    WeaponPF2e,
} from "@item";
import { ConditionSlug } from "@item/condition/types.ts";
import { DeityDomain } from "@item/deity/types.ts";
import { FeatCategory } from "@item/feat/index.ts";
import { WEAPON_PROPERTY_RUNES } from "@item/physical/runes.ts";
import { PreciousMaterialGrade } from "@item/physical/types.ts";
import { MeleeWeaponGroup, WeaponGroup, WeaponPropertyRuneType, WeaponReloadTime } from "@item/weapon/types.ts";
import { Size } from "@module/data.ts";
import { JournalSheetPF2e } from "@module/journal-entry/sheet.ts";
import { configFromLocalization, sluggify } from "@util";
import enJSON from "static/lang/en.json";
import reEnJSON from "static/lang/re-en.json";
import { damageCategories, damageRollFlavors, damageTypes, materialDamageEffects } from "./damage.ts";
import { immunityTypes, resistanceTypes, weaknessTypes } from "./iwr.ts";
import {
    actionTraits,
    alignmentTraits,
    ancestryItemTraits,
    ancestryTraits,
    armorTraits,
    classTraits,
    consumableTraits,
    creatureTraits,
    damageTraits,
    equipmentTraits,
    featTraits,
    hazardTraits,
    magicSchools,
    magicTraditions,
    npcAttackTraits,
    otherArmorTags,
    otherConsumableTags,
    otherWeaponTags,
    preciousMaterials,
    spellOtherTraits,
    spellTraits,
    traitDescriptions,
    vehicleTraits,
    weaponTraits,
} from "./traits.ts";
import { AbilityString } from "@actor/types.ts";

export type StatusEffectIconTheme = "default" | "blackWhite";

const actorTypes: Record<ActorType, string> = {
    character: "TYPES.Actor.character",
    familiar: "TYPES.Actor.familiar",
    hazard: "TYPES.Actor.hazard",
    loot: "TYPES.Actor.loot",
    npc: "TYPES.Actor.npc",
    party: "TYPES.Actor.party",
    vehicle: "TYPES.Actor.vehicle",
};

const abilities: Record<AbilityString, string> = {
    str: "PF2E.AbilityStr",
    dex: "PF2E.AbilityDex",
    con: "PF2E.AbilityCon",
    int: "PF2E.AbilityInt",
    wis: "PF2E.AbilityWis",
    cha: "PF2E.AbilityCha",
};

// Senses
const senses: Record<SenseType, string> = {
    darkvision: "PF2E.Actor.Creature.Sense.Type.Darkvision",
    echolocation: "PF2E.Actor.Creature.Sense.Type.Echolocation",
    greaterDarkvision: "PF2E.Actor.Creature.Sense.Type.GreaterDarkvision",
    heatsight: "PF2E.Actor.Creature.Sense.Type.Heatsight",
    lifesense: "PF2E.Actor.Creature.Sense.Type.Lifesense",
    lowLightVision: "PF2E.Actor.Creature.Sense.Type.LowLightVision",
    motionsense: "PF2E.Actor.Creature.Sense.Type.Motionsense",
    scent: "PF2E.Actor.Creature.Sense.Type.Scent",
    seeInvisibility: "PF2E.Actor.Creature.Sense.Type.SeeInvisibility",
    spiritsense: "PF2E.Actor.Creature.Sense.Type.Spiritsense",
    thoughtsense: "PF2E.Actor.Creature.Sense.Type.Thoughtsense",
    tremorsense: "PF2E.Actor.Creature.Sense.Type.Tremorsense",
    wavesense: "PF2E.Actor.Creature.Sense.Type.Wavesense",
};

// Sense acuity
const senseAcuity: Record<SenseAcuity, string> = {
    imprecise: "PF2E.Actor.Creature.Sense.Acuity.Imprecise",
    precise: "PF2E.Actor.Creature.Sense.Acuity.Precise",
    vague: "PF2E.Actor.Creature.Sense.Acuity.Vague",
};

const weaponPropertyRunes = {
    ...Object.entries(WEAPON_PROPERTY_RUNES).reduce((accumulated, [slug, rune]) => {
        return { ...accumulated, [slug]: rune.name };
    }, {} as Record<WeaponPropertyRuneType, string>),
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
    "flat-footed": "PF2E.ConditionTypeFlatFooted",
    fleeing: "PF2E.ConditionTypeFleeing",
    frightened: "PF2E.ConditionTypeFrightened",
    grabbed: "PF2E.ConditionTypeGrabbed",
    hidden: "PF2E.ConditionTypeHidden",
    immobilized: "PF2E.ConditionTypeImmobilized",
    invisible: "PF2E.ConditionTypeInvisible",
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
    friendly: "PF2E.ConditionTypeFriendly",
    helpful: "PF2E.ConditionTypeHelpful",
    hostile: "PF2E.ConditionTypeHostile",
    indifferent: "PF2E.ConditionTypeIndifferent",
    observed: "PF2E.ConditionTypeObserved",
    unfriendly: "PF2E.ConditionTypeUnfriendly",
    unnoticed: "PF2E.ConditionTypeUnnoticed",
};

const weaponCategories = {
    simple: "PF2E.WeaponTypeSimple",
    martial: "PF2E.WeaponTypeMartial",
    advanced: "PF2E.WeaponTypeAdvanced",
    unarmed: "PF2E.WeaponTypeUnarmed",
};

const baseArmorTypes = Object.keys(enJSON.PF2E.Item.Armor.Base).reduce(
    (map, slug) => ({
        ...map,
        [slug]: `PF2E.Item.Armor.Base.${slug}`,
    }),
    {} as Record<keyof typeof enJSON.PF2E.Item.Armor.Base, string>
);

const baseWeaponTypes = Object.keys(enJSON.PF2E.Weapon.Base).reduce(
    (map, slug) => ({
        ...map,
        [slug]: `PF2E.Weapon.Base.${slug}`,
    }),
    {} as Record<keyof typeof enJSON.PF2E.Weapon.Base, string>
);

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

const featCategories: Record<FeatCategory, string> = {
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

const alignments: Record<Alignment, string> = {
    LG: "PF2E.AlignmentLG",
    NG: "PF2E.AlignmentNG",
    CG: "PF2E.AlignmentCG",
    LN: "PF2E.AlignmentLN",
    N: "PF2E.AlignmentN",
    CN: "PF2E.AlignmentCN",
    LE: "PF2E.AlignmentLE",
    NE: "PF2E.AlignmentNE",
    CE: "PF2E.AlignmentCE",
};

const deityDomains = Object.keys(enJSON.PF2E.Item.Deity.Domain).reduce((domains, key) => {
    const slug = sluggify(key);
    const casedKey = sluggify(key, { camel: "bactrian" });
    return {
        ...domains,
        [slug]: {
            label: `PF2E.Item.Deity.Domain.${casedKey}.Label`,
            description: `PF2E.Item.Deity.Domain.${casedKey}.Description`,
        },
    };
}, {} as Record<DeityDomain, { label: string; description: string }>);

const weaponReload: Record<WeaponReloadTime, string> = {
    "-": "—", // Reload value for thrown weapons
    0: "0",
    1: "1",
    2: "2",
    3: "3",
    10: "PF2E.Item.Weapon.Reload.OneMinute",
};

export const PF2ECONFIG = {
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

    attributes: {
        perception: "PF2E.PerceptionLabel",
        stealth: "PF2E.StealthLabel",
        initiative: "PF2E.PerceptionLabel",
    },

    dcAdjustments: {
        "incredibly-easy": "PF2E.DCAdjustmentIncrediblyEasy",
        "very-easy": "PF2E.DCAdjustmentVeryEasy",
        easy: "PF2E.DCAdjustmentEasy",
        normal: "PF2E.DCAdjustmentNormal",
        hard: "PF2E.DCAdjustmentHard",
        "very-hard": "PF2E.DCAdjustmentVeryHard",
        "incredibly-hard": "PF2E.DCAdjustmentIncrediblyHard",
    },

    checkDCs: configFromLocalization(enJSON.PF2E.Check.DC, "PF2E.Check.DC"),

    skills: {
        acr: "PF2E.SkillAcr",
        arc: "PF2E.SkillArc",
        ath: "PF2E.SkillAth",
        cra: "PF2E.SkillCra",
        dec: "PF2E.SkillDec",
        dip: "PF2E.SkillDip",
        itm: "PF2E.SkillItm",
        med: "PF2E.SkillMed",
        nat: "PF2E.SkillNat",
        occ: "PF2E.SkillOcc",
        prf: "PF2E.SkillPrf",
        rel: "PF2E.SkillRel",
        soc: "PF2E.SkillSoc",
        ste: "PF2E.SkillSte",
        sur: "PF2E.SkillSur",
        thi: "PF2E.SkillThi",
    },

    saves: {
        fortitude: "PF2E.SavesFortitude",
        reflex: "PF2E.SavesReflex",
        will: "PF2E.SavesWill",
    },

    savingThrowDefaultAbilities: {
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

    armorPotencyRunes: {
        "1": "PF2E.ArmorPotencyRune1",
        "2": "PF2E.ArmorPotencyRune2",
        "3": "PF2E.ArmorPotencyRune3",
        "4": "PF2E.ArmorPotencyRune4",
    },

    armorResiliencyRunes: {
        resilient: "PF2E.ArmorResilientRune",
        greaterResilient: "PF2E.ArmorGreaterResilientRune",
        majorResilient: "PF2E.ArmorMajorResilientRune",
    },
    armorPropertyRunes: {
        ready: "PF2E.ArmorPropertyRuneReady",
        slick: "PF2E.ArmorPropertyRuneSlick",
        shadow: "PF2E.ArmorPropertyRuneShadow",
        glamered: "PF2E.ArmorPropertyRuneGlamered",
        acidResistant: "PF2E.ArmorPropertyRuneAcidResistant",
        coldResistant: "PF2E.ArmorPropertyRuneColdResistant",
        electricityResistant: "PF2E.ArmorPropertyRuneElectricityResistant",
        fireResistant: "PF2E.ArmorPropertyRuneFireResistant",
        greaterSlick: "PF2E.ArmorPropertyRuneGreaterSlick",
        invisibility: "PF2E.ArmorPropertyRuneInvisibility",
        sinisterKnight: "PF2E.ArmorPropertyRuneSinisterKnight",
        greaterDread: "PF2E.ArmorPropertyRuneGreaterDread",
        greaterReady: "PF2E.ArmorPropertyRuneGreaterReady",
        greaterShadow: "PF2E.ArmorPropertyRuneGreaterShadow",
        greaterInvisibility: "PF2E.ArmorPropertyRuneGreaterInvisibility",
        greaterAcidResistant: "PF2E.ArmorPropertyRuneGreaterAcidResistant",
        greaterColdResistant: "PF2E.ArmorPropertyRuneGreaterColdResistant",
        greaterElectricityResistant: "PF2E.ArmorPropertyRuneGreaterElectricityResistant",
        greaterFireResistant: "PF2E.ArmorPropertyRuneGreaterFireResistant",
        fortification: "PF2E.ArmorPropertyRuneFortification",
        winged: "PF2E.ArmorPropertyRuneWinged",
        rockBraced: "PF2E.ArmorPropertyRuneRockBraced",
        soaring: "PF2E.ArmorPropertyRuneSoaring",
        antimagic: "PF2E.ArmorPropertyRuneAntimagic",
        majorSlick: "PF2E.ArmorPropertyRuneMajorSlick",
        ethereal: "PF2E.ArmorPropertyRuneEthereal",
        majorShadow: "PF2E.ArmorPropertyRuneMajorShadow",
        moderateDread: "PF2E.ArmorPropertyRuneModerateDread",
        greaterFortification: "PF2E.ArmorPropertyRuneGreaterFortification",
        greaterWinged: "PF2E.ArmorPropertyRuneGreaterWinged",
        deathless: "PF2E.ArmorPropertyRuneDeathless",
        dread: "PF2E.ArmorPropertyRuneDread",
        bitter: "PF2E.ArmorPropertyRuneBitter",
        stanching: "PF2E.ArmorPropertyRuneStanching",
        greaterStanching: "PF2E.ArmorPropertyRuneGreaterStanching",
        majorStanching: "PF2E.ArmorPropertyRuneMajorStanching",
        trueStanching: "PF2E.ArmorPropertyRuneTrueStanching",
        implacable: "PF2E.ArmorPropertyRuneImplacable",
    },
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
    weaponPotencyRunes: {
        1: "PF2E.WeaponPotencyRune1",
        2: "PF2E.WeaponPotencyRune2",
        3: "PF2E.WeaponPotencyRune3",
        4: "PF2E.WeaponPotencyRune4",
    },
    weaponStrikingRunes: {
        striking: "PF2E.ArmorStrikingRune",
        greaterStriking: "PF2E.ArmorGreaterStrikingRune",
        majorStriking: "PF2E.ArmorMajorStrikingRune",
    },
    weaponPropertyRunes,
    damageTraits,
    damageTypes,
    damageRollFlavors,
    damageCategories,
    materialDamageEffects,
    resistanceTypes,

    stackGroups: {
        arrows: "PF2E.StackGroupArrows",
        blowgunDarts: "PF2E.StackGroupBlowgunDarts",
        bolts: "PF2E.StackGroupBolts",
        coins: "PF2E.StackGroupCoins",
        gems: "PF2E.StackGroupGems",
        rounds5: "PF2E.StackGroupRounds5",
        rounds10: "PF2E.StackGroupRounds10",
        rations: "PF2E.StackGroupRations",
        sacks: "PF2E.StackGroupSacks",
        slingBullets: "PF2E.StackGroupSlingBullets",
        sprayPellets: "PF2E.StackGroupSprayPellets",
        woodenTaws: "PF2E.StackGroupWoodenTaws",
    },

    weaknessTypes,

    weaponDamage: {
        bludgeoning: "PF2E.TraitBludgeoning",
        piercing: "PF2E.TraitPiercing",
        slashing: "PF2E.TraitSlashing",
        modular: "PF2E.TraitModular",
    },

    healingTypes: {
        healing: "PF2E.TraitHealing",
        temphp: "PF2E.HealingTypeTemporaryHealing",
    },

    weaponCategories,
    weaponGroups,
    meleeWeaponGroups,

    baseArmorTypes,
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
        "affixed-to-a-ranged-weapon": "PF2E.TraitAffixedToARangedWeapon",
        "affixed-to-a-shield": "PF2E.TraitAffixedToAShield",
        "affixed-to-a-thrown-weapon": "PF2E.TraitAffixedToThrownWeapon",
        "affixed-to-a-two-handed-firearm-or-crossbow": "PF2E.TraitAffixedToATwoHandedFirearmOrCrossbow",
        "affixed-to-an-innovation": "PF2E.TraitAffixedToInnovation",
        "affixed-to-an-object-or-structure": "PF2E.TraitAffixedToObjectOrStructure",
        "affixed-to-armor": "PF2E.TraitAffixedToArmor",
        "affixed-to-medium-heavy-armor": "PF2E.TraitAffixedToMediumHeavyArmor",
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
        bonded: "PF2E.TraitBonded",
        carried: "PF2E.TraitCarried",
        "each-rune-applied-to-a-separate-item-that-has-pockets":
            "PF2E.TraitEachRuneAppliedToASeparateItemThatHasPockets",
        "etched-onto-a-weapon": "PF2E.TraitEtchedOntoAWeapon",
        "etched-onto-armor": "PF2E.TraitEtchedOntoArmor",
        "etched-onto-heavy-armor": "PF2E.TraitEtchedOntoHeavyArmor",
        "etched-onto-light-armor": "PF2E.TraitEtchedOntoLightArmor",
        "etched-onto-metal-armor": "PF2E.TraitEtchedOntoMetalArmor",
        "etched-onto-clan-dagger": "PF2E.TraitEtchedOntoAClanDagger",
        "etched-onto-lm-nonmetal-armor": "PF2E.TraitEtchedOntoLightMedNMArmor",
        "etched-onto-med-heavy-armor": "PF2E.TraitEtchedOntoMedHeavyArmor",
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
        "held-in-two-hands": "PF2E.TraitHeldTwoHands",
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

    rarityTraits: {
        common: "PF2E.TraitCommon",
        uncommon: "PF2E.TraitUncommon",
        rare: "PF2E.TraitRare",
        unique: "PF2E.TraitUnique",
    },

    magicTraditions,
    spellOtherTraits,

    magicSchools,
    classTraits,
    ancestryTraits,
    ancestryItemTraits,
    deityDomains,

    weaponTraits,
    otherWeaponTags,

    armorTraits,
    otherArmorTags,

    equipmentTraits,

    consumableTraits,
    otherConsumableTags,

    actionTraits,
    spellTraits,
    featTraits,
    creatureTraits,
    monsterTraits: creatureTraits,
    npcAttackTraits,
    hazardTraits,
    vehicleTraits,

    traitsDescriptions: traitDescriptions,

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

    armorCategories: {
        unarmored: "PF2E.ArmorTypeUnarmored",
        light: "PF2E.ArmorTypeLight",
        medium: "PF2E.ArmorTypeMedium",
        heavy: "PF2E.ArmorTypeHeavy",
        shield: "PF2E.ArmorTypeShield",
        "light-barding": "PF2E.Item.Armor.Category.light-barding",
        "heavy-barding": "PF2E.Item.Armor.Category.heavy-barding",
    },

    armorGroups: {
        composite: "PF2E.ArmorGroupComposite",
        chain: "PF2E.ArmorGroupChain",
        cloth: "PF2E.ArmorGroupCloth",
        leather: "PF2E.ArmorGroupLeather",
        plate: "PF2E.ArmorGroupPlate",
        skeletal: "PF2E.ArmorGroupSkeletal",
        wood: "PF2E.ArmorGroupWood",
    },

    consumableTypes: {
        ammo: "PF2E.ConsumableTypeAmmo",
        catalyst: "PF2E.TraitCatalyst",
        drug: "PF2E.ConsumableTypeDrug",
        elixir: "PF2E.ConsumableTypeElixir",
        fulu: "PF2E.TraitFulu",
        gadget: "PF2E.TraitGadget",
        oil: "PF2E.ConsumableTypeOil",
        other: "PF2E.ConsumableTypeOther",
        mutagen: "PF2E.ConsumableTypeMutagen",
        poison: "PF2E.ConsumableTypePoison",
        potion: "PF2E.ConsumableTypePotion",
        scroll: "PF2E.ConsumableTypeScroll",
        snare: "PF2E.ConsumableTypeSnare",
        talisman: "PF2E.ConsumableTypeTalisman",
        tool: "PF2E.ConsumableTypeTool",
        wand: "PF2E.ConsumableTypeWand",
    },

    identification: configFromLocalization(enJSON.PF2E.identification, "PF2E.identification"),

    weaponGeneratedNames: configFromLocalization(
        enJSON.PF2E.Item.Weapon.GeneratedName,
        "PF2E.Item.Weapon.GeneratedName"
    ),

    ruleElement: configFromLocalization(reEnJSON.PF2E.RuleElement, "PF2E.RuleElement"),

    preparationType: {
        prepared: "PF2E.PreparationTypePrepared",
        spontaneous: "PF2E.PreparationTypeSpontaneous",
        innate: "PF2E.PreparationTypeInnate",
        focus: "PF2E.SpellCategoryFocus",
        ritual: "PF2E.SpellCategoryRitual",
        items: "PF2E.PreparationTypeItems",
    },

    areaTypes: {
        burst: "PF2E.AreaTypeBurst",
        cone: "PF2E.AreaTypeCone",
        cube: "PF2E.AreaTypeCube",
        emanation: "PF2E.AreaTypeEmanation",
        line: "PF2E.AreaTypeLine",
        square: "PF2E.AreaTypeSquare",
    },

    areaSizes: {
        5: "PF2E.AreaSize5",
        10: "PF2E.AreaSize10",
        15: "PF2E.AreaSize15",
        20: "PF2E.AreaSize20",
        25: "PF2E.AreaSize25",
        30: "PF2E.AreaSize30",
        40: "PF2E.AreaSize40",
        45: "PF2E.AreaSize45",
        50: "PF2E.AreaSize50",
        60: "PF2E.AreaSize60",
        65: "PF2E.AreaSize65",
        75: "PF2E.AreaSize75",
        80: "PF2E.AreaSize80",
        90: "PF2E.AreaSize90",
        100: "PF2E.AreaSize100",
        120: "PF2E.AreaSize120",
        360: "PF2E.AreaSize360",
        500: "PF2E.AreaSize500",
        1000: "PF2E.AreaSize1000",
        1320: "PF2E.AreaSizeQuarterMile",
        5280: "PF2E.AreaSize1Mile",
    },

    alignments,
    alignmentTraits,

    attitude: {
        hostile: "PF2E.Attitudes.Hostile",
        unfriendly: "PF2E.Attitudes.Unfriendly",
        indifferent: "PF2E.Attitudes.Indifferent",
        friendly: "PF2E.Attitudes.Friendly",
        helpful: "PF2E.Attitudes.Helpful",
    },

    skillList: {
        acrobatics: "PF2E.SkillAcrobatics",
        arcana: "PF2E.SkillArcana",
        athletics: "PF2E.SkillAthletics",
        crafting: "PF2E.SkillCrafting",
        deception: "PF2E.SkillDeception",
        diplomacy: "PF2E.SkillDiplomacy",
        intimidation: "PF2E.SkillIntimidation",
        medicine: "PF2E.SkillMedicine",
        nature: "PF2E.SkillNature",
        occultism: "PF2E.SkillOccultism",
        performance: "PF2E.SkillPerformance",
        religion: "PF2E.SkillReligion",
        society: "PF2E.SkillSociety",
        stealth: "PF2E.SkillStealth",
        survival: "PF2E.SkillSurvival",
        thievery: "PF2E.SkillThievery",
        lore: "PF2E.SkillLore",
    },

    spellComponents: {
        V: "PF2E.SpellComponentV",
        S: "PF2E.SpellComponentS",
        M: "PF2E.SpellComponentM",
        F: "PF2E.SpellComponentF",
    },

    spellCategories: {
        spell: "PF2E.SpellCategorySpell",
        focus: "PF2E.SpellCategoryFocus",
        ritual: "PF2E.SpellCategoryRitual",
    },

    spellTypes: {
        attack: "PF2E.SpellTypeAttack",
        save: "PF2E.SpellTypeSave",
        heal: "PF2E.SpellTypeHeal",
        utility: "PF2E.SpellTypeUtility",
    },

    spellLevels: {
        1: "PF2E.SpellLevel1",
        2: "PF2E.SpellLevel2",
        3: "PF2E.SpellLevel3",
        4: "PF2E.SpellLevel4",
        5: "PF2E.SpellLevel5",
        6: "PF2E.SpellLevel6",
        7: "PF2E.SpellLevel7",
        8: "PF2E.SpellLevel8",
        9: "PF2E.SpellLevel9",
        10: "PF2E.SpellLevel10",
    }, // TODO: Compute levels!

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

    actorSizes: sizeTypes,

    actorTypes,

    speedTypes: {
        swim: "PF2E.SpeedTypesSwim",
        climb: "PF2E.SpeedTypesClimb",
        fly: "PF2E.SpeedTypesFly",
        burrow: "PF2E.SpeedTypesBurrow",
    },

    prerequisitePlaceholders: {
        prerequisite1: "PF2E.Prerequisite1",
        prerequisite2: "PF2E.Prerequisite2",
        prerequisite3: "PF2E.Prerequisite3",
        prerequisite4: "PF2E.Prerequisite4",
        prerequisite5: "PF2E.Prerequisite5",
    },

    senses,

    senseAcuity,

    bulkTypes: {
        L: "PF2E.BulkTypeLight",
        1: "1",
        2: "2",
        3: "3",
        4: "4",
        5: "5",
        6: "6",
        7: "7",
        8: "8",
        9: "9",
        10: "10",
        11: "11",
        12: "12",
        13: "13",
        14: "14",
        15: "15",
        16: "16",
        17: "17",
        18: "18",
        19: "19",
        20: "20",
        21: "21",
        22: "22",
        23: "23",
        24: "24",
        25: "25",
        26: "26",
        27: "27",
        28: "28",
        29: "29",
        30: "30",
        31: "31",
        32: "32",
        33: "33",
        34: "34",
        35: "35",
        36: "36",
        37: "37",
        38: "38",
        39: "39",
        40: "40",
        41: "41",
        42: "42",
        43: "43",
        44: "44",
        45: "45",
        46: "46",
        47: "47",
        48: "48",
        49: "49",
        50: "50",
    },

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

    // Languages, alphabetical by common, uncommon, secret
    languages: {
        common: "PF2E.LanguageCommon",
        draconic: "PF2E.LanguageDraconic",
        dwarven: "PF2E.LanguageDwarven",
        elven: "PF2E.LanguageElven",
        gnomish: "PF2E.LanguageGnomish",
        goblin: "PF2E.LanguageGoblin",
        halfling: "PF2E.LanguageHalfling",
        jotun: "PF2E.LanguageJotun",
        orcish: "PF2E.LanguageOrcish",
        sylvan: "PF2E.LanguageSylvan",
        undercommon: "PF2E.LanguageUndercommon",
        ysoki: "PF2E.LanguageYsoki",
        abyssal: "PF2E.LanguageAbyssal",
        adlet: "PF2E.LanguageAdlet",
        aklo: "PF2E.LanguageAklo",
        akitonian: "PF2E.LanguageAkitonian",
        alghollthu: "PF2E.LanguageAlghollthu",
        amurrun: "PF2E.LanguageAmurrun",
        anadi: "PF2E.LanguageAnadi",
        "ancient-osiriani": "PF2E.LanguageAncientOsiriani",
        anugobu: "PF2E.LanguageAnugobu",
        arcadian: "PF2E.LanguageArcadian",
        aquan: "PF2E.LanguageAquan",
        arboreal: "PF2E.LanguageArboreal",
        auran: "PF2E.LanguageAuran",
        boggard: "PF2E.LanguageBoggard",
        calda: "PF2E.LanguageCalda",
        caligni: "PF2E.LanguageCaligni",
        celestial: "PF2E.LanguageCelestial",
        cyclops: "PF2E.LanguageCyclops",
        daemonic: "PF2E.LanguageDaemonic",
        destrachan: "PF2E.LanguageDestrachan",
        drooni: "PF2E.LanguageDrooni",
        dziriak: "PF2E.LanguageDziriak",
        ekujae: "PF2E.LanguageEkujae",
        "elder-thing": "PF2E.LanguageElderThing",
        erutaki: "PF2E.LanguageErutaki",
        formian: "PF2E.LanguageFormian",
        garundi: "PF2E.LanguageGarundi",
        girtablilu: "PF2E.LanguageGirtablilu",
        gnoll: "PF2E.LanguageGnoll",
        goloma: "PF2E.LanguageGoloma",
        grippli: "PF2E.LanguageGrippli",
        hallit: "PF2E.LanguageHallit",
        hwan: "PF2E.LanguageHwan",
        iblydan: "PF2E.LanguageIblydan",
        ignan: "PF2E.LanguageIgnan",
        ikeshti: "PF2E.LanguageIkeshti",
        immolis: "PF2E.LanguageImmolis",
        infernal: "PF2E.LanguageInfernal",
        iruxi: "PF2E.LanguageIruxi",
        jistkan: "PF2E.LanguageJistkan",
        jyoti: "PF2E.LanguageJyoti",
        kaava: "PF2E.LanguageKaava",
        kashrishi: "PF2E.LanguageKashrishi",
        kibwani: "PF2E.LanguageKibwani",
        kitsune: "PF2E.LanguageKitsune",
        kelish: "PF2E.LanguageKelish",
        lirgeni: "PF2E.LanguageLirgeni",
        mahwek: "PF2E.LanguageMahwek",
        minaten: "PF2E.LanguageMinaten",
        minkaian: "PF2E.LanguageMinkaian",
        mwangi: "PF2E.LanguageMwangi",
        mzunu: "PF2E.LanguageMzunu",
        nagaji: "PF2E.LanguageNagaji",
        necril: "PF2E.LanguageNecril",
        ocotan: "PF2E.LanguageOcotan",
        okaiyan: "PF2E.LanguageOkaiyan",
        osiriani: "PF2E.LanguageOsiriani",
        protean: "PF2E.LanguageProtean",
        rasu: "PF2E.LanguageRasu",
        ratajin: "PF2E.LanguageRatajin",
        razatlani: "PF2E.LanguageRazatlani",
        requian: "PF2E.LanguageRequian",
        russian: "PF2E.LanguageRussian",
        senzar: "PF2E.LanguageSenzar",
        shadowtongue: "PF2E.LanguageShadowtongue",
        shobhad: "PF2E.LanguageShobhad",
        shisk: "PF2E.LanguageShisk",
        shoanti: "PF2E.LanguageShoanti",
        shoony: "PF2E.LanguageShoony",
        skald: "PF2E.LanguageSkald",
        sphinx: "PF2E.LanguageSphinx",
        strix: "PF2E.LanguageStrix",
        taldane: "PF2E.LanguageTaldane",
        tekritanin: "PF2E.LanguageTekritanin",
        tengu: "PF2E.LanguageTengu",
        terran: "PF2E.LanguageTerran",
        thassilonian: "PF2E.LanguageThassilonian",
        tien: "PF2E.LanguageTien",
        utopian: "PF2E.LanguageUtopian",
        vanara: "PF2E.LanguageVanara",
        varisian: "PF2E.LanguageVarisian",
        varki: "PF2E.LanguageVarki",
        vishkanyan: "PF2E.LanguageVishkanyan",
        vudrani: "PF2E.LanguageVudrani",
        wyrwood: "PF2E.LanguageWyrwood",
        xanmba: "PF2E.LanguageXanmba",
        androffan: "PF2E.LanguageAndroffan",
        azlanti: "PF2E.LanguageAzlanti",
        grioth: "PF2E.LanguageGrioth",
        kovintal: "PF2E.LanguageKovintal",
        migo: "PF2E.LanguageMiGo",
        munavri: "PF2E.LanguageMunavri",
        samsaran: "PF2E.LanguageSamsaran",
        sasquatch: "PF2E.LanguageSasquatch",
        shae: "PF2E.LanguageShae",
        yithian: "PF2E.LanguageYithian",
        druidic: "PF2E.LanguageDruidic",
    },

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
    worldClock: mergeObject(configFromLocalization(enJSON.PF2E.WorldClock, "PF2E.WorldClock"), {
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

    runes: {
        weapon: {
            property: { ...WEAPON_PROPERTY_RUNES },
        },
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
                pcsOnly: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.PCsOnly",
                both: "PF2E.SETTINGS.Automation.ActorsDeadAtZero.Both",
            },
            lootableNPCs: {
                name: "PF2E.SETTINGS.Automation.LootableNPCs.Name",
                hint: "PF2E.SETTINGS.Automation.LootableNPCs.Hint",
            },
        },
        homebrew: {
            creatureTraits: {
                name: "PF2E.SETTINGS.Homebrew.CreatureTraits.Name",
                hint: "PF2E.SETTINGS.Homebrew.CreatureTraits.Hint",
            },
            featTraits: {
                name: "PF2E.SETTINGS.Homebrew.FeatTraits.Name",
                hint: "PF2E.SETTINGS.Homebrew.FeatTraits.Hint",
            },
            languages: {
                name: "PF2E.SETTINGS.Homebrew.Languages.Name",
                hint: "PF2E.SETTINGS.Homebrew.Languages.Hint",
            },
            magicSchools: {
                name: "PF2E.SETTINGS.Homebrew.MagicSchools.Name",
                hint: "PF2E.SETTINGS.Homebrew.MagicSchools.Hint",
            },
            spellTraits: {
                name: "PF2E.SETTINGS.Homebrew.SpellTraits.Name",
                hint: "PF2E.SETTINGS.Homebrew.SpellTraits.Hint",
            },
            weaponCategories: {
                name: "PF2E.SETTINGS.Homebrew.WeaponCategories.Name",
                hint: "PF2E.SETTINGS.Homebrew.WeaponCategories.Hint",
            },
            weaponGroups: {
                name: "PF2E.SETTINGS.Homebrew.WeaponGroups.Name",
                hint: "PF2E.SETTINGS.Homebrew.WeaponGroups.Hint",
            },
            baseWeapons: {
                name: "PF2E.SETTINGS.Homebrew.BaseWeapons.Name",
                hint: "PF2E.SETTINGS.Homebrew.BaseWeapons.Hint",
            },
            weaponTraits: {
                name: "PF2E.SETTINGS.Homebrew.WeaponTraits.Name",
                hint: "PF2E.SETTINGS.Homebrew.WeaponTraits.Hint",
            },
            equipmentTraits: {
                name: "PF2E.SETTINGS.Homebrew.EquipmentTraits.Name",
                hint: "PF2E.SETTINGS.Homebrew.EquipmentTraits.Hint",
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
                enabled: "PF2E.SETTINGS.WorldClock.SyncDarknessScene.Enabled",
                disabled: "PF2E.SETTINGS.WorldClock.SyncDarknessScene.Disabled",
                default: "PF2E.SETTINGS.WorldClock.SyncDarknessScene.Default",
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
            action: ActionItemPF2e,
            affliction: AfflictionPF2e,
            ancestry: AncestryPF2e,
            armor: ArmorPF2e,
            background: BackgroundPF2e,
            backpack: ContainerPF2e,
            book: BookPF2e,
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
            spell: SpellPF2e,
            spellcastingEntry: SpellcastingEntryPF2e,
            treasure: TreasurePF2e,
            weapon: WeaponPF2e,
        },
        traits: {
            action: actionTraits,
            affliction: actionTraits,
            armor: armorTraits,
            ancestry: creatureTraits,
            backpack: equipmentTraits,
            book: equipmentTraits,
            consumable: consumableTraits,
            equipment: equipmentTraits,
            feat: featTraits,
            heritage: featTraits,
            kit: classTraits,
            melee: npcAttackTraits,
            spell: spellTraits,
            weapon: weaponTraits,
        },
    },

    JournalEntry: { sheetClass: JournalSheetPF2e },

    Canvas: {
        darkness: {
            default: CONFIG.Canvas.darknessColor,
            gmVision: 0x908cb9,
        },
    },
};
