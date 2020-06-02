export const CONFIG = {};
CONFIG.chatDamageButtonShieldToggle = false; // Couldnt call this simple CONFIG.statusEffects, and spend 20 minutes trying to find out why. Apparently thats also used by FoundryVTT and we are still overloading CONFIG.
// Can be changed by modules or other settings, e.g. 'modules/myModule/icons/effects/'

CONFIG.PF2eStatusEffects = {
  overruledByModule: false,
  lastIconType: 'default',
  effectsIconFolder: 'systems/pf2e/icons/conditions/',
  effectsIconFileType: 'png',
  keepFoundryStatusEffects: true,
  foundryStatusEffects: []
}; // Ability labels

CONFIG.abilities = {
  "str": "PF2E.AbilityStr",
  "dex": "PF2E.AbilityDex",
  "con": "PF2E.AbilityCon",
  "int": "PF2E.AbilityInt",
  "wis": "PF2E.AbilityWis",
  "cha": "PF2E.AbilityCha"
};
CONFIG.attributes = {
  "perception": "PF2E.PerceptionLabel",
  "stealth": "PF2E.StealthLabel",
  "initiative": "PF2E.PerceptionLabel"
}; // Skill labels

CONFIG.skills = {
  "acr": "PF2E.SkillAcr",
  "arc": "PF2E.SkillArc",
  "ath": "PF2E.SkillAth",
  "cra": "PF2E.SkillCra",
  "dec": "PF2E.SkillDec",
  "dip": "PF2E.SkillDip",
  "itm": "PF2E.SkillItm",
  "med": "PF2E.SkillMed",
  "nat": "PF2E.SkillNat",
  "occ": "PF2E.SkillOcc",
  "prf": "PF2E.SkillPrf",
  "rel": "PF2E.SkillRel",
  "soc": "PF2E.SkillSoc",
  "ste": "PF2E.SkillSte",
  "sur": "PF2E.SkillSur",
  "thi": "PF2E.SkillThi"
}; // Martial skill labels

CONFIG.martialSkills = {
  "unarmored": "PF2E.MartialUnarmored",
  "light": "PF2E.MartialLight",
  "medium": "PF2E.MartialMedium",
  "heavy": "PF2E.MartialHeavy",
  "simple": "PF2E.MartialSimple",
  "martial": "PF2E.MartialMartial",
  "advanced": "PF2E.MartialAdvanced",
  "unarmed": "PF2E.MartialUnarmed"
}; // Saves labels

CONFIG.saves = {
  "reflex": "PF2E.SavesReflex",
  "fortitude": "PF2E.SavesFortitude",
  "will": "PF2E.SavesWill"
}; // Inventory currency labels

CONFIG.currencies = {
  "pp": "PF2E.CurrencyPP",
  "gp": "PF2E.CurrencyGP",
  "sp": "PF2E.CurrencySP",
  "cp": "PF2E.CurrencyCP"
};
CONFIG.preciousMaterialGrades = {
  low: "PF2E.PreciousMaterialLowGrade",
  standard: "PF2E.PreciousMaterialStandardGrade",
  high: "PF2E.PreciousMaterialHighGrade"
};
CONFIG.preciousMaterials = {
  coldIron: "PF2E.PreciousMaterialColdIron",
  silver: "PF2E.PreciousMaterialSilver",
  mithral: "PF2E.PreciousMaterialMithral",
  adamantine: "PF2E.PreciousMaterialAdamantine",
  darkwood: "PF2E.PreciousMaterialDarkwood",
  dragonhide: "PF2E.PreciousMaterialDragonhide",
  orichalcum: "PF2E.PreciousMaterialOrichalcum"
};
CONFIG.armorPotencyRunes = {
  "1": "PF2E.ArmorPotencyRune1",
  "2": "PF2E.ArmorPotencyRune2",
  "3": "PF2E.ArmorPotencyRune3",
  "4": "PF2E.ArmorPotencyRune4"
};
CONFIG.armorResiliencyRunes = {
  resilient: "PF2E.ArmorResilientRune",
  greaterResilient: "PF2E.ArmorGreaterResilientRune",
  majorResilient: "PF2E.ArmorMajorResilientRune"
};
CONFIG.armorPropertyRunes = {
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
  greaterShadow: "PF2E.ArmorPropertyRuneGreaterShadow",
  greaterInvisibility: "PF2E.ArmorPropertyRuneGreaterInvisibility",
  greaterAcidResistant: "PF2E.ArmorPropertyRuneGreaterAcidResistant",
  greaterColdResistant: "PF2E.ArmorPropertyRuneGreaterColdResistant",
  greaterElectricityResistant: "PF2E.ArmorPropertyRuneGreaterElectricityResistant",
  greaterFireResistant: "PF2E.ArmorPropertyRuneGreaterFireResistant",
  fortification: "PF2E.ArmorPropertyRuneFortification",
  rockBraced: "PF2E.ArmorPropertyRuneRockBraced",
  antimagic: "PF2E.ArmorPropertyRuneAntimagic",
  majorSlick: "PF2E.ArmorPropertyRuneMajorSlick",
  ethereal: "PF2E.ArmorPropertyRuneEthereal",
  majorShadow: "PF2E.ArmorPropertyRuneMajorShadow",
  greaterFortification: "PF2E.ArmorPropertyRuneGreaterFortification"
};
CONFIG.weaponPotencyRunes = {
  "1": "PF2E.WeaponPotencyRune1",
  "2": "PF2E.WeaponPotencyRune2",
  "3": "PF2E.WeaponPotencyRune3",
  "4": "PF2E.WeaponPotencyRune4"
};
CONFIG.weaponStrikingRunes = {
  striking: "PF2E.ArmorStrikingRune",
  greaterStriking: "PF2E.ArmorGreaterStrikingRune",
  majorStriking: "PF2E.ArmorMajorStrikingRune"
};
CONFIG.weaponPropertyRunes = {
  kinWarding: "PF2E.WeaponPropertyRuneKinWarding",
  returning: "PF2E.WeaponPropertyRuneReturning",
  ghostTouch: "PF2E.WeaponPropertyRuneGhostTouch",
  disrupting: "PF2E.WeaponPropertyRuneDisrupting",
  shifting: "PF2E.WeaponPropertyRuneShifting",
  wounding: "PF2E.WeaponPropertyRuneWounding",
  bloodbane: "PF2E.WeaponPropertyRuneBloodbane",
  corrosive: "PF2E.WeaponPropertyRuneCorrosive",
  flaming: "PF2E.WeaponPropertyRuneFlaming",
  frost: "PF2E.WeaponPropertyRuneFrost",
  shock: "PF2E.WeaponPropertyRuneShock",
  thundering: "PF2E.WeaponPropertyRuneThundering",
  grievous: "PF2E.WeaponPropertyRuneGrievous",
  serrating: "PF2E.WeaponPropertyRuneSerrating",
  anarchic: "PF2E.WeaponPropertyRuneAnarchic",
  axiomatic: "PF2E.WeaponPropertyRuneAxiomatic",
  holy: "PF2E.WeaponPropertyRuneHoly",
  unholy: "PF2E.WeaponPropertyRuneUnholy",
  dancing: "PF2E.WeaponPropertyRuneDancing",
  spellStoring: "PF2E.WeaponPropertyRuneSpellStoring",
  greaterBloodbane: "PF2E.WeaponPropertyRuneGreaterBloodbane",
  keen: "PF2E.WeaponPropertyRuneKeen",
  greaterDisrupting: "PF2E.WeaponPropertyRuneGreaterDisrupting",
  greaterCorrosive: "PF2E.WeaponPropertyRuneGreaterCorrosive",
  greaterFlaming: "PF2E.WeaponPropertyRuneGreaterFlaming",
  greaterFrost: "PF2E.WeaponPropertyRuneGreaterFrost",
  greaterShock: "PF2E.WeaponPropertyRuneGreaterShock",
  greaterThundering: "PF2E.WeaponPropertyRuneGreaterThundering",
  ancestralEchoing: "PF2E.WeaponPropertyRuneAncestralEchoing",
  speed: "PF2E.WeaponPropertyRuneSpeed",
  vorpal: "PF2E.WeaponPropertyRuneVorpal"
}; // Damage Types

CONFIG.damageTypes = {
  acid: 'PF2E.DamageTypeAcid',
  bludgeoning: 'PF2E.DamageTypeBludgeoning',
  cold: 'PF2E.DamageTypeCold',
  fire: 'PF2E.DamageTypeFire',
  force: 'PF2E.DamageTypeForce',
  electricity: 'PF2E.DamageTypeElectricity',
  sonic: 'PF2E.DamageTypeSonic',
  negative: 'PF2E.DamageTypeNegative',
  piercing: 'PF2E.DamageTypePiercing',
  poison: 'PF2E.DamageTypePoison',
  positive: 'PF2E.DamageTypePositive',
  bleed: 'PF2E.DamageTypeBleed',
  mental: 'PF2E.DamageTypeMental',
  precision: 'PF2E.DamageTypePrecision',
  slashing: 'PF2E.DamageTypeSlashing',
  chaotic: 'PF2E.DamageTypeChaotic',
  lawful: 'PF2E.DamageTypeLawful',
  good: 'PF2E.DamageTypeGood',
  evil: 'PF2E.DamageTypeEvil'
}; //Resistance Types

CONFIG.resistanceTypes = {
  acid: 'PF2E.DamageTypeAcid',
  bludgeoning: 'PF2E.DamageTypeBludgeoning',
  cold: 'PF2E.DamageTypeCold',
  fire: 'PF2E.DamageTypeFire',
  force: 'PF2E.DamageTypeForce',
  electricity: 'PF2E.DamageTypeElectricity',
  sonic: 'PF2E.DamageTypeSonic',
  negative: 'PF2E.DamageTypeNegative',
  piercing: 'PF2E.DamageTypePiercing',
  poison: 'PF2E.DamageTypePoison',
  positive: 'PF2E.DamageTypePositive',
  bleed: 'PF2E.DamageTypeBleed',
  mental: 'PF2E.DamageTypeMental',
  precision: 'PF2E.DamageTypePrecision',
  slashing: 'PF2E.DamageTypeSlashing',
  chaotic: 'PF2E.DamageTypeChaotic',
  lawful: 'PF2E.DamageTypeLawful',
  good: 'PF2E.DamageTypeGood',
  evil: 'PF2E.DamageTypeEvil',
  all: 'PF2E.ResistanceTypeAll',
  physical: 'PF2E.ResistanceTypePhysical'
};
CONFIG.stackGroups = {
  bolts: 'PF2E.StackGroupBolts',
  arrows: 'PF2E.StackGroupArrows',
  slingBullets: 'PF2E.StackGroupSlingBullets',
  blowgunDarts: 'PF2E.StackGroupBlowgunDarts',
  rations: 'PF2E.StackGroupRations',
  coins: 'PF2E.StackGroupCoins',
  gems: 'PF2E.StackGroupGems'
}; //Weakness Types

