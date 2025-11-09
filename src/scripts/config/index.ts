import { ArmyPF2e, CharacterPF2e, FamiliarPF2e, HazardPF2e, LootPF2e, NPCPF2e, PartyPF2e, VehiclePF2e } from "@actor";
import { SenseAcuity } from "@actor/creature/types.ts";
import { LANGUAGES, SENSE_TYPES } from "@actor/creature/values.ts";
import type { ActorType, AttributeString, SkillSlug } from "@actor/types.ts";
import {
    AbilityItemPF2e,
    AfflictionPF2e,
    AmmoPF2e,
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
import { STACK_DEFINITIONS } from "@item/physical/bulk.ts";
import { PreciousMaterialGrade } from "@item/physical/types.ts";
import { MeleeWeaponGroup, WeaponCategory, WeaponGroup, WeaponReloadTime } from "@item/weapon/types.ts";
import { Size, ZeroToThree } from "@module/data.ts";
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
import { USAGES } from "./usage.ts";

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

const featCategories: Record<FeatOrFeatureCategory, string> = {
    ancestry: "PF2E.Item.Feat.Category.Ancestry",
    ancestryfeature: "PF2E.Item.Feat.Category.AncestryFeature",
    calling: "PF2E.Item.Feat.Category.Calling",
    class: "PF2E.Item.Feat.Category.Class",
    classfeature: "PF2E.Item.Feat.Category.ClassFeature",
    skill: "PF2E.Item.Feat.Category.Skill",
    general: "PF2E.Item.Feat.Category.General",
    bonus: "PF2E.Item.Feat.Category.Bonus",
    pfsboon: "PF2E.Item.Feat.Category.PfsBoon",
    deityboon: "PF2E.Item.Feat.Category.DeityBoon",
    curse: "PF2E.Item.Feat.Category.Curse",
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

const grades = {
    commercial: "PF2E.Item.Physical.Grade.commercial",
    tactical: "PF2E.Item.Physical.Grade.tactical",
    advanced: "PF2E.Item.Physical.Grade.advanced",
    superior: "PF2E.Item.Physical.Grade.superior",
    elite: "PF2E.Item.Physical.Grade.elite",
    ultimate: "PF2E.Item.Physical.Grade.ultimate",
    paragon: "PF2E.Item.Physical.Grade.paragon",
};

type BaseWeaponType = keyof typeof baseWeaponTypes;

const round5Firearms = [
    "dwarven-scattergun",
    "explosive-dogslicer",
    "flingflenser",
    "harmona-gun",
] as const satisfies BaseWeaponType[];

const round10Firearms = [
    // Round 10
    "arquebus",
    "axe-musket",
    "black-powder-knuckle-dusters",
    "blunderbuss",
    "cane-pistol",
    "clan-pistol",
    "coat-pistol",
    "dagger-pistol",
    "double-barreled-musket",
    "double-barreled-pistol",
    "dragon-mouth-pistol",
    "dueling-pistol",
    "fire-lance",
    "flintlock-musket",
    "flintlock-pistol",
    "gnome-amalgam-musket",
    "gun-sword",
    "hammer-gun",
    "hand-cannon",
    "jezail",
    "mace-multipistol",
    "mithral-tree",
    "pepperbox",
    "piercing-wind",
    "rapier-pistol",
    "shield-pistol",
    "shobhad-longrifle",
    "slide-pistol",
    "three-peaked-tree",
    "triggerbrand",
] satisfies BaseWeaponType[];

const repeatingCrossbows = [
    "repeating-crossbow",
    "repeating-hand-crossbow",
    "repeating-heavy-crossbow",
] satisfies BaseWeaponType[];

// Beast guns aren't loaded with the same ammunition as other guns, but they do still use ammunition, ...
// This ammunition comes as specially designed rounds, such as miniature tentacles fired from the tentacle gun or javelin-like spikes from the spike gun.
// Unless otherwise stated, these rounds come in packs of 10 that cost 1 sp and have light Bulk.
// - Guns & Gears pg 154
// Hydrocannon does not use ammo, and growth gun is....uncertain
const beastGuns = [
    "alicorn-trigger",
    "breath-blaster",
    "drake-rifle",
    "fulmination-fang",
    "howler-pistol",
    "leydroth-spellbreaker",
    "nightmares-lament",
    "petrification-cannon",
    "screech-shooter",
    "spider-gun",
    "spike-launcher",
    "tentacle-cannon",
] as const;

const DEFAULT_AMMO_STACK_GROUPS: Partial<Record<string, keyof typeof STACK_DEFINITIONS>> = {
    arrows: "arrows",
    rounds: "rounds10",
    bolts: "bolts",
    "sling-bullets": "slingBullets",
    "blowgun-darts": "blowgunDarts",
    "wooden-taws": "woodenTaws",
};

interface BaseAmmoTypeData {
    parent: string | null;
    label: string;
    magazine: boolean;
    stackGroup: keyof typeof STACK_DEFINITIONS | null;
    weapon: string | null; // The associated base weapon or weapon slug (if any)
}

// Despite usually being bespoke, magazines and rounds have their own ammo types
// to support data fallbacks and looser table rules.
const ammoTypes = {
    ...R.mapToObj(
        [
            "arrows",
            "blowgun-darts",
            "bolts",
            "rounds",
            "sling-bullets",
            "spray-pellets",
            "wooden-taws",
            "projectile-ammo",
        ] as const,
        (slug) => [
            slug,
            {
                parent: null,
                label: `PF2E.Item.Ammo.Base.${slug}`,
                magazine: false,
                stackGroup: DEFAULT_AMMO_STACK_GROUPS[slug] ?? null,
                weapon: null,
            },
        ],
    ),
    ...R.mapToObj(["magazine", "battery", "chem-tank"] as const, (slug) => [
        slug,
        {
            parent: null,
            label: `PF2E.Item.Ammo.Base.${slug}`,
            magazine: true,
            stackGroup: null,
            weapon: null,
        },
    ]),
    // Include all rounds
    ...R.mapToObj(round5Firearms, (baseWeapon) => [
        `rounds-${baseWeapon}`,
        {
            parent: "rounds",
            label: `PF2E.Item.Ammo.Base.rounds-${baseWeapon}`,
            magazine: false,
            stackGroup: "rounds5",
            weapon: baseWeapon,
        },
    ]),
    ...R.mapToObj([...round10Firearms, ...beastGuns], (baseWeapon) => [
        `rounds-${baseWeapon}`,
        {
            parent: "rounds",
            label: `PF2E.Item.Ammo.Base.rounds-${baseWeapon}`,
            magazine: false,
            stackGroup: "rounds10",
            weapon: baseWeapon,
        },
    ]),
    cutlery: {
        parent: "rounds",
        label: "PF2E.Item.Ammo.Base.cutlery",
        magazine: false,
        stackGroup: "rounds10",
        weapon: "spoon-gun",
    },

    // Include all magazines. Magazine items don't map as cleanly
    ...R.mapToObj(repeatingCrossbows, (baseWeapon) => [
        `${baseWeapon}-magazine`,
        {
            parent: "magazine",
            label: `PF2E.Item.Ammo.Base.${baseWeapon}-magazine`,
            magazine: true,
            stackGroup: null,
            weapon: baseWeapon,
        },
    ]),
    "8-round-magazine": {
        parent: "magazine",
        label: `PF2E.Item.Ammo.Base.8-round-magazine`,
        magazine: true,
        stackGroup: null,
        weapon: "barricade-buster",
    },
    "magazine-with-6-pellets": {
        parent: "magazine",
        label: `PF2E.Item.Ammo.Base.magazine-with-6-pellets`,
        magazine: true,
        stackGroup: null,
        weapon: "air-repeater",
    },
    "magazine-with-8-pellets": {
        parent: "magazine",
        label: `PF2E.Item.Ammo.Base.magazine-with-8-pellets`,
        magazine: true,
        stackGroup: null,
        weapon: "long-air-repeater",
    },
    // Other oddities
    "backpack-ballista-bolts": {
        parent: null,
        label: "PF2E.Item.Ammo.Base.backpack-ballista-bolts",
        magazine: false,
        stackGroup: null,
        weapon: "backpack-ballista",
    },
    "backpack-catapult-stones": {
        parent: null,
        label: "PF2E.Item.Ammo.Base.backpack-catapult-stones",
        magazine: false,
        stackGroup: null,
        weapon: "backpack-catapult",
    },
} satisfies Record<string, BaseAmmoTypeData>;

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
        coins: "PF2E.StackGroupCoins",
        gems: "PF2E.StackGroupGems",
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

    usages: USAGES,

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

    grades,
    weaponImprovements: {
        commercial: { level: 0, tracking: 0, dice: 1, credits: 0 },
        tactical: { level: 2, tracking: 1, dice: 1, credits: 350 },
        advanced: { level: 4, tracking: 1, dice: 2, credits: 1000 },
        superior: { level: 10, tracking: 2, dice: 2, credits: 10000 },
        elite: { level: 12, tracking: 2, dice: 3, credits: 20000 },
        ultimate: { level: 16, tracking: 3, dice: 3, credits: 100000 },
        paragon: { level: 19, tracking: 3, dice: 4, credits: 400000 },
    } satisfies Record<keyof typeof grades, { level: number; tracking: ZeroToThree; dice: number; credits: number }>,
    armorImprovements: {
        commercial: { level: 0, bonus: 0, resilient: 0, credits: 0 },
        tactical: { level: 5, bonus: 1, resilient: 0, credits: 1600 },
        advanced: { level: 8, bonus: 1, resilient: 1, credits: 5000 },
        superior: { level: 11, bonus: 2, resilient: 1, credits: 14000 },
        elite: { level: 14, bonus: 2, resilient: 2, credits: 45000 },
        ultimate: { level: 18, bonus: 3, resilient: 2, credits: 240000 },
        paragon: { level: 20, bonus: 3, resilient: 3, credits: 700000 },
    } satisfies Record<keyof typeof grades, { level: number; bonus: number; resilient: ZeroToThree; credits: number }>,

    shieldImprovements: {
        commercial: { level: 0, hardness: 0, maxHP: 0, credits: 0 },
        tactical: { level: 5, hardness: 3, maxHP: 46, credits: 750 },
        advanced: { level: 8, hardness: 3, maxHP: 56, credits: 3000 },
        superior: { level: 11, hardness: 3, maxHP: 68, credits: 9000 },
        elite: { level: 14, hardness: 5, maxHP: 80, credits: 25000 },
        ultimate: { level: 18, hardness: 6, maxHP: 100, credits: 800000 },
        paragon: { level: 20, hardness: 7, maxHP: 120, credits: 320000 },
    },

    weaponReload,
    armorCategories,
    armorGroups,
    consumableCategories,
    identification: configFromLocalization(EN_JSON.PF2E.identification, "PF2E.identification"),

    /** Base weapons that should always be treated as thrown */
    thrownBaseWeapons: ["alchemical-bomb", "grenade"] as const,

    preparationType: {
        prepared: "PF2E.PreparationTypePrepared",
        spontaneous: "PF2E.PreparationTypeSpontaneous",
        innate: "PF2E.PreparationTypeInnate",
        focus: "PF2E.PreparationTypeFocus",
        items: "PF2E.PreparationTypeItems",
        ritual: "PF2E.PreparationTypeRitual",
    },

    spellcastingItems: {
        scroll: {
            name: "PF2E.Item.Consumable.Category.scroll",
            nameTemplate: "PF2E.Item.Physical.FromSpell.Scroll",
            compendiumUuids: {
                1: "Compendium.pf2e.equipment-srd.Item.RjuupS9xyXDLgyIr",
                2: "Compendium.pf2e.equipment-srd.Item.Y7UD64foDbDMV9sx",
                3: "Compendium.pf2e.equipment-srd.Item.ZmefGBXGJF3CFDbn",
                4: "Compendium.pf2e.equipment-srd.Item.QSQZJ5BC3DeHv153",
                5: "Compendium.pf2e.equipment-srd.Item.tjLvRWklAylFhBHQ",
                6: "Compendium.pf2e.equipment-srd.Item.4sGIy77COooxhQuC",
                7: "Compendium.pf2e.equipment-srd.Item.fomEZZ4MxVVK3uVu",
                8: "Compendium.pf2e.equipment-srd.Item.iPki3yuoucnj7bIt",
                9: "Compendium.pf2e.equipment-srd.Item.cFHomF3tty8Wi1e5",
                10: "Compendium.pf2e.equipment-srd.Item.o1XIHJ4MJyroAHfF",
            },
        },
        wand: {
            name: "PF2E.Item.Consumable.Category.wand",
            nameTemplate: "PF2E.Item.Physical.FromSpell.Wand",
            compendiumUuids: {
                1: "Compendium.pf2e.equipment-srd.Item.UJWiN0K3jqVjxvKk",
                2: "Compendium.pf2e.equipment-srd.Item.vJZ49cgi8szuQXAD",
                3: "Compendium.pf2e.equipment-srd.Item.wrDmWkGxmwzYtfiA",
                4: "Compendium.pf2e.equipment-srd.Item.Sn7v9SsbEDMUIwrO",
                5: "Compendium.pf2e.equipment-srd.Item.5BF7zMnrPYzyigCs",
                6: "Compendium.pf2e.equipment-srd.Item.kiXh4SUWKr166ZeM",
                7: "Compendium.pf2e.equipment-srd.Item.nmXPj9zuMRQBNT60",
                8: "Compendium.pf2e.equipment-srd.Item.Qs8RgNH6thRPv2jt",
                9: "Compendium.pf2e.equipment-srd.Item.Fgv722039TVM5JTc",
                10: null,
            },
        },
    },

    attitude: {
        hostile: "PF2E.Attitudes.Hostile",
        unfriendly: "PF2E.Attitudes.Unfriendly",
        indifferent: "PF2E.Attitudes.Indifferent",
        friendly: "PF2E.Attitudes.Friendly",
        helpful: "PF2E.Attitudes.Helpful",
    },

    ammoTypes,

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
        interaction: "PF2E.Item.Ability.Category.Interaction",
        defensive: "PF2E.Item.Ability.Category.Defensive",
        offensive: "PF2E.Item.Ability.Category.Offensive",
        familiar: "PF2E.Item.Ability.Category.Familiar",
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
            ammo: AmmoPF2e,
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