CONFIG.weaknessTypes = {
  acid: 'PF2E.DamageTypeAcid',
  bludgeoning: 'PF2E.DamageTypeBludgeoning',
  cold: 'PF2E.DamageTypeCold',
  fire: 'PF2E.DamageTypeFire',
  force: 'PF2E.DamageTypeForce',
  electricity: 'PF2E.DamageTypeElectricity',
  sonic: 'PF2E.DamageTypeSonic',
  negative: 'PF2E.DamageTypeNegative',
  piercing: 'PF2E.DamageTypePiercing',
  poison: 'PF2E.DamageTypePoison',
  positive: 'PF2E.DamageTypePositive',
  bleed: 'PF2E.DamageTypeBleed',
  light: 'PF2E.DamageTypeLight',
  mental: 'PF2E.DamageTypeMental',
  precision: 'PF2E.DamageTypePrecision',
  slashing: 'PF2E.DamageTypeSlashing',
  chaotic: 'PF2E.DamageTypeChaotic',
  lawful: 'PF2E.DamageTypeLawful',
  good: 'PF2E.DamageTypeGood',
  evil: 'PF2E.DamageTypeEvil',
  adamantine: 'PF2E.WeaknessTypeAdamantine',
  coldiron: 'PF2E.WeaknessTypeColdIron',
  darkwood: 'PF2E.WeaknessTypeDarkwood',
  mithral: 'PF2E.WeaknessTypeMithral',
  orichalcum: 'PF2E.WeaknessTypeOrichalcum',
  silver: 'PF2E.WeaknessTypeSilver',
  'area-damage': 'PF2E.WeaknessTypeAreaDamage',
  'splash-damage': 'PF2E.WeaknessTypeSplashDamage'
}; // Weapon Damage Types

CONFIG.weaponDamage = {
  bludgeoning: 'PF2E.DamageTypeBludgeoning',
  piercing: 'PF2E.DamageTypePiercing',
  slashing: 'PF2E.DamageTypeSlashing',
  modular: 'PF2E.DamageTypeModular'
}; // Healing Types

CONFIG.healingTypes = {
  healing: 'PF2E.HealingTypeHealing',
  temphp: 'PF2E.HealingTypeTemporaryHealing'
}; // Weapon Types

CONFIG.weaponTypes = {
  simple: 'PF2E.WeaponTypeSimple',
  martial: 'PF2E.WeaponTypeMartial',
  advanced: 'PF2E.WeaponTypeAdvanced',
  unarmed: 'PF2E.WeaponTypeUnarmed'
}; // Weapon Types

CONFIG.weaponGroups = {
  club: 'PF2E.WeaponGroupClub',
  knife: 'PF2E.WeaponGroupKnife',
  brawling: 'PF2E.WeaponGroupBrawling',
  spear: 'PF2E.WeaponGroupSpear',
  sword: 'PF2E.WeaponGroupSword',
  axe: 'PF2E.WeaponGroupAxe',
  flail: 'PF2E.WeaponGroupFlail',
  polearm: 'PF2E.WeaponGroupPolearm',
  pick: 'PF2E.WeaponGroupPick',
  hammer: 'PF2E.WeaponGroupHammer',
  shield: 'PF2E.WeaponGroupShield',
  dart: 'PF2E.WeaponGroupDart',
  bow: 'PF2E.WeaponGroupBow',
  sling: 'PF2E.WeaponGroupSling',
  bomb: 'PF2E.WeaponGroupBomb'
}; // Weapon Descriptions

CONFIG.weaponDescriptions = {
  club: 'PF2E.WeaponDescriptionClub',
  knife: 'PF2E.WeaponDescriptionKnife',
  brawling: 'PF2E.WeaponDescriptionBrawling',
  spear: 'PF2E.WeaponDescriptionSpear',
  sword: 'PF2E.WeaponDescriptionSword',
  axe: 'PF2E.WeaponDescriptionAxe',
  flail: 'PF2E.WeaponDescriptionFlail',
  polearm: 'PF2E.WeaponDescriptionPolearm',
  pick: 'PF2E.WeaponDescriptionPick',
  hammer: 'PF2E.WeaponDescriptionHammer',
  shield: 'PF2E.WeaponDescriptionShield',
  dart: 'PF2E.WeaponDescriptionDart',
  bow: 'PF2E.WeaponDescriptionBow',
  sling: 'PF2E.WeaponDescriptionSling',
  bomb: 'PF2E.WeaponDescriptionBomb'
};
CONFIG.usageTraits = {
  'held-in-one-hand': 'PF2E.TraitHeldOneHand',
  'held-in-two-hands': 'PF2E.TraitHeldTwoHands',
  bonded: 'PF2E.TraitBonded',
  worn: 'PF2E.TraitWorn',
  wornanklets: 'PF2E.TraitWornAnklets',
  wornbarding: 'PF2E.TraitWornBarding',
  wornbelt: 'PF2E.TraitWornBelt',
  wornbracers: 'PF2E.TraitWornBracers',
  worncloak: 'PF2E.TraitWornCloak',
  worncirclet: 'PF2E.TraitWornCirclet',
  worncollar: 'PF2E.TraitWornCollar',
  wornepaulet: 'PF2E.TraitWornEpaulet',
  worneyepiece: 'PF2E.TraitWornEyepiece',
  wornnecklace: 'PF2E.TraitWornNecklace',
  wornheadwear: 'PF2E.TraitWornHeadwear',
  worngloves: 'PF2E.TraitWornGloves',
  wornmask: 'PF2E.TraitWornMask',
  wornshoes: 'PF2E.TraitWornShoes',
  wornhorseshoes: 'PF2E.TraitWornHorseshoes',
  wornsaddle: 'PF2E.TraitWornSaddle',
  'etched-onto-armor': 'PF2E.TraitEtchedOntoAArmor',
  'etched-onto-a-weapon': 'PF2E.TraitEtchedOntoAWeapon',
  wornwrist: 'PF2E.TraitWornOnWrists',
};
CONFIG.rarityTraits = {
  common: 'PF2E.TraitCommon',
  uncommon: 'PF2E.TraitUncommon',
  rare: 'PF2E.TraitRare',
  unique: 'PF2E.TraitUnique'
}; // Spell Traditions

CONFIG.spellTraditions = {
  arcane: 'PF2E.TraitArcane',
  divine: 'PF2E.TraitDivine',
  occult: 'PF2E.TraitOccult',
  primal: 'PF2E.TraitPrimal'
}; // Magic Traditon

CONFIG.magicTraditions = {
  focus: 'PF2E.TraitFocus',
  ritual: 'PF2E.TraitRitual',
  scroll: 'PF2E.TraitScroll',
  wand: 'PF2E.TraitWand'
};
mergeObject(CONFIG.magicTraditions, CONFIG.spellTraditions);
CONFIG.magicalSchools = {
  abjuration: 'PF2E.TraitAbjuration',
  conjuration: 'PF2E.TraitConjuration',
  divination: 'PF2E.TraitDivination',
  enchantment: 'PF2E.TraitEnchantment',
  evocation: 'PF2E.TraitEvocation',
  illusion: 'PF2E.TraitIllusion',
  necromancy: 'PF2E.TraitNecromancy',
  transmutation: 'PF2E.TraitTransmutation'
}; // Spell Schools

CONFIG.spellSchools = {
  abj: 'PF2E.SpellSchoolAbj',
  con: 'PF2E.SpellSchoolCon',
  div: 'PF2E.SpellSchoolDiv',
  enc: 'PF2E.SpellSchoolEnc',
  evo: 'PF2E.SpellSchoolEvo',
  ill: 'PF2E.SpellSchoolIll',
  nec: 'PF2E.SpellSchoolNec',
  trs: 'PF2E.SpellSchoolTrs'
};
CONFIG.classTraits = {
  alchemist: 'PF2E.TraitAlchemist',
  barbarian: 'PF2E.TraitBarbarian',
  bard: 'PF2E.TraitBard',
  champion: 'PF2E.TraitChampion',
  cleric: 'PF2E.TraitCleric',
  druid: 'PF2E.TraitDruid',
  fighter: 'PF2E.TraitFighter',
  monk: 'PF2E.TraitMonk',
  ranger: 'PF2E.TraitRanger',
  rogue: 'PF2E.TraitRogue',
  sorcerer: 'PF2E.TraitSorcerer',
  wizard: 'PF2E.TraitWizard'
}; // Ancestry Traits

CONFIG.ancestryTraits = {
  dwarf: 'PF2E.TraitDwarf',
  elf: 'PF2E.TraitElf',
  gnome: 'PF2E.TraitGnome',
  goblin: 'PF2E.TraitGoblin',
  halfelf: 'PF2E.TraitHalfElf',
  halfling: 'PF2E.TraitHalfling',
  halforc: 'PF2E.TraitHalfOrc',
  human: 'PF2E.TraitHuman',
  hobgoblin: 'PF2E.TraitHobgoblin',
  leshy: 'PF2E.TraitLeshy',
  lizardfolk: 'PF2E.TraitLizardfolk',
  aasimar: 'PF2E.TraitAasimar',
  catfolk: 'PF2E.TraitCatfolk',
  changeling: 'PF2E.TraitChangeling',
  geniekin: 'PF2E.TraitGeniekin',
  tiefling: 'PF2E.TraitTiefling',
  shoony: 'PF2E.TraitShoony'
}; // Weapon Properties

CONFIG.weaponTraits = {
  acid: 'PF2E.TraitAcid',
  alchemical: 'PF2E.TraitAlchemical',
  agile: 'PF2E.TraitAgile',
  attached: 'PF2E.TraitAttached',
  backstabber: 'PF2E.TraitBackstabber',
  backswing: 'PF2E.TraitBackswing',
  bomb: 'PF2E.TraitBomb',
  brutal: 'PF2E.TraitBrutal',
  cold: 'PF2E.TraitCold',
  coldiron: 'PF2E.TraitColdiron',
  consumable: 'PF2E.TraitConsumable',
  'deadly-d6': 'PF2E.TraitDeadlyD6',
  'deadly-d8': 'PF2E.TraitDeadlyD8',
  'deadly-d10': 'PF2E.TraitDeadlyD10',
  'deadly-d12': 'PF2E.TraitDeadlyD12',
  disarm: 'PF2E.TraitDisarm',
  electricity: 'PF2E.TraitElectricity',
  'fatal-d8': 'PF2E.TraitFatalD8',
  'fatal-d10': 'PF2E.TraitFatalD10',
  'fatal-d12': 'PF2E.TraitFatalD12',
  finesse: 'PF2E.TraitFinesse',
  fire: 'PF2E.TraitFire',
  forceful: 'PF2E.TraitForceful',
  'free-hand': 'PF2E.TraitFreeHand',
  grapple: 'PF2E.TraitGrapple',
  improvised: 'PF2E.TraitImprovised',
  'jousting-d6': 'PF2E.TraitJoustingD6',
  magical: 'PF2E.TraitMagical',
  nonlethal: 'PF2E.TraitNonlethal',
  parry: 'PF2E.TraitParry',
  propulsive: 'PF2E.TraitPropulsive',
  range: 'PF2E.TraitRare',
  'range-increment-10': 'PF2E.TraitRangeIncrement10',
  'range-increment-20': 'PF2E.TraitRangeIncrement20',
  'range-increment-30': 'PF2E.TraitRangeIncrement30',
  'range-increment-40': 'PF2E.TraitRangeIncrement40',
  'range-increment-50': 'PF2E.TraitRangeIncrement50',
  'range-increment-60': 'PF2E.TraitRangeIncrement60',
  'range-increment-70': 'PF2E.TraitRangeIncrement70',
  'range-increment-80': 'PF2E.TraitRangeIncrement80',
  'range-increment-90': 'PF2E.TraitRangeIncrement90',
  'range-increment-100': 'PF2E.TraitRangeIncrement100',
  'range-increment-110': 'PF2E.TraitRangeIncrement110',
  'range-increment-120': 'PF2E.TraitRangeIncrement120',
  'range-increment-130': 'PF2E.TraitRangeIncrement130',
  'range-increment-140': 'PF2E.TraitRangeIncrement140',
  'range-increment-150': 'PF2E.TraitRangeIncrement150',
  'range-increment-160': 'PF2E.TraitRangeIncrement160',
  'range-increment-170': 'PF2E.TraitRangeIncrement170',
  'range-increment-180': 'PF2E.TraitRangeIncrement180',
  'range-increment-190': 'PF2E.TraitRangeIncrement190',
  'range-increment-200': 'PF2E.TraitRangeIncrement200',
  'range-increment-210': 'PF2E.TraitRangeIncrement210',
  'range-increment-220': 'PF2E.TraitRangeIncrement220',
  'range-increment-230': 'PF2E.TraitRangeIncrement230',
  'range-increment-240': 'PF2E.TraitRangeIncrement240',
  'range-increment-250': 'PF2E.TraitRangeIncrement250',
  'range-increment-260': 'PF2E.TraitRangeIncrement260',
  'range-increment-270': 'PF2E.TraitRangeIncrement270',
  'range-increment-280': 'PF2E.TraitRangeIncrement280',
  'range-increment-290': 'PF2E.TraitRangeIncrement290',
  'range-increment-300': 'PF2E.TraitRangeIncrement300',
  'range-increment-310': 'PF2E.TraitRangeIncrement310',
  'range-increment-320': 'PF2E.TraitRangeIncrement320',
  'ranged-trip': 'PF2E.TraitRangedTrip',
  reach: 'PF2E.TraitReach',
  'reach-10': 'PF2E.TraitReach10',
  'reach-15': 'PF2E.TraitReach15',
  'reach-20': 'PF2E.TraitReach20',
  'reach-25': 'PF2E.TraitReach25',
  'reload-0': 'PF2E.TraitReload0',
  'reload-1': 'PF2E.TraitReload1',
  'reload-2': 'PF2E.TraitReload2',
  shove: 'PF2E.TraitShove',
  sonic: 'PF2E.TraitSonic',
  splash: 'PF2E.TraitSplash',
  sweep: 'PF2E.TraitSweep',
  tethered: 'PF2E.TraitTethered',
  'thrown-10': 'PF2E.TraitThrown10',
  'thrown-20': 'PF2E.TraitThrown20',
  'thrown-30': 'PF2E.TraitThrown30',
  'thrown-40': 'PF2E.TraitThrown40',
  trip: 'PF2E.TraitTrip',
  twin: 'PF2E.TraitTwin',
  'two-hand-d8': 'PF2E.TraitTwoHandD8',
  'two-hand-d10': 'PF2E.TraitTwoHandD10',
  'two-hand-d12': 'PF2E.TraitTwoHandD12',
  unarmed: 'PF2E.TraitUnarmed',
  'versatile-s': 'PF2E.TraitVersatileS',
  'versatile-p': 'PF2E.TraitVersatileP',
  'versatile-b': 'PF2E.TraitVersatileB',
  'volley-30': 'PF2E.TraitVolley30',
  uncommon: 'PF2E.TraitUncommon',
  unique: 'PF2E.TraitUnique',
  'modular-b-P-or-s': 'PF2E.TraitModular'
};
mergeObject(CONFIG.weaponTraits, CONFIG.classTraits);
mergeObject(CONFIG.weaponTraits, CONFIG.ancestryTraits);
mergeObject(CONFIG.weaponTraits, CONFIG.magicalSchools);
CONFIG.armorTraits = {
  bulwark: "PF2E.TraitBulwark",
  comfort: "PF2E.TraitComfort",
  flexible: "PF2E.TraitFlexible",
  noisy: "PF2E.TraitNoisy",
  apex: "PF2E.TraitApex",
  invested: "PF2E.TraitInvested",
  artifact: "PF2E.TraitArtifact",
  intelligent: "PF2E.TraitIntelligent",
  magical: "PF2E.TraitMagical"
};
mergeObject(CONFIG.armorTraits, CONFIG.magicalSchools); // Weapon Properties

CONFIG.equipmentTraits = {
  extradimensional: "PF2E.TraitExtradimensional",
  apex: "PF2E.TraitApex",
  artifact: "PF2E.TraitArtifact",
  cursed: "PF2E.TraitCursed",
  invested: "PF2E.TraitInvested",
  saggorak: "PF2E.TraitSaggorak",
  staff: "PF2E.TraitStaff",
  structure: "PF2E.TraitStructure",
  tattoo: "PF2E.TraitTattoo",
  wand: "PF2E.TraitWand"
};
mergeObject(CONFIG.equipmentTraits, CONFIG.magicalSchools);
CONFIG.consumableTraits = {
  bomb: "PF2E.TraitBomb",
  consumable: "PF2E.TraitConsumable",
  drug: "PF2E.TraitDrug",
  elixir: "PF2E.TraitElixir",
  mutagen: "PF2E.TraitMutagen",
  oil: "PF2E.TraitOil",
  potion: "PF2E.TraitPotion",
  scroll: "PF2E.TraitScroll",
  snare: "PF2E.TraitSnare",
  trap: "PF2E.TraitTrap",
  mechanical: "PF2E.TraitMechanical",
  talisman: "PF2E.TraitTalisman",
  contact: "PF2E.TraitContact",
  ingested: "PF2E.TraitIngested",
  inhaled: "PF2E.TraitInhaled",
  injury: "PF2E.TraitInjury",
  poison: "PF2E.TraitPoison",
  alchemical: "PF2E.TraitAlchemical",
  virulent: "PF2E.TraitVirulent",
  healing: "PF2E.TraitHealing",
  magical: "PF2E.TraitMagical",
  arcane: "PF2E.TraitArcane"
};
mergeObject(CONFIG.consumableTraits, CONFIG.magicalSchools); // Spell Traits

CONFIG.spellTraits = {
  attack: 'PF2E.TraitAttack',
  disease: 'PF2E.TraitDisease',
  polymorph: 'PF2E.TraitPolymorph',
  incapacitation: 'PF2E.TraitIncapacitation',
  plant: 'PF2E.TraitPlant',
  teleportation: 'PF2E.TraitTeleportation',
  visual: 'PF2E.TraitVisual',
  emotion: 'PF2E.TraitEmotion',
  light: 'PF2E.TraitLight',
  darkness: 'PF2E.TraitDarkness',
  death: 'PF2E.TraitDeath',
  scrying: 'PF2E.TraitScrying',
  detection: 'PF2E.TraitDetection',
  composition: 'PF2E.TraitComposition',
  water: 'PF2E.TraitWater',
  healing: 'PF2E.TraitHealing',
  cantrip: 'PF2E.TraitCantrip',
  nonlethal: 'PF2E.TraitNonlethal',
  earth: 'PF2E.TraitEarth',
  curse: 'PF2E.TraitCurse',
  misfortune: 'PF2E.TraitMisfortune',
  fungus: 'PF2E.TraitFungus',
  linguistic: 'PF2E.TraitLinguistic',
  morph: 'PF2E.TraitMorph'
};
mergeObject(CONFIG.spellTraits, CONFIG.damageTypes);
mergeObject(CONFIG.spellTraits, CONFIG.spellTraditions);
mergeObject(CONFIG.spellTraits, CONFIG.magicalSchools);
mergeObject(CONFIG.spellTraits, CONFIG.classTraits); // Feat Traits

CONFIG.featTraits = {
  move: 'PF2E.TraitMove',
  manipulate: 'PF2E.TraitManipulate',
  concentrate: 'PF2E.TraitConcentrate',
  rage: 'PF2E.TraitRage',
  general: 'PF2E.TraitGeneral',
  skill: 'PF2E.TraitSkill',
  fortune: 'PF2E.TraitFortune',
  downtime: 'PF2E.TraitDowntime',
  secret: 'PF2E.TraitSecret',
  additive1: 'PF2E.TraitAdditive1',
  additive2: 'PF2E.TraitAdditive2',
  additive3: 'PF2E.TraitAdditive3',
  air: 'PF2E.TraitAir',
  archetype: 'PF2E.TraitArchetype',
  auditory: 'PF2E.TraitAuditory',
  dedication: 'PF2E.TraitDedication',
  detection: 'PF2E.TraitDetection',
  emotion: 'PF2E.TraitEmotion',
  exploration: 'PF2E.TraitExploration',
  fear: 'PF2E.TraitFear',
  flourish: 'PF2E.TraitFlourish',
  'half-Elf': 'PF2E.TraitHalfElf',
  'half-Orc': 'PF2E.TraitHalfOrc',
  instinct: 'PF2E.TraitInstinct',
  magical: 'PF2E.TraitMagical',
  metamagic: 'PF2E.TraitMetamagic',
  multiclass: 'PF2E.TraitMulticlass',
  oath: 'PF2E.TraitOath',
  open: 'PF2E.TraitOpen',
  press: 'PF2E.TraitPress',
  stance: 'PF2E.TraitStance',
  stamina: 'PF2E.TraitStamina',
  alchemical: 'PF2E.TraitAlchemical',
  interact: 'PF2E.TraitInteract',
  aura: 'PF2E.TraitAura',
  olfactory: 'PF2E.TraitOlfactory'
};
mergeObject(CONFIG.featTraits, CONFIG.ancestryTraits);
mergeObject(CONFIG.featTraits, CONFIG.classTraits);
mergeObject(CONFIG.featTraits, CONFIG.spellTraditions);
mergeObject(CONFIG.featTraits, CONFIG.magicalSchools);
mergeObject(CONFIG.featTraits, CONFIG.damageTypes);
mergeObject(CONFIG.featTraits, CONFIG.spellTraits);
CONFIG.monsterTraits = {
  aberration: 'PF2E.TraitAberration',
  acid: 'PF2E.TraitAcid',
  aeon: 'PF2E.TraitAeon',
  air: 'PF2E.TraitAir',
  alchemical: 'PF2E.TraitAlchemical',
  amphibious: 'PF2E.TraitAmphibious',
  anadi: 'PF2E.TraitAnadi',
  angel: 'PF2E.TraitAngel',
  animal: 'PF2E.TraitAnimal',
  aquatic: 'PF2E.TraitAquatic',
  archon: 'PF2E.TraitArchon',
  astral: 'PF2E.TraitAstral',
  azata: 'PF2E.TraitAzata',
  beast: 'PF2E.TraitBeast',
  boggard: 'PF2E.TraitBoggard',
  caligni: 'PF2E.TraitCaligni',
  celestial: 'PF2E.TraitCelestial',
  'charau-ka': 'PF2E.TraitCharauKa',
  cold: 'PF2E.TraitCold',
  construct: 'PF2E.TraitConstruct',
  daemon: 'PF2E.TraitDaemon',
  demon: 'PF2E.TraitDemon',
  dero: 'PF2E.TraitDero',
  devil: 'PF2E.TraitDevil',
  dhampir: 'PF2E.TraitDhampir',
  dinosaur: 'PF2E.TraitDinosaur',
  dragon: 'PF2E.TraitDragon',
  drow: 'PF2E.TraitDrow',
  duergar: 'PF2E.TraitDuergar',
  duskwalker: 'PF2E.TraitDuskwalker',
  earth: 'PF2E.TraitEarth',
  elemental: 'PF2E.TraitElemental',
  ethereal: 'PF2E.TraitEthereal',
  fey: 'PF2E.TraitFey',
  fiend: 'PF2E.TraitFiend',
  fungus: 'PF2E.TraitFungus',
  genie: 'PF2E.TraitGenie',
  ghost: 'PF2E.TraitGhost',
  ghoul: 'PF2E.TraitGhoul',
  giant: 'PF2E.TraitGiant',
  gnoll: 'PF2E.TraitGnoll',
  golem: 'PF2E.TraitGolem',
  gremlin: 'PF2E.TraitGremlin',
  grippli: 'PF2E.TraitGrippli',
  hag: 'PF2E.TraitHag',
  humanoid: 'PF2E.TraitHumanoid',
  incorporeal: 'PF2E.TraitIncorporeal',
  inevitable: 'PF2E.TraitInevitable',
  kobold: 'PF2E.TraitKobold',
  merfolk: 'PF2E.TraitMerfolk',
  mindless: 'PF2E.TraitMindless',
  monitor: 'PF2E.TraitMonitor',
  mummy: 'PF2E.TraitMummy',
  mutant: 'PF2E.TraitMutant',
  nymph: 'PF2E.TraitNymph',
  ooze: 'PF2E.TraitOoze',
  orc: 'PF2E.TraitOrc',
  plant: 'PF2E.TraitPlant',
  protean: 'PF2E.TraitProtean',
  psychopomp: 'PF2E.TraitPsychopomp',
  rakshasa: 'PF2E.TraitRakshasa',
  ratfolk: 'PF2E.TraitRatfolk',
  'sea devil': 'PF2E.TraitSeaDevil',
  skeleton: 'PF2E.TraitSkeleton',
  soulbound: 'PF2E.TraitSoulbound',
  spirit: 'PF2E.TraitSpirit',
  sprite: 'PF2E.TraitSprite',
  swarm: 'PF2E.TraitSwarm',
  tengu: 'PF2E.TraitTengu',
  troll: 'PF2E.TraitTroll',
  undead: 'PF2E.TraitUndead',
  vampire: 'PF2E.TraitVampire',
  velstrac: 'PF2E.TraitVelstrac',
  water: 'PF2E.TraitWater',
  werecreature: 'PF2E.TraitWerecreature',
  wight: 'PF2E.TraitWight',
  wraith: 'PF2E.TraitWraith',
  xulgath: 'PF2E.TraitXulgath',
  zombie: 'PF2E.TraitZombie'
};
mergeObject(CONFIG.monsterTraits, CONFIG.ancestryTraits);
mergeObject(CONFIG.monsterTraits, CONFIG.damageTypes);
CONFIG.hazardTraits = {
  environmental: 'PF2E.TraitEnvironmental',
  haunt: 'PF2E.TraitHaunt',
  magical: 'PF2E.TraitMagical',
  mechanical: 'PF2E.TraitMechanical'
};
mergeObject(CONFIG.hazardTraits, CONFIG.damageTypes);
mergeObject(CONFIG.hazardTraits, CONFIG.magicalSchools);
mergeObject(CONFIG.hazardTraits, CONFIG.damageTypes); // Traits Descriptions
// TODO: Compute these!

CONFIG.traitsDescriptions = {
  common: 'PF2E.TraitDescriptionCommon',
  uncommon: 'PF2E.TraitDescriptionUncommon',
  rare: 'PF2E.TraitDescriptionRare',
  unique: 'PF2E.TraitDescriptionUnique',
  agile: 'PF2E.TraitDescriptionAgile',
  attached: 'PF2E.TraitDescriptionAttached',
  backstabber: 'PF2E.TraitDescriptionBackstabber',
  backswing: 'PF2E.TraitDescriptionBackswing',
  bomb: 'PF2E.TraitDescriptionBomb',
  'deadly-d6': 'PF2E.TraitDescriptionDeadlyD6',
  'deadly-d8': 'PF2E.TraitDescriptionDeadlyD8',
  'deadly-d10': 'PF2E.TraitDescriptionDeadlyD10',
  'deadly-d12': 'PF2E.TraitDescriptionDeadlyD12',
  disarm: 'PF2E.TraitDescriptionDisarm',
  dwarf: 'PF2E.TraitDescriptionDwarf',
  elf: 'PF2E.TraitDescriptionElf',
  'fatal-d8': 'PF2E.TraitDescriptionFatalD8',
  'fatal-d10': 'PF2E.TraitDescriptionFatalD10',
  'fatal-d12': 'PF2E.TraitDescriptionFatalD12',
  finesse: 'PF2E.TraitDescriptionFinesse',
  forceful: 'PF2E.TraitDescriptionForceful',
  'free-hand': 'PF2E.TraitDescriptionFreeHand',
  gnome: 'PF2E.TraitDescriptionGnome',
  goblin: 'PF2E.TraitDescriptionGoblin',
  grapple: 'PF2E.TraitDescriptionGrapple',
  halfling: 'PF2E.TraitDescriptionHalfling',
  'jousting-d6': 'PF2E.TraitDescriptionJoustingD6',
  monk: 'PF2E.TraitDescriptionMonkWeapon',
  nonlethal: 'PF2E.TraitDescriptionNonlethal',
  orc: 'PF2E.TraitDescriptionOrc',
  parry: 'PF2E.TraitDescriptionParry',
  propulsive: 'PF2E.TraitDescriptionPropulsive',
  range: 'PF2E.TraitDescriptionRange',
  'ranged-trip': 'PF2E.TraitDescriptionRangedTrip',
  reach: 'PF2E.TraitDescriptionReach',
  'reach-10': 'PF2E.TraitDescriptionReach10',
  'reach-15': 'PF2E.TraitDescriptionReach15',
  'reach-20': 'PF2E.TraitDescriptionReach20',
  'reach-25': 'PF2E.TraitDescriptionReach25',
  shove: 'PF2E.TraitDescriptionShove',
  sweep: 'PF2E.TraitDescriptionSweep',
  tethered: 'PF2E.TraitDescriptionTethered',
  'thrown-10': 'PF2E.TraitDescriptionThrown10',
  'thrown-20': 'PF2E.TraitDescriptionThrown20',
  'thrown-30': 'PF2E.TraitDescriptionThrown30',
  'thrown-40': 'PF2E.TraitDescriptionThrown40',
  trip: 'PF2E.TraitDescriptionTrip',
  twin: 'PF2E.TraitDescriptionTwin',
  'two-hand-d8': 'PF2E.TraitDescriptionTwoHandD8',
  'two-hand-d10': 'PF2E.TraitDescriptionTwoHandD10',
  'two-hand-d12': 'PF2E.TraitDescriptionTwoHandD12',
  unarmed: 'PF2E.TraitDescriptionUnarmed',
  'versatile-s': 'PF2E.TraitDescriptionVersatileS',
  'versatile-p': 'PF2E.TraitDescriptionVersatileP',
  'versatile-b': 'PF2E.TraitDescriptionVersatileB',
  'volley-30': 'PF2E.TraitDescriptionVolley30',
  attack: 'PF2E.TraitDescriptionAttack',
  consumable: 'PF2E.TraitDescriptionConsumable',
  death: 'PF2E.TraitDescriptionDeath',
  disease: 'PF2E.TraitDescriptionDisease',
  downtime: 'PF2E.TraitDescriptionDowntime',
  drug: 'PF2E.TraitDescriptionDrug',
  environement: 'PF2E.TraitDescriptionEnvironement',
  extradimensional: 'PF2E.TraitDescriptionExtradimensional',
  focused: 'PF2E.TraitDescriptionFocused',
  fortune: 'PF2E.TraitDescriptionFortune',
  general: 'PF2E.TraitDescriptionGeneral',
  haunt: 'PF2E.TraitDescriptionHaunt',
  healing: 'PF2E.TraitDescriptionHealing',
  incorporeal: 'PF2E.TraitDescriptionIncorporeal',
  infused: 'PF2E.TraitDescriptionInfused',
  light: 'PF2E.TraitDescriptionLight',
  linguistic: 'PF2E.TraitDescriptionLinguistic',
  litany: 'PF2E.TraitDescriptionLitany',
  mechanical: 'PF2E.TraitDescriptionMechanical',
  mental: 'PF2E.TraitDescriptionMental',
  minion: 'PF2E.TraitDescriptionMinion',
  misfortune: 'PF2E.TraitDescriptionMisfortune',
  move: 'PF2E.TraitDescriptionMove',
  possession: 'PF2E.TraitDescriptionPossession',
  precious: 'PF2E.TraitDescriptionPrecious',
  prediction: 'PF2E.TraitDescriptionPrediction',
  reload: 'PF2E.TraitDescriptionReload',
  revelation: 'PF2E.TraitDescriptionRevelation',
  scrying: 'PF2E.TraitDescriptionScrying',
  shadow: 'PF2E.TraitDescriptionShadow',
  sleep: 'PF2E.TraitDescriptionSleep',
  splash: 'PF2E.TraitDescriptionSplash',
  summoned: 'PF2E.TraitDescriptionSummoned',
  tattoo: 'PF2E.TraitDescriptionTattoo',
  teleportation: 'PF2E.TraitDescriptionTeleportation',
  trap: 'PF2E.TraitDescriptionTrap',
  virulent: 'PF2E.TraitDescriptionVirulent',
  skill: 'PF2E.TraitDescriptionSkill',
  'half-elf': 'PF2E.TraitDescriptionHalfElf',
  'half-orc': 'PF2E.TraitDescriptionHalfOrc',
  human: 'PF2E.TraitDescriptionHuman',
  manipulate: 'PF2E.TraitDescriptionManipulate',
  additive1: 'PF2E.TraitDescriptionAdditive1',
  additive2: 'PF2E.TraitDescriptionAdditive2',
  additive3: 'PF2E.TraitDescriptionAdditive3',
  alchemical: 'PF2E.TraitDescriptionAlchemical',
  archetype: 'PF2E.TraitDescriptionArchetype',
  auditory: 'PF2E.TraitDescriptionAuditory',
  aura: 'PF2E.TraitDescriptionAura',
  cantrip: 'PF2E.TraitDescriptionCantrip',
  companion: 'PF2E.TraitDescriptionCompanion',
  composition: 'PF2E.TraitDescriptionComposition',
  concentrate: 'PF2E.TraitDescriptionConcentrate',
  consecration: 'PF2E.TraitDescriptionConsecration',
  contact: 'PF2E.TraitDescriptionContact',
  curse: 'PF2E.TraitDescriptionCurse',
  darkness: 'PF2E.TraitDescriptionDarkness',
  dedication: 'PF2E.TraitDescriptionDedication',
  detection: 'PF2E.TraitDescriptionDetection',
  emotion: 'PF2E.TraitDescriptionEmotion',
  exploration: 'PF2E.TraitDescriptionExploration',
  fear: 'PF2E.TraitDescriptionFear',
  flourish: 'PF2E.TraitDescriptionFlourish',
  incapacitation: 'PF2E.TraitDescriptionIncapacitation',
  instinct: 'PF2E.TraitDescriptionInstinct',
  magical: 'PF2E.TraitDescriptionMagical',
  metamagic: 'PF2E.TraitDescriptionMetamagic',
  morph: 'PF2E.TraitDescriptionMorph',
  multiclass: 'PF2E.TraitDescriptionMulticlass',
  oath: 'PF2E.TraitDescriptionOath',
  open: 'PF2E.TraitDescriptionOpen',
  polymorph: 'PF2E.TraitDescriptionPolymorph',
  press: 'PF2E.TraitDescriptionPress',
  rage: 'PF2E.TraitDescriptionRage',
  secret: 'PF2E.TraitDescriptionSecret',
  stance: 'PF2E.TraitDescriptionStance',
  visual: 'PF2E.TraitDescriptionVisual',
  chaotic: 'PF2E.TraitDescriptionChaotic',
  evil: 'PF2E.TraitDescriptionEvil',
  good: 'PF2E.TraitDescriptionGood',
  lawful: 'PF2E.TraitDescriptionLawful',
  arcane: 'PF2E.TraitDescriptionArcane',
  divine: 'PF2E.TraitDescriptionDivine',
  occult: 'PF2E.TraitDescriptionOccult',
  primal: 'PF2E.TraitDescriptionPrimal',
  air: 'PF2E.TraitDescriptionAir',
  earth: 'PF2E.TraitDescriptionEarth',
  fire: 'PF2E.TraitDescriptionFire',
  water: 'PF2E.TraitDescriptionWater',
  abjuration: 'PF2E.TraitDescriptionAbjuration',
  conjuration: 'PF2E.TraitDescriptionConjuration',
  divination: 'PF2E.TraitDescriptionDivination',
  enchantment: 'PF2E.TraitDescriptionEnchantment',
  evocation: 'PF2E.TraitDescriptionEvocation',
  illusion: 'PF2E.TraitDescriptionIllusion',
  necromancy: 'PF2E.TraitDescriptionNecromancy',
  transmutation: 'PF2E.TraitDescriptionTransmutation',
  acid: 'PF2E.TraitDescriptionAcid',
  cold: 'PF2E.TraitDescriptionCold',
  electricity: 'PF2E.TraitDescriptionElectricity',
  force: 'PF2E.TraitDescriptionForce',
  positive: 'PF2E.TraitDescriptionPositive',
  sonic: 'PF2E.TraitDescriptionSonic',
  negative: 'PF2E.TraitDescriptionNegative',
  complex: 'PF2E.TraitDescriptionComplex',
  alchemist: 'PF2E.TraitDescriptionAlchemist',
  barbarian: 'PF2E.TraitDescriptionBarbarian',
  bard: 'PF2E.TraitDescriptionBard',
  champion: 'PF2E.TraitDescriptionChampion',
  cleric: 'PF2E.TraitDescriptionCleric',
  druid: 'PF2E.TraitDescriptionDruid',
  fighter: 'PF2E.TraitDescriptionFighter',
  monk: 'PF2E.TraitDescriptionMonk',
  ranger: 'PF2E.TraitDescriptionRanger',
  rogue: 'PF2E.TraitDescriptionRogue',
  sorcerer: 'PF2E.TraitDescriptionSorcerer',
  wizard: 'PF2E.TraitDescriptionWizard',
  bulwark: 'PF2E.TraitDescriptionBulwark',
  comfort: 'PF2E.TraitDescriptionComfort',
  flexible: 'PF2E.TraitDescriptionFlexible',
  noisy: 'PF2E.TraitDescriptionNoisy',
  ingested: 'PF2E.TraitDescriptionIngested',
  inhaled: 'PF2E.TraitDescriptionInhaled',
  injury: 'PF2E.TraitDescriptionInjury',
  poison: 'PF2E.TraitDescriptionPoison'
}; // Weapon Hands

CONFIG.weaponHands = {
  1: 'PF2E.WeaponHands1',
  '1+': 'PF2E.WeaponHands1Plus',
  2: 'PF2E.WeaponHands2'
}; // Item Bonus

CONFIG.itemBonuses = {
  '-2': 'PF2E.ItemBonusMinus2',
  0: 'PF2E.ItemBonus0',
  1: 'PF2E.ItemBonus1',
  2: 'PF2E.ItemBonus2',
  3: 'PF2E.ItemBonus3'
}; // Damage Dice

CONFIG.damageDice = {
  1: '1',
  2: '2',
  3: '3',
  4: '4'
}; // Damage Die

CONFIG.damageDie = {
  d4: 'PF2E.DamageDieD4',
  d6: 'PF2E.DamageDieD6',
  d8: 'PF2E.DamageDieD8',
  d10: 'PF2E.DamageDieD10',
  d12: 'PF2E.DamageDieD12'
}; // Weapon Range

CONFIG.weaponRange = {
  melee: 'PF2E.WeaponRangeMelee',
  reach: 'PF2E.WeaponRangeReach',
  10: 'PF2E.WeaponRange10',
  20: 'PF2E.WeaponRange20',
  30: 'PF2E.WeaponRange30',
  40: 'PF2E.WeaponRange40',
  50: 'PF2E.WeaponRange50',
  60: 'PF2E.WeaponRange60',
  80: 'PF2E.WeaponRange80',
  100: 'PF2E.WeaponRange100',
  120: 'PF2E.WeaponRange120',
  140: 'PF2E.WeaponRange140'
}; // TODO: Compute range!
// Weapon MAP

CONFIG.weaponMAP = {
  1: '-1/-2',
  2: '-2/-4',
  3: '-3/-6',
  4: '-4/-8',
  5: '-5/-10'
}; // Weapon Reload

CONFIG.weaponReload = {
  '-': '-',
  0: '0',
  1: '1',
  2: '2',
  3: '3'
}; // Armor Types

CONFIG.armorTypes = {
  unarmored: 'PF2E.ArmorTypeUnarmored',
  light: 'PF2E.ArmorTypeLight',
  medium: 'PF2E.ArmorTypeMedium',
  heavy: 'PF2E.ArmorTypeHeavy',
  shield: 'PF2E.ArmorTypeShield'
}; // Armor Groups

CONFIG.armorGroups = {
  leather: 'PF2E.ArmorGroupLeather',
  composite: 'PF2E.ArmorGroupComposite',
  chain: 'PF2E.ArmorGroupChain',
  plate: 'PF2E.ArmorGroupPlate'
}; // Consumable Types

CONFIG.consumableTypes = {
  ammo: 'PF2E.ConsumableTypeAmmo',
  bomb: 'PF2E.ConsumableTypeBomb',
  potion: 'PF2E.ConsumableTypePotion',
  oil: 'PF2E.ConsumableTypeOil',
  scroll: 'PF2E.ConsumableTypeScroll',
  talasman: 'PF2E.ConsumableTypeTalisman',
  snare: 'PF2E.ConsumableTypeSnare',
  drug: 'PF2E.ConsumableTypeDrug',
  elixir: 'PF2E.ConsumableTypeElixir',
  mutagen: 'PF2E.ConsumableTypeMutagen',
  other: 'PF2E.ConsumableTypeOther',
  poison: 'PF2E.ConsumableTypePoison',
  tool: 'PF2E.ConsumableTypeTool'
}; // Preparation Type

CONFIG.preparationType = {
  prepared: 'PF2E.PreparationTypePrepared',
  spontaneous: 'PF2E.PreparationTypeSpontaneous',
  innate: 'PF2E.PreparationTypeInnate'
}; // Area Types

CONFIG.areaTypes = {
  burst: 'PF2E.AreaTypeBurst',
  cone: 'PF2E.AreaTypeCone',
  emanation: 'PF2E.AreaTypeEmanation',
  line: 'PF2E.AreaTypeLine'
}; // Spell Saves

/* CONFIG.spellBasic = {
  "": "",
  "basic": "Basic"
} */
// Area Size

CONFIG.areaSizes = {
  5: 'PF2E.AreaSize5',
  10: 'PF2E.AreaSize10',
  15: 'PF2E.AreaSize15',
  20: 'PF2E.AreaSize20',
  30: 'PF2E.AreaSize30',
  40: 'PF2E.AreaSize40',
  50: 'PF2E.AreaSize50',
  60: 'PF2E.AreaSize60',
  120: 'PF2E.AreaSize120'
}; // Alignment

CONFIG.alignment = {
  LG: "PF2E.AlignmentLG",
  NG: "PF2E.AlignmentNG",
  CG: "PF2E.AlignmentCG",
  LN: "PF2E.AlignmentLN",
  N: "PF2E.AlignmentN",
  CN: "PF2E.AlignmentCN",
  LE: "PF2E.AlignmentLE",
  NE: "PF2E.AlignmentNE",
  CE: "PF2E.AlignmentCE"
}; // Skill List

CONFIG.skillList = {
  acrobatics: 'PF2E.SkillAcrobatics',
  arcana: 'PF2E.SkillArcana',
  athletics: 'PF2E.SkillAthletics',
  crafting: 'PF2E.SkillCrafting',
  deception: 'PF2E.SkillDeception',
  diplomacy: 'PF2E.SkillDiplomacy',
  intimidation: 'PF2E.SkillIntimidation',
  medicine: 'PF2E.SkillMedicine',
  nature: 'PF2E.SkillNature',
  occultism: 'PF2E.SkillOccultism',
  performance: 'PF2E.SkillPerformance',
  religion: 'PF2E.SkillReligion',
  society: 'PF2E.SkillSociety',
  stealth: 'PF2E.SkillStealth',
  survival: 'PF2E.SkillSurvival',
  thievery: 'PF2E.SkillThievery',
  lore: 'PF2E.SkillLore'
}; // Spell Components

CONFIG.spellComponents = {
  V: 'PF2E.SpellComponentV',
  S: 'PF2E.SpellComponentS',
  M: 'PF2E.SpellComponentM'
}; // Spell Types

CONFIG.spellTypes = {
  attack: 'PF2E.SpellTypeAttack',
  save: 'PF2E.SpellTypeSave',
  heal: 'PF2E.SpellTypeHeal',
  utility: 'PF2E.SpellTypeUtility'
}; // Spell Levels

CONFIG.spellLevels = {
  0: 'PF2E.SpellLevel0',
  1: 'PF2E.SpellLevel1',
  2: 'PF2E.SpellLevel2',
  3: 'PF2E.SpellLevel3',
  4: 'PF2E.SpellLevel4',
  5: 'PF2E.SpellLevel5',
  6: 'PF2E.SpellLevel6',
  7: 'PF2E.SpellLevel7',
  8: 'PF2E.SpellLevel8',
  9: 'PF2E.SpellLevel9',
  10: 'PF2E.SpellLevel10'
}; // TODO: Compute levels!
// Feat Types

CONFIG.featTypes = {
  bonus: 'PF2E.FeatTypeBonus',
  ancestry: 'PF2E.FeatTypeAncestry',
  skill: 'PF2E.FeatTypeSkill',
  general: 'PF2E.FeatTypeGeneral',
  class: 'PF2E.FeatTypeClass',
  classfeature: 'PF2E.FeatTypeClassfeature',
  archetype: 'PF2E.FeatTypeArchetype',
  ancestryfeature: 'PF2E.FeatTypeAncestryfeature'
}; // Feat Action Types

CONFIG.featActionTypes = {
  passive: 'PF2E.FeatActionTypePassive',
  action: 'PF2E.FeatActionTypeAction',
  reaction: 'PF2E.FeatActionTypeReaction',
  free: 'PF2E.FeatActionTypeFree'
}; // Action Action Types

CONFIG.actionTypes = {
  action: 'PF2E.ActionTypeAction',
  reaction: 'PF2E.ActionTypeReaction',
  free: 'PF2E.ActionTypeFree',
  passive: 'PF2E.ActionTypePassive'
}; // Actions Number

CONFIG.actionsNumber = {
  1: 'PF2E.ActionNumber1',
  2: 'PF2E.ActionNumber2',
  3: 'PF2E.ActionNumber3'
};
CONFIG.actionCategories = {
  interaction: "PF2E.ActionCategoryInteraction",
  defensive: "PF2E.ActionCategoryDefensive",
  offensive: "PF2E.ActionCategoryOffensive"
}; // Proficiency Multipliers

CONFIG.proficiencyLevels = {
  0: 'PF2E.ProficiencyLevel0',
  1: 'PF2E.ProficiencyLevel1',
  2: 'PF2E.ProficiencyLevel2',
  3: 'PF2E.ProficiencyLevel3',
  4: 'PF2E.ProficiencyLevel4'
}; // Hero Points

CONFIG.heroPointLevels = {
  0: 'PF2E.HeroPointLevel0',
  1: 'PF2E.HeroPointLevel1',
  2: 'PF2E.HeroPointLevel2',
  3: 'PF2E.HeroPointLevel3'
}; // Creature Sizes

CONFIG.actorSizes = {
  tiny: 'PF2E.ActorSizeTiny',
  sm: 'PF2E.ActorSizeSmall',
  med: 'PF2E.ActorSizeMedium',
  lg: 'PF2E.ActorSizeLarge',
  huge: 'PF2E.ActorSizeHuge',
  grg: 'PF2E.ActorSizeGargantuan'
};
CONFIG.speedTypes = {
  swim: 'PF2E.SpeedTypesSwim',
  climb: "PF2E.SpeedTypesClimb",
  fly: "PF2E.SpeedTypesFly",
  burrow: "PF2E.SpeedTypesBurrow"
};
CONFIG.senses = {
  darkvision: 'PF2E.SensesDarkvision',
  greaterDarkvision: 'PF2E.SensesGreaterDarkvision',
  lowLightVision: 'PF2E.SensesLowLightVision',
  scent: 'PF2E.SensesScent',
  Tremorsense: 'PF2E.SensesTremorsense'
}; // Creature Sizes

CONFIG.bulkTypes = {
  L: 'PF2E.BulkTypeLight',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: '11',
  12: '12',
  13: '13',
  14: '14',
  15: '15',
  16: '16',
  17: '17',
  18: '18',
  19: '19',
  20: '20',
  21: '21',
  22: '22',
  23: '23',
  24: '24',
  25: '25',
  26: '26',
  27: '27',
  28: '28',
  29: '29',
  30: '30',
  31: '31',
  32: '32',
  33: '33',
  34: '34',
  35: '35',
  36: '36',
  37: '37',
  38: '38',
  39: '39',
  40: '40',
  41: '41',
  42: '42',
  43: '43',
  44: '44',
  45: '45',
  46: '46',
  47: '47',
  48: '48',
  49: '49',
  50: '50'
}; // Condition Types

CONFIG.conditionTypes = {
  blinded: 'PF2E.ConditionTypeBlinded',
  broken: 'PF2E.ConditionTypeBroken',
  clumsy: 'PF2E.ConditionTypeClumsy',
  concealed: 'PF2E.ConditionTypeConcealed',
  confused: 'PF2E.ConditionTypeConfused',
  controlled: 'PF2E.ConditionTypeControlled',
  dazzled: 'PF2E.ConditionTypeDazzled',
  deafened: 'PF2E.ConditionTypeDeafened',
  doomed: 'PF2E.ConditionTypeDoomed',
  drained: 'PF2E.ConditionTypeDrained',
  dying: 'PF2E.ConditionTypeDying',
  encumbered: 'PF2E.ConditionTypeEncumbered',
  enfeebled: 'PF2E.ConditionTypeEnfeebled',
  fascinated: 'PF2E.ConditionTypeFascinated',
  fatigued: 'PF2E.ConditionTypeFatigued',
  'flat-footed': 'PF2E.ConditionTypeFlatFooted',
  fleeing: 'PF2E.ConditionTypeFleeing',
  friendly: 'PF2E.ConditionTypeFriendly',
  frightened: 'PF2E.ConditionTypeFrightened',
  grabbed: 'PF2E.ConditionTypeGrabbed',
  helpful: 'PF2E.ConditionTypeHelpful',
  hidden: 'PF2E.ConditionTypeHidden',
  hostile: 'PF2E.ConditionTypeHostile',
  immobilized: 'PF2E.ConditionTypeImmobilized',
  indifferent: 'PF2E.ConditionTypeIndifferent',
  invisible: 'PF2E.ConditionTypeInvisible',
  observed: 'PF2E.ConditionTypeObserved',
  paralyzed: 'PF2E.ConditionTypeParalyzed',
  persistent: 'PF2E.ConditionTypePersistent',
  petrified: 'PF2E.ConditionTypePetrified',
  prone: 'PF2E.ConditionTypeProne',
  quickened: 'PF2E.ConditionTypeQuickened',
  restrained: 'PF2E.ConditionTypeRestrained',
  sickened: 'PF2E.ConditionTypeSickened',
  slowed: 'PF2E.ConditionTypeSlowed',
  stunned: 'PF2E.ConditionTypeStunned',
  stupefied: 'PF2E.ConditionTypeStupefied',
  unconscious: 'PF2E.ConditionTypeUnconscious',
  undetected: 'PF2E.ConditionTypeUndetected',
  unfriendly: 'PF2E.ConditionTypeUnfriendly',
  unnoticed: 'PF2E.ConditionTypeUnnoticed',
  wounded: 'PF2E.ConditionTypeWounded'
}; // Immunity Types

CONFIG.immunityTypes = {
  'death effects': 'PF2E.ImmunityTypeDeathEffects',
  'critical-hits': 'PF2E.ImmunityTypeCriticalHits',
  'object-immunities': 'PF2E.ImmunityTypeObjectImmunities',
  'precision-damage': 'PF2E.ImmunityTypePrecisionDamage',
  magic: 'PF2E.ImmunityTypeMagic',
  sleep: 'PF2E.ImmunityTypeSleep',
  'swarm-mind': 'PF2E.ImmunityTypeSwarmMind',
  visual: 'PF2E.ImmunityTypeVisual',
  spellDeflection: 'PF2E.ImmunityTypeSpellDeflection',
  'nonlethal attacks': 'PF2E.ImmunityTypeNonlethalAttacks',
  disease: 'PF2E.ImmunityTypeDisease',
  necromancy: 'PF2E.ImmunityTypeNecromancy',
  healing: 'PF2E.ImmunityTypeHealing',
  blinded: 'PF2E.ConditionTypeBlinded',
  broken: 'PF2E.ConditionTypeBroken',
  clumsy: 'PF2E.ConditionTypeClumsy',
  concealed: 'PF2E.ConditionTypeConcealed',
  confused: 'PF2E.ConditionTypeConfused',
  controlled: 'PF2E.ConditionTypeControlled',
  dazzled: 'PF2E.ConditionTypeDazzled',
  deafened: 'PF2E.ConditionTypeDeafened',
  doomed: 'PF2E.ConditionTypeDoomed',
  drained: 'PF2E.ConditionTypeDrained',
  dying: 'PF2E.ConditionTypeDying',
  encumbered: 'PF2E.ConditionTypeEncumbered',
  enfeebled: 'PF2E.ConditionTypeEnfeebled',
  fascinated: 'PF2E.ConditionTypeFascinated',
  fatigued: 'PF2E.ConditionTypeFatigued',
  'flat-footed': 'PF2E.ConditionTypeFlatFooted',
  fleeing: 'PF2E.ConditionTypeFleeing',
  friendly: 'PF2E.ConditionTypeFriendly',
  frightened: 'PF2E.ConditionTypeFrightened',
  grabbed: 'PF2E.ConditionTypeGrabbed',
  helpful: 'PF2E.ConditionTypeHelpful',
  hidden: 'PF2E.ConditionTypeHidden',
  hostile: 'PF2E.ConditionTypeHostile',
  immobilized: 'PF2E.ConditionTypeImmobilized',
  indifferent: 'PF2E.ConditionTypeIndifferent',
  invisible: 'PF2E.ConditionTypeInvisible',
  observed: 'PF2E.ConditionTypeObserved',
  paralyzed: 'PF2E.ConditionTypeParalyzed',
  persistent: 'PF2E.ConditionTypePersistent',
  petrified: 'PF2E.ConditionTypePetrified',
  prone: 'PF2E.ConditionTypeProne',
  quickened: 'PF2E.ConditionTypeQuickened',
  restrained: 'PF2E.ConditionTypeRestrained',
  sickened: 'PF2E.ConditionTypeSickened',
  slowed: 'PF2E.ConditionTypeSlowed',
  stunned: 'PF2E.ConditionTypeStunned',
  stupefied: 'PF2E.ConditionTypeStupefied',
  unconscious: 'PF2E.ConditionTypeUnconscious',
  undetected: 'PF2E.ConditionTypeUndetected',
  unfriendly: 'PF2E.ConditionTypeUnfriendly',
  unnoticed: 'PF2E.ConditionTypeUnnoticed',
  wounded: 'PF2E.ConditionTypeWounded',
  acid: 'PF2E.DamageTypeAcid',
  bludgeoning: 'PF2E.DamageTypeBludgeoning',
  cold: 'PF2E.DamageTypeCold',
  fire: 'PF2E.DamageTypeFire',
  force: 'PF2E.DamageTypeForce',
  electricity: 'PF2E.DamageTypeElectricity',
  sonic: 'PF2E.DamageTypeSonic',
  negative: 'PF2E.DamageTypeNegative',
  piercing: 'PF2E.DamageTypePiercing',
  poison: 'PF2E.DamageTypePoison',
  positive: 'PF2E.DamageTypePositive',
  bleed: 'PF2E.DamageTypeBleed',
  mental: 'PF2E.DamageTypeMental',
  precision: 'PF2E.DamageTypePrecision',
  slashing: 'PF2E.DamageTypeSlashing',
  chaotic: 'PF2E.DamageTypeChaotic',
  lawful: 'PF2E.DamageTypeLawful',
  good: 'PF2E.DamageTypeGood',
  evil: 'PF2E.DamageTypeEvil'
}; // Languages

CONFIG.languages = {
  common: 'PF2E.LanguageCommon',
  abyssal: 'PF2E.LanguageAbyssal',
  aklo: 'PF2E.LanguageAklo',
  anadi: 'PF2E.LanguageAnadi',
  aquan: 'PF2E.LanguageAquan',
  auran: 'PF2E.LanguageAuran',
  boggard: 'PF2E.LanguageBoggard',
  celestial: 'PF2E.LanguageCelestial',
  draconic: 'PF2E.LanguageDraconic',
  druidic: 'PF2E.LanguageDruidic',
  dwarven: 'PF2E.LanguageDwarven',
  elven: 'PF2E.LanguageElven',
  gnomish: 'PF2E.LanguageGnomish',
  goblin: 'PF2E.LanguageGoblin',
  gnoll: 'PF2E.LanguageGnoll',
  grippli: 'PF2E.LanguageGrippli',
  halfling: 'PF2E.LanguageHalfling',
  ignan: 'PF2E.LanguageIgnan',
  iruxi: 'PF2E.LanguageIruxi',
  jotun: 'PF2E.LanguageJotun',
  infernal: 'PF2E.LanguageInfernal',
  orcish: 'PF2E.LanguageOrcish',
  necril: 'PF2E.LanguageNecril',
  strix: 'PF2E.LanguageStrix',
  sylvan: 'PF2E.LanguageSylvan',
  shadowtongue: 'PF2E.LanguageShadowtongue',
  shoony: 'PF2E.LanguageShoony',
  terran: 'PF2E.LanguageTerran',
  undercommon: 'PF2E.LanguageUndercommon',
  hallit: 'PF2E.LanguageHallit',
  kelish: 'PF2E.LanguageKelish',
  mwangi: 'PF2E.LanguageMwangi',
  osirian: 'PF2E.LanguageOsirian',
  shoanti: 'PF2E.LanguageShoanti',
  skald: 'PF2E.LanguageSkald',
  tien: 'PF2E.LanguageTien',
  varisian: 'PF2E.LanguageVarisian',
  vudrani: 'PF2E.LanguageVudrani',
  algollthu: 'PF2E.LanguageAlghollthu',
  amurrun: 'PF2E.LanguageAmurrun',
  arboreal: 'PF2E.LanguageArboreal',
  azlanti: 'PF2E.LanguageAzlanti',
  caligni: 'PF2E.LanguageCaligni',
  cyclops: 'PF2E.LanguageCyclops',
  daemonic: 'PF2E.LanguageDaemonic',
  erutaki: 'PF2E.LanguageErutaki',
  garundi: 'PF2E.LanguageGarundi',
  osiriani: 'PF2E.LanguageOsiriani',
  protean: 'PF2E.LanguageProtean',
  requian: 'PF2E.LanguageRequian',
  sphinx: 'PF2E.LanguageSphinx',
  tengu: 'PF2E.LanguageTengu',
  thassilonian: 'PF2E.LanguageThassilonian',
  utopian: 'PF2E.LanguageUtopian',
  varki: 'PF2E.LanguageVarki'
};
CONFIG.spellScalingModes = {
  none: 'PF2E.SpellScalingModeNone',
  level1: 'PF2E.SpellScalingModeLevel1',
  level2: 'PF2E.SpellScalingModeLevel2',
  level3: 'PF2E.SpellScalingModeLevel3',
  level4: 'PF2E.SpellScalingModeLevel4',
  levelsecond: 'PF2E.SpellScalingModeLevelsecond',
  levelthird: 'PF2E.SpellScalingModeLevelthird',
  levelfourth: 'PF2E.SpellScalingModeLevelfourth',
  levelfifth: 'PF2E.SpellScalingModeLevelfifth',
  levelsixth: 'PF2E.SpellScalingModeLevelsixth',
  levelseventh: 'PF2E.SpellScalingModeLevelseventh',
  leveleighth: 'PF2E.SpellScalingModeLeveleighth',
  levelninth: 'PF2E.SpellScalingModeLevelninth',
  leveltenth: 'PF2E.SpellScalingModeLeveltenth'
};
CONFIG.attackEffects = {
  "Grab": 'PF2E.AttackEffectGrab',
  "Improved Grab": 'PF2E.AttackEffectImprovedGrab',
  "Constrict": 'PF2E.AttackEffectConstrict',
  "Greater Constrict": 'PF2E.AttackEffectGreaterConstrict',
  "Knockdown": 'PF2E.AttackEffectKnockdown',
  "Improved Knockdown": 'PF2E.AttackEffectImprovedKnockdown',
  "Push": 'PF2E.AttackEffectPush',
  "Improved Push": 'PF2E.AttackEffectImprovedPush',
  "Trip": 'PF2E.AttackEffectTrip'
};

CONFIG.monsterAbilities = () => {
  return {
    "All-Around Vision": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>This monster can see in all directions simultaneously, and therefore can’t be flanked."
    },
    "Aquatic Ambush": {
      "actionType": "action",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br><b>Requirements</b> The monster is hiding in water and a creature that hasn’t detected it is within the listed number of feet. <b>Effect</b> The monster moves up to its swim Speed + 10 feet toward the triggering creature, traveling on water and on land. Once the creature is in reach, the monster makes a Strike against it. The creature is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=16\">flat-footed</a> against this Strike."
    },
    "Attack of Opportunity": {
      "actionType": "reaction",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br><b>Trigger</b> A creature within the monster’s reach uses a manipulate action or a move action, makes a ranged attack, or leaves a square during a move action it’s using. <b>Effect</b> The monster attempts a melee Strike against the triggering creature. If the attack is a critical hit and the trigger was a manipulate action, the monster disrupts that action. This Strike doesn’t count toward the monster’s multiple attack penalty, and its multiple attack penalty doesn’t apply to this Strike."
    },
    "At-Will Spells": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>The monster can cast its at-will spells any number of times without using up spell slots."
    },
    "Aura": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>A monster’s aura automatically affects everything within a specified emanation around that monster. The monster doesn’t need to spend actions on the aura; rather, the aura’s effects are applied at specific times, such as when a creature ends its turn in the aura or when creatures enter the aura.<br><br> If an aura does nothing but deal damage, its entry lists only the radius, damage, and saving throw. Such auras deal this damage to a creature when the creature enters the aura and when a creature starts its turn in the aura. A creature can take damage from the aura only once per round.<br><br> The GM might determine that a monster’s aura doesn’t affect its own allies. For example, a creature might be immune to a monster’s frightful presence if they have been around each other for a long time."
    },
    "Buck": {
      "actionType": "reaction",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>Most monsters that serve as mounts can attempt to\nbuck off unwanted or annoying riders, but most mounts\nwill not use this reaction against a trusted creature unless\nthe mounts are spooked or mistreated. <b>Trigger</b> A creature\nMounts or uses the Command an Animal action while riding\nthe monster. <b>Effect</b> The triggering creature must succeed\nat a Reflex saving throw against the listed DC or fall off the\ncreature and land prone. If the save is a critical failure, the\ntriggering creature also takes 1d6 bludgeoning damage in\naddition to the normal damage for the fall."
    },
    "Catch Rock": {
      "actionType": "reaction",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br><b>Requirements</b> The monster must have a free hand but can Release anything it’s holding as part of this reaction. <b>Trigger</b> The monster is targeted with a thrown rock Strike or a rock would fall on the monster. <b>Effect</b> The monster gains a +4 circumstance bonus to its AC against the triggering attack or to any defense against the falling rock. If the attack misses or the monster successfully defends against the falling rock, the monster catches the rock, takes no damage, and is now holding the rock."
    },
    "Change Shape": {
      "actionType": "action",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>(<a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=32\">concentrate</a>, [magical tradition], <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=127\">polymorph</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=157\">transmutation</a>) The monster changes its shape indefinitely. It can use this action again to return to its natural shape or adopt a new shape. Unless otherwise noted, a monster cannot use Change Shape to appear as a specific individual. Using Change Shape counts as creating a disguise for the Impersonate use of Deception. The monster’s transformation automatically defeats Perception DCs to determine whether the creature is a member of the ancestry or creature type into which it transformed, and it gains a +4 status bonus to its Deception DC to prevent others from seeing through its disguise. Change Shape abilities specify what shapes the monster can adopt. The monster doesn’t gain any special abilities of the new shape, only its physical form. For example, in each shape, it replaces its normal Speeds and Strikes, and might potentially change its senses or size. Any changes are listed in its stat block."
    },
    "Constant Spells": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>A constant spell affects the monster without the monster needing to cast it, and its duration is unlimited. If a constant spell gets counteracted, the monster can reactivate it by spending the normal spellcasting actions the spell\u001crequires."
    },
    "Constrict": {
      "actionType": "action",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>The monster deals the listed amount of damage to any number of creatures grabbed or restrained by it. Each of those creatures can attempt a basic Fortitude save with the listed DC."
    },
    "Coven": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 342</i></a><br>(<a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=47\">divination</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=106\">mental</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=120\">occult</a>) This monster can form a coven with two or more other creatures who also have the coven ability. This involves performing an 8-hour ceremony with all prospective coven members. After the coven is formed, each of its members gains elite adjustments (page 6), adjusting their levels accordingly. Coven members can sense other members’ locations and conditions by spending a single action, which has the concentrate trait, and can sense what another coven member is sensing as a two-action activity, which has the concentrate trait as well.<br><br> Covens also grant spells and rituals to their members, but these can be cast only in cooperation between three coven members who are all within 30 feet of one another. A coven member can contribute to a coven spell with a single-action spellcasting activity that has a single verbal component. If two coven members have contributed these actions within the last round, a third member can cast a coven spell on her turn by spending the normal spellcasting actions. A coven can cast its coven spells an unlimited number of times but can cast only one coven spell each round. All covens grant the 8th-level <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=17\">baleful polymorph</a></i> spell and all the following spells, which the coven can cast at any level up to 5th: <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=15\">augury</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=34\">charm</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=39\">clairaudience</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=40\">clairvoyance</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=90\">dream message</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=159\">illusory disguise</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=161\">illusory scene</a></i>, <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=239\">prying eye</a></i>, and <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=329\">talking corpse</a></i>. Individual creatures with the coven ability also grant additional spells to any coven they join. A coven can also cast the <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Rituals.aspx?ID=9\">control weather</a></i> ritual, with a DC of 23 instead of the standard DC.<br><br> If a coven member leaving the coven or the death of a coven member brings the coven below three members, the remaining members keep their elite adjustments for 24 hours, but without enough members to contribute the necessary actions, they can’t cast coven spells."
    },
    "Darkvision": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>A monster with darkvision can see perfectly well in areas of darkness and dim light, though such vision is in black and white only. Some forms of magical darkness, such as a 4th-level <i><a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Spells.aspx?ID=59\">darkness</a></i> spell, block normal darkvision. A monster with greater darkvision, however, can see through even these forms of magical darkness."
    },
    "Disease": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>When a creature is exposed to a monster’s disease, it attempts a Fortitude save or succumbs to the disease. The level of a disease is the level of the monster in\u001f icting the disease. The disease follows the <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Rules.aspx?ID=361\">rules for afflictions</a>."
    },
    "Engulf": {
      "actionType": "action",
      "actionCost": 2,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>The monster Strides up to double its Speed and can move through the spaces of any creatures in its path. Any creature of the monster’s size or smaller whose space the monster moves through can attempt a Reflex save with the listed DC to avoid being engulfed. A creature unable to act automatically critically fails this save. If a creature succeeds at its save, it can choose to be either pushed aside (out of the monster’s path) or pushed in front of the monster to the end of the monster’s movement. The monster can attempt to Engulf the same creature only once in a single use of Engulf. The monster can contain as many creatures as can fit in its space.<br><br> A creature that fails its save is pulled into the monster’s body. It is grabbed, is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=35\">slowed 1</a>, and has to hold its breath or start suffocating. The creature takes the listed amount of damage when first engulfed and at the end of each of its turns while it’s engulfed. An engulfed creature can get free by Escaping against the listed escape DC. An engulfed creature can attack the monster engulfing it, but only with unarmed attacks or with weapons of light Bulk or less. The engulfing creature is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=16\">flat-footed</a> against the attack. If the monster takes piercing or slashing damage equaling or exceeding the listed Rupture value from a single attack or spell, the engulfed creature cuts itself free. A creature that gets free by either method can immediately breathe and exits the swallowing monster’s space.<br><br> If the monster dies, all creatures it has engulfed are automatically released as the monster’s form loses cohesion."
    },
    "Fast Healing": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>A monster with this ability regains the given number of Hit Points each round at the beginning of its turn."
    },
    "Ferocity": {
      "actionType": "reaction",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br><b>Trigger</b> The monster is reduced to 0 HP. <b>Effect</b> The monster avoids being knocked out and remains at 1 HP, but its <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=42\">wounded</a> value increases by 1. When it is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=42\">wounded 3</a>, it can no longer use this ability."
    },
    "Frightful Presence": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>(<a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=206\">aura</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=60\">emotion</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=68\">fear</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=106\">mental</a>) A creature that first enters the area must attempt a Will save. Regardless of the result of the saving throw, the creature is temporarily immune to this monster’s Frightful Presence for 1 minute.<br><br> <b>Critical Success</b> The creature is unaffected by the presence.<br> <b>Success</b> The creature is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=19\">frightened 1</a>.<br> <b>Failure</b> The creature is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=19\">frightened 2</a>.<br> <b>Critical Failure</b> The creature is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=19\">frightened 4</a>."
    },
    "Grab": {
      "actionType": "action",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br><b>Requirements</b> The monster’s last action was a success with a Strike that lists Grab in its damage entry, or it has a creature grabbed using this action. <b>Effect</b> The monster automatically Grabs the target until the end of the monster’s next turn. The creature is grabbed by whichever body part the monster attacked with, and that body part can’t be used to Strike creatures until the grab is ended.<br><br> Using Grab extends the duration of the monster’s Grab until the end of its next turn for all creatures grabbed by it. A grabbed creature can use the <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Actions.aspx?ID=79\">Escape</a> action to get out of the grab, and the Grab ends for a grabbed creatures if the monster moves away from it."
    },
    "Greater Constrict": {
      "actionType": "action",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>The monster deals the listed amount of damage to any number of creatures grabbed or restrained by it. Each of those creatures can attempt a basic Fortitude save with the listed DC. A creature that fails this save falls <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=38\">unconscious</a>, and a creature that succeeds is then temporarily immune to falling <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=38\">unconscious</a> from Greater Constrict for 1 minute."
    },
    "Improved Grab": {
      "actionType": "free",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>The monster can use Grab as a free action triggered by a hit with its initial attack. A monster with Improved Grab still needs to spend an action to extend the duration for creatures it already has grabbed."
    },
    "Improved Knockdown": {
      "actionType": "free",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>The monster can use Knockdown as a free action triggered by a hit with its initial attack."
    },
    "Improved Push": {
      "actionType": "free",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>The monster can use Push as a free action triggered by a hit with its initial attack."
    },
    "Knockdown": {
      "actionType": "action",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br><b>Requirements</b> The monster’s last action was a success with a Strike that lists Knockdown in its damage entry. <b>Effect</b> The monster knocks the target prone."
    },
    "Lifesense": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>Lifesense allows a monster to sense the vital essence of living and undead creatures within the listed range. The sense can distinguish between the positive energy animating living creatures and the negative energy animating undead creatures, much as sight distinguishes colors."
    },
    "Light Blindness": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>When first exposed to bright light, the monster is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=1\">blinded</a> until the end of its next turn. After this exposure, light doesn’t blind the monster again until after it spends 1 hour in darkness. However, as long as the monster is in an area of bright light, it’s <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=7\">dazzled</a>."
    },
    "Low-Light Vision": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>The monster can see in dim light as though it were bright light, so it ignores the <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=4\">concealed</a> condition due to dim light."
    },
    "Poison": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>When a creature is exposed to a monster’s poison, it attempts a Fortitude save to avoid becoming poisoned. The level of a poison is the level of the monster inflicting the poison. The poison follows the <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Rules.aspx?ID=361\">rules for afflictions</a>."
    },
    "Push": {
      "actionType": "action",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br><b>Requirements</b> The monster’s last action was a success with a Strike that lists Push in its damage entry. <b>Effect</b> The monster automatically knocks the target away from the monster. Unless otherwise noted in the ability description, the creature is pushed 5 feet. If the attack was a critical hit, this distance is doubled."
    },
    "Regeneration": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 343</i></a><br>This monster regains the listed number of Hit Points each round at the beginning of its turn. Its <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=11\">dying</a> condition never increases beyond <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=11\">dying 3</a> as long as its regeneration is active. However, if it takes damage of a type listed in the regeneration entry, its regeneration deactivates until the end of its next turn. Deactivate the regeneration before applying any damage of a listed type, since that damage might kill the monster by bringing it to <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=11\">dying 4</a>."
    },
    "Rend": {
      "actionType": "action",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>A Rend entry lists a Strike the monster has. <b>Requirements</b> The monster hit the same enemy with two consecutive Strikes of the listed type in the same round. <b>Effect</b> The monster automatically deals that Strike’s damage again to the enemy."
    },
    "Retributive Strike": {
      "actionType": "reaction",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br><b>Trigger</b> An enemy damages the monster’s ally, and both are within 15 feet of the monster. <b>Effect</b> The ally gains resistance to all damage against the triggering damage equal to 2 + the monster’s level. If the foe is within reach, the monster makes a melee Strike against it."
    },
    "Scent": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>Scent involves sensing creatures or objects by smell, and is usually a vague sense. The range is listed in the ability, and it functions only if the creature or object being detected emits an aroma (for instance, incorporeal creatures usually do not exude an aroma).<br><br> If a creature emits a heavy aroma or is upwind, the GM can double or even triple the range of scent abilities used to detect that creature, and the GM can reduce the range if a creature is downwind."
    },
    "Shield Block": {
      "actionType": "reaction",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br><b>Trigger</b> The monster has its shield raised and takes damage from a physical attack. <b>Effect</b> The monster snaps its shield into place to deflect a blow. The shield prevents the monster from taking an amount of damage up to the shield’s Hardness. The monster and the shield each take any remaining damage, possibly breaking or destroying the shield."
    },
    "Sneak Attack": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>When the monster Strikes a creature that has the <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=16\">flat-footed</a> condition with an <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=170\">agile</a> or <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=179\">finesse</a> melee weapon, an <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=170\">agile</a> or <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=179\">finesse</a> unarmed attack, or a ranged weapon attack, it also deals the listed precision damage. For a ranged attack with a thrown weapon, that weapon must also be an <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=170\">agile</a> or <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=179\">finesse</a> weapon."
    },
    "Swallow Whole": {
      "actionType": "action",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>(<a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=15\">attack</a>) The monster attempts to swallow a creature of the listed size or smaller that it has grabbed in its jaws or mouth. If a swallowed creature is of the maximum size listed, the monster can’t use Swallow Whole again. If the creature is smaller than the maximum, the monster can usually swallow more creatures; the GM determines the maximum. The monster attempts an <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Skills.aspx?ID=3\">Athletics</a> check opposed by the grabbed creature’s Reflex DC. If it succeeds, it swallows the creature. The monster’s mouth or jaws no longer grab a creature it has swallowed, so the monster is free to use them to Strike or Grab once again. The monster can’t attack creatures it has swallowed.<br><br> A swallowed creature is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=20\">grabbed</a>, is <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Conditions.aspx?ID=35\">slowed 1</a>, and has to hold its breath or start suffocating. The swallowed creature takes the listed amount of damage when first swallowed and at the end of each of its turns while it’s swallowed. If the victim Escapes this ability’s grabbed condition, it exits through the monster’s mouth. This frees any other creature grabbed in the monster’s mouth or jaws. A swallowed creature can attack the monster that has swallowed it, but only with unarmed attacks or with weapons of light Bulk or less. The engulfing creature is flat-footed against the attack. If the monster takes piercing or slashing damage equaling or exceeding the listed Rupture value from a single attack or spell, the engulfed creature cuts itself free. A creature that gets free by either Escaping or cutting itself free can immediately breathe and exits the swallowing monster’s space.<br><br> If the monster dies, a swallowed creature can be freed by creatures adjacent to the corpse if they spend a combined total of 3 actions cutting the monster open with a weapon or unarmed attack that deals piercing or slashing damage."
    },
    "Swarm Mind": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>This monster doesn’t have a single mind (typically because it’s a swarm of smaller creatures), and is immune to mental effects that target only a specific number of creatures. It is still subject to mental effects that affect all creatures in an area."
    },
    "Telepathy": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>(<a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=206\">aura</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=47\">divination</a>, <a style=\"text-decoration:underline\" href=\"https://2e.aonprd.com/Traits.aspx?ID=103\">magical</a>) A monster with telepathy can communicate mentally with any creatures within the listed radius, as long as they share a language. This doesn’t give any special access to their thoughts, and communicates no more information than normal speech would."
    },
    "Throw Rock": {
      "actionType": "action",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>The monster picks up a rock within reach or retrieves a stowed rock and throws it, making a ranged Strike."
    },
    "Trample": {
      "actionType": "action",
      "actionCost": 3,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>The monster Strides up to double its Speed and can move through the spaces of creatures of the listed size, Trampling each creature whose space it enters. The monster can attempt to Trample the same creature only once in a single use of Trample. The monster deals the damage of the listed Strike, but trampled creatures can attempt a basic Reflex save at the listed DC (no damage on a critical success, half damage on a success, double damage on a critical failure)."
    },
    "Tremorsense": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>Tremorsense allows a monster to feel the vibrations through a solid surface caused by movement. It is an imprecise sense with a limited range (listed in the ability). Tremorsense functions only if the monster is on the same surface as the subject, and only if the subject is moving along (or burrowing through) the surface."
    },
    "Wavesense": {
      "actionType": "passive",
      "actionCost": 1,
      "description": "<b>Source</b> <a href=\"https://paizo.com/products/btq01y0m?Pathfinder-Bestiary\" target=\"_blank\" class=\"external-link\"><i>Bestiary pg. 344</i></a><br>This sense allows a monster to feel vibrations caused by movement through a liquid. It’s an imprecise sense with a limited range (listed in the ability). Wavesense functions only if monster and the subject are in the same body of liquid, and only if the subject is moving through the liquid."
    }
  };
};