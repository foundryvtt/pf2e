export const CONFIG = {};

// Ability labels
CONFIG.abilities = {
  "str": "PF2E.AbilityStr",
  "dex": "PF2E.AbilityDex",
  "con": "PF2E.AbilityCon",
  "int": "PF2E.AbilityInt",
  "wis": "PF2E.AbilityWis",
  "cha": "PF2E.AbilityCha"
};

// Skill labels
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
  "thi": "PF2E.SkillThi",
};

// Martial skill labels
CONFIG.martialSkills = {
  "unarmored": "PF2E.MartialUnarmored",
  "light": "PF2E.MartialLight",
  "medium": "PF2E.MartialMedium",
  "heavy": "PF2E.MartialHeavy",
  "simple": "PF2E.MartialSimple",
  "martial": "PF2E.MartialMartial",
  "advanced": "PF2E.MartialAdvanced",
  "unarmed": "PF2E.MartialUnarmed"
};

// Saves labels
CONFIG.saves = {
  "reflex": "PF2E.SavesReflex",
  "fortitude": "PF2E.SavesFortitude",
  "will": "PF2E.SavesWill",
};

// Inventory currency labels
CONFIG.currencies = {
  "pp": "PF2E.CurrencyPP",
  "gp": "PF2E.CurrencyGP",
  "sp": "PF2E.CurrencySP",
  "cp": "PF2E.CurrencyCP",
};

// Damage Types
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
  psychic: 'PF2E.DamageTypePsychic',
  positive: 'PF2E.DamageTypePositive',
  bleed: 'PF2E.DamageTypeBleed',
  mental: 'PF2E.DamageTypeMental',
  precision: 'PF2E.DamageTypePrecision',
  slashing: 'PF2E.DamageTypeSlashing',
  chaotic: 'PF2E.DamageTypeChaotic',
  lawful: 'PF2E.DamageTypeLawful',
  good: 'PF2E.DamageTypeGood',
  evil: 'PF2E.DamageTypeEvil',
};

// Weapon Damage Types
CONFIG.weaponDamage = {
  bludgeoning: 'PF2E.DamageTypeBludgeoning',
  piercing: 'PF2E.DamageTypePiercing',
  slashing: 'PF2E.DamageTypeSlashing',
};

// Healing Types
CONFIG.healingTypes = {
  healing: 'PF2E.HealingTypeHealing',
  temphp: 'PF2E.HealingTypeTemporaryHealing',
};

// Weapon Types
CONFIG.weaponTypes = {
  simple: 'PF2E.WeaponTypeSimple',
  martial: 'PF2E.WeaponTypeMartial',
  advanced: 'PF2E.WeaponTypeAdvanced',
  unarmed: 'PF2E.WeaponTypeUnarmed',
};

// Weapon Types
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
  bomb: 'PF2E.WeaponGroupBomb',
};

// Weapon Descriptions
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
  bomb: 'PF2E.WeaponDescriptionBomb',
};

// Weapon Properties
CONFIG.weaponTraits = {
  uncommon: 'PF2E.WeaponTraitUncommon',
  rare: 'PF2E.WeaponTraitRare',
  agile: 'PF2E.WeaponTraitAgile',
  attached: 'PF2E.WeaponTraitAttached',
  backstabber: 'PF2E.WeaponTraitBackstabber',
  backswing: 'PF2E.WeaponTraitBackswing',
  brutal: 'PF2E.WeaponTraitBrutal',
  coldiron: 'PF2E.WeaponTraitColdiron',
  'deadly-d6': 'PF2E.WeaponTraitDeadlyD6',
  'deadly-d8': 'PF2E.WeaponTraitDeadlyD8',
  'deadly-d10': 'PF2E.WeaponTraitDeadlyD10',
  'deadly-d12': 'PF2E.WeaponTraitDeadlyD12',
  disarm: 'PF2E.WeaponTraitDisarm',
  dwarf: 'PF2E.WeaponTraitDwarf',
  elf: 'PF2E.WeaponTraitElf',
  'fatal-d8': 'PF2E.WeaponTraitFatalD8',
  'fatal-d10': 'PF2E.WeaponTraitFatalD10',
  'fatal-d12': 'PF2E.WeaponTraitFatalD12',
  finesse: 'PF2E.WeaponTraitFinesse',
  fire: 'PF2E.WeaponTraitFire',
  forceful: 'PF2E.WeaponTraitForceful',
  'free-hand': 'PF2E.WeaponTraitFreeHand',
  gnome: 'PF2E.WeaponTraitGnome',
  goblin: 'PF2E.WeaponTraitGoblin',
  grapple: 'PF2E.WeaponTraitGrapple',
  halfling: 'PF2E.WeaponTraitHalfling',
  'jousting-d6': 'PF2E.WeaponTraitJoustingD6',
  magical: 'PF2E.WeaponTraitMagical',
  monk: 'PF2E.WeaponTraitMonk',
  nonlethal: 'PF2E.WeaponTraitNonlethal',
  orc: 'PF2E.WeaponTraitOrc',
  parry: 'PF2E.WeaponTraitParry',
  propulsive: 'PF2E.WeaponTraitPropulsive',
  range: 'PF2E.WeaponTraitRare',
  'ranged-trip': 'PF2E.WeaponTraitRangedTrip',
  reach: 'PF2E.WeaponTraitReach',
  'reach-10': 'PF2E.WeaponTraitReach10',
  'reach-15': 'PF2E.WeaponTraitReach15',
  'reach-20': 'PF2E.WeaponTraitReach20',
  'reach-25': 'PF2E.WeaponTraitReach25',
  shove: 'PF2E.WeaponTraitShove',
  sweep: 'PF2E.WeaponTraitSweep',
  tethered: 'PF2E.WeaponTraitTethered',
  'thrown-10': 'PF2E.WeaponTraitThrown10',
  'thrown-20': 'PF2E.WeaponTraitThrown20',
  'thrown-30': 'PF2E.WeaponTraitThrown30',
  'thrown-40': 'PF2E.WeaponTraitThrown40',
  trip: 'PF2E.WeaponTraitTrip',
  twin: 'PF2E.WeaponTraitTwin',
  'two-hand-d8': 'PF2E.WeaponTraitTwoHandD8',
  'two-hand-d10': 'PF2E.WeaponTraitTwoHandD10',
  'two-hand-d12': 'PF2E.WeaponTraitTwoHandD12',
  unarmed: 'PF2E.WeaponTraitUnarmed',
  'versatile-s': 'PF2E.WeaponTraitVersatileS',
  'versatile-p': 'PF2E.WeaponTraitVersatileP',
  'versatile-b': 'PF2E.WeaponTraitVersatileB',
  'volley-30': 'PF2E.WeaponTraitVolley30',
  abjuration: 'PF2E.WeaponTraitAbjuration',
  conjuration: 'PF2E.WeaponTraitConjuration',
  divination: 'PF2E.WeaponTraitDivination',
  enchantment: 'PF2E.WeaponTraitEnchantment',
  evocation: 'PF2E.WeaponTraitEvocation',
  illusion: 'PF2E.WeaponTraitIllusion',
  necromancy: 'PF2E.WeaponTraitNecromancy',
  transmutation: 'PF2E.WeaponTraitTransmutation',
};

// Traits Descriptions
CONFIG.traitsDescriptions = {
  common: 'PF2E.TraitDescriptionCommon',
  uncommon: 'PF2E.TraitDescriptionUncommon',
  rare: 'PF2E.TraitDescriptionRare',
  unique: 'PF2E.TraitDescriptionUnique',
  agile: 'PF2E.TraitDescriptionAgile',
  attached: 'PF2E.TraitDescriptionAttached',
  backstabber: 'PF2E.TraitDescriptionBackstabber',
  backswing: 'PF2E.TraitDescriptionBackswing',
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
  'thrown-40': 'PF2E.WeaponTraitThrown40',
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
  poison: 'PF2E.TraitDescriptionPoison',
};

// Weapon Hands
CONFIG.weaponHands = {
  1: 'PF2E.WeaponHands1',
  '1+': 'PF2E.WeaponHands1Plus',
  2: 'PF2E.WeaponHands2',
};

// Item Bonus
CONFIG.itemBonuses = {
  '-2': 'PF2E.ItemBonusMinus2',
  0: 'PF2E.ItemBonus0',
  1: 'PF2E.ItemBonus1',
  2: 'PF2E.ItemBonus2',
  3: 'PF2E.ItemBonus3',
};

// Damage Dice
CONFIG.damageDice = {
  1: '1',
  2: '2',
  3: '3',
  4: '4',
};

// Damage Die
CONFIG.damageDie = {
  d4: 'PF2E.DamageDieD4',
  d6: 'PF2E.DamageDieD6',
  d8: 'PF2E.DamageDieD8',
  d10: 'PF2E.DamageDieD10',
  d12: 'PF2E.DamageDieD12',
};

// Weapon Range
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
  140: 'PF2E.WeaponRange140',
};

// Weapon MAP
CONFIG.weaponMAP = {
  1: 'PF2E.WeaponMAP1',
  2: 'PF2E.WeaponMAP2',
  3: 'PF2E.WeaponMAP3',
  4: 'PF2E.WeaponMAP4',
  5: 'PF2E.WeaponMAP5',
};

// Weapon Reload
CONFIG.weaponReload = {
  '-': 'PF2E.WeaponReloadNone',
  0: 'PF2E.WeaponReload0',
  1: 'PF2E.WeaponReload1',
  2: 'PF2E.WeaponReload2',
  3: 'PF2E.WeaponReload3',
};

// Armor Types
CONFIG.armorTypes = {
  unarmored: 'PF2E.ArmorTypeUnarmored',
  light: 'PF2E.ArmorTypeLight',
  medium: 'PF2E.ArmorTypeMedium',
  heavy: 'PF2E.ArmorTypeHeavy',
  shield: 'PF2E.ArmorTypeShield',
};

// Armor Groups
CONFIG.armorGroups = {
  leather: 'PF2E.ArmorGroupLeather',
  composite: 'PF2E.ArmorGroupComposite',
  chain: 'PF2E.ArmorGroupChain',
  plate: 'PF2E.ArmorGroupPlate',
};

// Consumable Types
CONFIG.consumableTypes = {
  ammo: 'PF2E.ConsumableTypeAmmo',
  potion: 'PF2E.ConsumableTypePotion',
  oil: 'PF2E.ConsumableTypeOil',
  scroll: 'PF2E.ConsumableTypeScroll',
  talasman: 'PF2E.ConsumableTypeTalisman',
  other: 'PF2E.ConsumableTypeOther',
};

// Magic Traditon
CONFIG.magicTraditions = {
  arcane: 'PF2E.MagicTraditionArcane',
  occult: 'PF2E.MagicTraditionOccult',
  divine: 'PF2E.MagicTraditionDivine',
  primal: 'PF2E.MagicTraditionPrimal',
  focus: 'PF2E.MagicTraditionFocus',
  ritual: 'PF2E.MagicTraditionRitual',
  scroll: 'PF2E.MagicTraditionScroll',
};

// Preparation Type
CONFIG.preparationType = {
  prepared: 'PF2E.PreparationTypePrepared',
  spontaneous: 'PF2E.PreparationTypeSpontaneous',
  innate: 'PF2E.PreparationTypeInnate',
};

// Spell Traits
CONFIG.spellTraits = {
  uncommon: 'PF2E.SpellTaitUncommon',
  rare: 'PF2E.SpellTaitRare',
  attack: 'PF2E.SpellTaitAttack',
  disease: 'PF2E.SpellTaitDisease',
  polymorph: 'PF2E.SpellTaitPolymorph',
  incapacitation: 'PF2E.SpellTaitIncapacitation',
  plant: 'PF2E.SpellTaitPlant',
  teleportation: 'PF2E.SpellTaitTeleportation',
  visual: 'PF2E.SpellTaitVisual',
  emotion: 'PF2E.SpellTaitEmotion',
  light: 'PF2E.SpellTaitLight',
  darkness: 'PF2E.SpellTaitDarkness',
  death: 'PF2E.SpellTaitDeath',
  scrying: 'PF2E.SpellTaitScrying',
  detection: 'PF2E.SpellTaitDetection',
  composition: 'PF2E.SpellTaitComposition',
  water: 'PF2E.SpellTaitWater',
  acid: 'PF2E.SpellTaitAcid',
  bludgeoning: 'PF2E.SpellTaitBludgeoning',
  cold: 'PF2E.SpellTaitCold',
  fire: 'PF2E.SpellTaitFire',
  force: 'PF2E.SpellTaitForce',
  electricity: 'PF2E.SpellTaitElectricity',
  sonic: 'PF2E.SpellTaitSonic',
  negative: 'PF2E.SpellTaitNegative',
  piercing: 'PF2E.SpellTaitPiercing',
  poison: 'PF2E.SpellTaitPoison',
  psychic: 'PF2E.SpellTaitPsychic',
  positive: 'PF2E.SpellTaitPositive',
  bleed: 'PF2E.SpellTaitBleed',
  mental: 'PF2E.SpellTaitMental',
  precision: 'PF2E.SpellTaitPrecision',
  slashing: 'PF2E.SpellTaitSlashing',
  chaotic: 'PF2E.SpellTaitChaotic',
  lawful: 'PF2E.SpellTaitLawful',
  good: 'PF2E.SpellTaitGood',
  evil: 'PF2E.SpellTaitEvil',
  healing: 'PF2E.SpellTaitHealing',
  cantrip: 'PF2E.SpellTaitCantrip',
  nonlethal: 'PF2E.SpellTaitNonlethal',
  arcane: 'PF2E.SpellTaitArcane',
  divine: 'PF2E.SpellTaitDivine',
  occult: 'PF2E.SpellTaitOccult',
  primal: 'PF2E.SpellTaitPrimal',
  abjuration: 'PF2E.SpellTaitAbjuration',
  conjuration: 'PF2E.SpellTaitConjuration',
  divination: 'PF2E.SpellTaitDivination',
  enchantment: 'PF2E.SpellTaitEnchantment',
  evocation: 'PF2E.SpellTaitEvocation',
  illusion: 'PF2E.SpellTaitIllusion',
  necromancy: 'PF2E.SpellTaitNecromancy',
  transmutation: 'PF2E.SpellTaitTransmutation',
  alchemist: 'PF2E.SpellTaitAlchemist',
  barbarian: 'PF2E.SpellTaitBarbarian',
  bard: 'PF2E.SpellTaitBard',
  champion: 'PF2E.SpellTaitChampion',
  cleric: 'PF2E.SpellTaitCleric',
  druid: 'PF2E.SpellTaitDruid',
  fighter: 'PF2E.SpellTaitFighter',
  monk: 'PF2E.SpellTaitMonk',
  ranger: 'PF2E.SpellTaitRanger',
  rogue: 'PF2E.SpellTaitRogue',
  sorcerer: 'PF2E.SpellTaitSorcerer',
  wizard: 'PF2E.SpellTaitWizard',
  earth: 'PF2E.SpellTaitEarth',
  curse: 'PF2E.SpellTaitCurse',
  misfortune: 'PF2E.SpellTaitMisfortune',
  fungus: 'PF2E.SpellTaitFungus',
  linguistic: 'PF2E.SpellTaitLinguistic',
  morph: 'PF2E.SpellTaitMorph',
};

// Feat Traits
CONFIG.featTraits = {
  uncommon: 'PF2E.FeatTaitUncommon',
  rare: 'PF2E.FeatTaitRare',
  attack: 'PF2E.FeatTaitAttack',
  move: 'PF2E.FeatTaitMove',
  manipulate: 'PF2E.FeatTaitManipulate',
  concentrate: 'PF2E.FeatTaitConcentrate',
  rage: 'PF2E.FeatTaitRage',
  general: 'PF2E.FeatTaitGeneral',
  skill: 'PF2E.FeatTaitSkill',
  dwarf: 'PF2E.FeatTaitDwarf',
  elf: 'PF2E.FeatTaitElf',
  gnome: 'PF2E.FeatTaitGnome',
  goblin: 'PF2E.FeatTaitGoblin',
  halfling: 'PF2E.FeatTaitHalfling',
  human: 'PF2E.FeatTaitHuman',
  alchemist: 'PF2E.FeatTaitAlchemist',
  barbarian: 'PF2E.FeatTaitBarbarian',
  bard: 'PF2E.FeatTaitBard',
  champion: 'PF2E.FeatTaitChampion',
  cleric: 'PF2E.FeatTaitCleric',
  druid: 'PF2E.FeatTaitDruid',
  fighter: 'PF2E.FeatTaitFighter',
  monk: 'PF2E.FeatTaitMonk',
  ranger: 'PF2E.FeatTaitRanger',
  rogue: 'PF2E.FeatTaitRogue',
  sorcerer: 'PF2E.FeatTaitSorcerer',
  wizard: 'PF2E.FeatTaitWizard',
  fortune: 'PF2E.FeatTaitFortune',
  healing: 'PF2E.FeatTaitHealing',
  downtime: 'PF2E.FeatTaitDowntime',
  secret: 'PF2E.FeatTaitSecret',
  additive1: 'PF2E.FeatTaitAdditive1',
  additive2: 'PF2E.FeatTaitAdditive2',
  additive3: 'PF2E.FeatTaitAdditive3',
  air: 'PF2E.FeatTaitAir',
  archetype: 'PF2E.FeatTaitArchetype',
  auditory: 'PF2E.FeatTaitAuditory',
  dedication: 'PF2E.FeatTaitDedication',
  detection: 'PF2E.FeatTaitDetection',
  emotion: 'PF2E.FeatTaitEmotion',
  exploration: 'PF2E.FeatTaitExploration',
  fear: 'PF2E.FeatTaitFear',
  flourish: 'PF2E.FeatTaitFlourish',
  'half-Elf': 'PF2E.FeatTaitHalfElf',
  'half-Orc': 'PF2E.FeatTaitHalfOrc',
  incapacitation: 'PF2E.FeatTaitIncapacitation',
  instinct: 'PF2E.FeatTaitInstinct',
  magical: 'PF2E.FeatTaitMagical',
  metamagic: 'PF2E.FeatTaitMetamagic',
  morph: 'PF2E.FeatTaitMorph',
  multiclass: 'PF2E.FeatTaitMulticlass',
  oath: 'PF2E.FeatTaitOath',
  open: 'PF2E.FeatTaitOpen',
  polymorph: 'PF2E.FeatTaitPolymorph',
  press: 'PF2E.FeatTaitPress',
  stance: 'PF2E.FeatTaitStance',
  visual: 'PF2E.FeatTaitVisual',
  arcane: 'PF2E.FeatTaitArcane',
  divine: 'PF2E.FeatTaitDivine',
  occult: 'PF2E.FeatTaitOccult',
  primal: 'PF2E.FeatTaitPrimal',
  abjuration: 'PF2E.FeatTaitAbjuration',
  conjuration: 'PF2E.FeatTaitConjuration',
  divination: 'PF2E.FeatTaitDivination',
  enchantment: 'PF2E.FeatTaitEnchantment',
  evocation: 'PF2E.FeatTaitEvocation',
  illusion: 'PF2E.FeatTaitIllusion',
  necromancy: 'PF2E.FeatTaitNecromancy',
  transmutation: 'PF2E.FeatTaitTransmutation',
  positive: 'PF2E.FeatTaitPositive',
  negative: 'PF2E.FeatTaitNegative',
  mental: 'PF2E.FeatTaitMental',
  alchemical: 'PF2E.FeatTaitAlchemical',
  fire: 'PF2E.FeatTaitFire',
  acid: 'PF2E.FeatTaitAcid',
  interact: 'PF2E.FeatTaitInteract',
  linguistic: 'PF2E.FeatTaitLinguistic',
  hobgoblin: 'PF2E.FeatTaitHobgoblin',
  leshy: 'PF2E.FeatTaitLeshy',
  lizardfolk: 'PF2E.FeatTaitLizardfolk',
  aasimar: 'PF2E.FeatTaitAasimar',
  catfolk: 'PF2E.FeatTaitCatfolk',
  changeling: 'PF2E.FeatTaitChangeling',
  geniekin: 'PF2E.FeatTaitGeniekin',
  tiefling: 'PF2E.FeatTaitTiefling',
  misfortune: 'PF2E.FeatTaitMisfortune',
  precision: 'PF2E.FeatTaitPrecision',
  aura: 'PF2E.FeatTaitAura',
  curse: 'PF2E.FeatTaitCurse',
  earth: 'PF2E.FeatTaitEarth',
  olfactory: 'PF2E.FeatTaitOlfactory',
};

// Area Types
CONFIG.areaTypes = {
  burst: 'PF2E.AreaTypeBurst',
  cone: 'PF2E.AreaTypeCone',
  emanation: 'PF2E.AreaTypeEmanation',
  line: 'PF2E.AreaTypeLine',
};

// Spell Saves
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
  120: 'PF2E.AreaSize120',
};

// Class Traits
CONFIG.classTraits = {
  alchemist: 'PF2E.ClassTaitAlchemist',
  barbarian: 'PF2E.ClassTaitBarbarian',
  bard: 'PF2E.ClassTaitBard',
  champion: 'PF2E.ClassTaitChampion',
  cleric: 'PF2E.ClassTaitCleric',
  druid: 'PF2E.ClassTaitDruid',
  fighter: 'PF2E.ClassTaitFighter',
  monk: 'PF2E.ClassTaitMonk',
  ranger: 'PF2E.ClassTaitRanger',
  rogue: 'PF2E.ClassTaitRogue',
  sorcerer: 'PF2E.ClassTaitSorcerer',
  wizard: 'PF2E.ClassTaitWizard',
};

// Ancestry Traits
CONFIG.ancestryTraits = {
  dwarf: 'PF2E.AncestryTaitDwarf',
  elf: 'PF2E.AncestryTaitElf',
  gnome: 'PF2E.AncestryTaitGnome',
  goblin: 'PF2E.AncestryTaitGoblin',
  halfelf: 'PF2E.AncestryTaitHalfelf',
  halfling: 'PF2E.AncestryTaitHalfling',
  halforc: 'PF2E.AncestryTaitHalforc',
  human: 'PF2E.AncestryTaitHuman',
  hobgoblin: 'PF2E.AncestryTaitHobgoblin',
  leshy: 'PF2E.AncestryTaitLeshy',
  lizardfolk: 'PF2E.AncestryTaitLizardfolk',
};

// Alignment
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
}

// Skill List
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
  lore: 'PF2E.SkillLore',
};

// Spell Components
CONFIG.spellComponents = {
  V: 'PF2E.SpellComponentV',
  S: 'PF2E.SpellComponentS',
  M: 'PF2E.SpellComponentM',
};

// Spell Types
CONFIG.spellTypes = {
  attack: 'PF2E.SpellTypeAttack',
  save: 'PF2E.SpellTypeSave',
  heal: 'PF2E.SpellTypeHeal',
  utility: 'PF2E.SpellTypeUtility',
};

// Spell Traditions
CONFIG.spellTraditions = {
  arcane: 'PF2E.SpellTraditionArcane',
  divine: 'PF2E.SpellTraditionDivine',
  occult: 'PF2E.SpellTraditionOccult',
  primal: 'PF2E.SpellTraditionPrimal',
};

// Spell Schools
CONFIG.spellSchools = {
  abj: 'PF2E.SpellSchoolAbj',
  con: 'PF2E.SpellSchoolCon',
  div: 'PF2E.SpellSchoolDiv',
  enc: 'PF2E.SpellSchoolEnc',
  evo: 'PF2E.SpellSchoolEvo',
  ill: 'PF2E.SpellSchoolIll',
  nec: 'PF2E.SpellSchoolNec',
  trs: 'PF2E.SpellSchoolTrs',
};

// Spell Levels
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
  10: 'PF2E.SpellLevel10',
};

// Feat Types
CONFIG.featTypes = {
  bonus: 'PF2E.FeatTypeBonus',
  ancestry: 'PF2E.FeatTypeAncestry',
  skill: 'PF2E.FeatTypeSkill',
  general: 'PF2E.FeatTypeGeneral',
  class: 'PF2E.FeatTypeClass',
  classfeature: 'PF2E.FeatTypeClassfeature',
  archetype: 'PF2E.FeatTypeArchetype',
  ancestryfeature: 'PF2E.FeatTypeAncestryfeature',
};

// Feat Action Types
CONFIG.featActionTypes = {
  passive: 'PF2E.FeatActionTypePassive',
  action: 'PF2E.FeatActionTypeAction',
  reaction: 'PF2E.FeatActionTypeReaction',
  free: 'PF2E.FeatActionTypeFree',
};

// Action Action Types
CONFIG.actionTypes = {
  action: 'PF2E.ActionTypeAction',
  reaction: 'PF2E.ActionTypeReaction',
  free: 'PF2E.ActionTypeFree',
  passive: 'PF2E.ActionTypePassive',
};

// Actions Number
CONFIG.actionsNumber = {
  1: 'PF2E.ActionNumber1',
  2: 'PF2E.ActionNumber2',
  3: 'PF2E.ActionNumber3',
};

CONFIG.actionCategories = {
  interaction: "ActionCategoryInteraction",
  defensive: "ActionCategoryDefensive",
  offensive: "ActionCategoryOffensive",
}

// Proficiency Multipliers
CONFIG.proficiencyLevels = {
  0: 'PF2E.ProficiencyLevel0',
  1: 'PF2E.ProficiencyLevel1',
  2: 'PF2E.ProficiencyLevel2',
  3: 'PF2E.ProficiencyLevel3',
  4: 'PF2E.ProficiencyLevel4',
};

// Hero Points
CONFIG.heroPointLevels = {
  0: 'PF2E.HeroPointLevel0',
  1: 'PF2E.HeroPointLevel1',
  2: 'PF2E.HeroPointLevel2',
  3: 'PF2E.HeroPointLevel3',
};

// Creature Sizes
CONFIG.actorSizes = {
  tiny: 'PF2E.ActorSizeTiny',
  sm: 'PF2E.ActorSizeSmall',
  med: 'PF2E.ActorSizeMedium',
  lg: 'PF2E.ActorSizeLarge',
  huge: 'PF2E.ActorSizeHuge',
  grg: 'PF2E.ActorSizeGargantuan',
};

// Creature Sizes
CONFIG.bulkTypes = {
  L: 'PF2E.BulkTypeLight',
  1: 'PF2E.BulkType1',
  2: 'PF2E.BulkType2',
  3: 'PF2E.BulkType3',
  4: 'PF2E.BulkType4',
  5: 'PF2E.BulkType5',
};

// Condition Types
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
  wounded: 'PF2E.ConditionTypeWounded',
};

// Immunity Types
CONFIG.immunityTypes = {
  'death-effects': 'PF2E.ImmunityTypeDeathEffects',
  'critical-hits': 'PF2E.ImmunityTypeCriticalHits',
  'object-immunities': 'PF2E.ImmunityTypeObjectImmunities',
  'precision-damage': 'PF2E.ImmunityTypePrecisionDamage',
  magic: 'PF2E.ImmunityTypeMagic',

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
  psychic: 'PF2E.DamageTypePsychic',
  positive: 'PF2E.DamageTypePositive',
  bleed: 'PF2E.DamageTypeBleed',
  mental: 'PF2E.DamageTypeMental',
  precision: 'PF2E.DamageTypePrecision',
  slashing: 'PF2E.DamageTypeSlashing',
  chaotic: 'PF2E.DamageTypeChaotic',
  lawful: 'PF2E.DamageTypeLawful',
  good: 'PF2E.DamageTypeGood',
  evil: 'PF2E.DamageTypeEvil',
};

// Languages
CONFIG.languages = {
  common: 'PF2E.LanguageCommon',
  abyssal: 'PF2E.LanguageAbyssal',
  aklo: 'PF2E.LanguageAklo',
  aquan: 'PF2E.LanguageAquan',
  auran: 'PF2E.LanguageAuran',
  boggard: 'PF2E.LanguageBoggard',
  celestial: 'PF2E.LanguageCelestial',
  draconic: 'PF2E.LanguageDraconic',
  druidic: 'PF2E.LanguageDruidic',
  dwarvish: 'PF2E.LanguageDwarvish',
  elven: 'PF2E.LanguageElven',
  gnomish: 'PF2E.LanguageGnomish',
  goblin: 'PF2E.LanguageGoblin',
  gnoll: 'PF2E.LanguageGnoll',
  halfling: 'PF2E.LanguageHalfling',
  ignan: 'PF2E.LanguageIgnan',
  iruxi: 'PF2E.LanguageIruxi',
  jotun: 'PF2E.LanguageJotun',
  infernal: 'PF2E.LanguageInfernal',
  orcish: 'PF2E.LanguageOrcish',
  necril: 'PF2E.LanguageNecril',
  sylvan: 'PF2E.LanguageSylvan',
  shadowtongue: 'PF2E.LanguageShadowtongue',
  terran: 'PF2E.LanguageTerran',
  undercommon: 'PF2E.LanguageUndercommon',
};

CONFIG.monsterTraits = {
  uncommon: 'PF2E.MonsterTraitUncommon',
  rare: 'PF2E.MonsterTraitRare',
  unique: 'PF2E.MonsterTraitUnique',
  aasimar: 'PF2E.MonsterTraitAasimar',
  aberration: 'PF2E.MonsterTraitAberration',
  acid: 'PF2E.MonsterTraitAcid',
  aeon: 'PF2E.MonsterTraitAeon',
  air: 'PF2E.MonsterTraitAir',
  alchemical: 'PF2E.MonsterTraitAlchemical',
  amphibious: 'PF2E.MonsterTraitAmphibious',
  anadi: 'PF2E.MonsterTraitAnadi',
  angel: 'PF2E.MonsterTraitAngel',
  animal: 'PF2E.MonsterTraitAnimal',
  aquatic: 'PF2E.MonsterTraitAquatic',
  archon: 'PF2E.MonsterTraitArchon',
  astral: 'PF2E.MonsterTraitAstral',
  azata: 'PF2E.MonsterTraitAzata',
  beast: 'PF2E.MonsterTraitBeast',
  boggard: 'PF2E.MonsterTraitBoggard',
  caligni: 'PF2E.MonsterTraitCaligni',
  catfolk: 'PF2E.MonsterTraitCatfolk',
  celestial: 'PF2E.MonsterTraitCelestial',
  changeling: 'PF2E.MonsterTraitChangeling',
  'charau-ka': 'PF2E.MonsterTraitCharauKa',
  cold: 'PF2E.MonsterTraitCold',
  construct: 'PF2E.MonsterTraitConstruct',
  daemon: 'PF2E.MonsterTraitDaemon',
  demon: 'PF2E.MonsterTraitDemon',
  dero: 'PF2E.MonsterTraitDero',
  devil: 'PF2E.MonsterTraitDevil',
  dhampir: 'PF2E.MonsterTraitDhampir',
  dinosaur: 'PF2E.MonsterTraitDinosaur',
  dragon: 'PF2E.MonsterTraitDragon',
  drow: 'PF2E.MonsterTraitDrow',
  duergar: 'PF2E.MonsterTraitDuergar',
  duskwalker: 'PF2E.MonsterTraitDuskwalker',
  dwarf: 'PF2E.MonsterTraitDwarf',
  earth: 'PF2E.MonsterTraitEarth',
  electricity: 'PF2E.MonsterTraitElectricity',
  elemental: 'PF2E.MonsterTraitElemental',
  elf: 'PF2E.MonsterTraitElf',
  ethereal: 'PF2E.MonsterTraitEthereal',
  evil: 'PF2E.MonsterTraitEvil',
  fey: 'PF2E.MonsterTraitFey',
  fiend: 'PF2E.MonsterTraitFiend',
  fire: 'PF2E.MonsterTraitFire',
  fungus: 'PF2E.MonsterTraitFungus',
  genie: 'PF2E.MonsterTraitGenie',
  ghost: 'PF2E.MonsterTraitGhost',
  ghoul: 'PF2E.MonsterTraitGhoul',
  giant: 'PF2E.MonsterTraitGiant',
  gnoll: 'PF2E.MonsterTraitGnoll',
  gnome: 'PF2E.MonsterTraitGnome',
  goblin: 'PF2E.MonsterTraitGoblin',
  golem: 'PF2E.MonsterTraitGolem',
  gremlin: 'PF2E.MonsterTraitGremlin',
  grippli: 'PF2E.MonsterTraitGrippli',
  hag: 'PF2E.MonsterTraitHag',
  halfling: 'PF2E.MonsterTraitHalfling',
  human: 'PF2E.MonsterTraitHuman',
  humanoid: 'PF2E.MonsterTraitHumanoid',
  incorporeal: 'PF2E.MonsterTraitIncorporeal',
  inevitable: 'PF2E.MonsterTraitInevitable',
  kobold: 'PF2E.MonsterTraitKobold',
  leshy: 'PF2E.MonsterTraitLeshy',
  lizardfolk: 'PF2E.MonsterTraitLizardfolk',
  merfolk: 'PF2E.MonsterTraitMerfolk',
  mindless: 'PF2E.MonsterTraitMindless',
  monitor: 'PF2E.MonsterTraitMonitor',
  mummy: 'PF2E.MonsterTraitMummy',
  mutant: 'PF2E.MonsterTraitMutant',
  nymph: 'PF2E.MonsterTraitNymph',
  ooze: 'PF2E.MonsterTraitOoze',
  orc: 'PF2E.MonsterTraitOrc',
  plant: 'PF2E.MonsterTraitPlant',
  protean: 'PF2E.MonsterTraitProtean',
  psychopomp: 'PF2E.MonsterTraitPsychopomp',
  rakshasa: 'PF2E.MonsterTraitRakshasa',
  ratfolk: 'PF2E.MonsterTraitRatfolk',
  'sea devil': 'PF2E.MonsterTraitSeaDevil',
  skeleton: 'PF2E.MonsterTraitSkeleton',
  soulbound: 'PF2E.MonsterTraitSoulbound',
  spirit: 'PF2E.MonsterTraitSpirit',
  sprite: 'PF2E.MonsterTraitSprite',
  swarm: 'PF2E.MonsterTraitSwarm',
  tengu: 'PF2E.MonsterTraitTengu',
  tiefling: 'PF2E.MonsterTraitTiefling',
  troll: 'PF2E.MonsterTraitTroll',
  undead: 'PF2E.MonsterTraitUndead',
  vampire: 'PF2E.MonsterTraitVampire',
  velstrac: 'PF2E.MonsterTraitVelstrac',
  water: 'PF2E.MonsterTraitWater',
  werecreature: 'PF2E.MonsterTraitWerecreature',
  wight: 'PF2E.MonsterTraitWight',
  wraith: 'PF2E.MonsterTraitWraith',
  xulgath: 'PF2E.MonsterTraitXulgath',
  zombie: 'PF2E.MonsterTraitZombie',
};

CONFIG.spellScalingModes = {
  none: 'PF2E.SpellScalingModeNone',
  level1: 'PF2E.SpellScalingModeLevel1',
  level2: 'PF2E.SpellScalingModeLevel2',
  level3: 'PF2E.SpellScalingModeLevel3',
  levelsecond: 'PF2E.SpellScalingModeLevelsecond',
  levelthird: 'PF2E.SpellScalingModeLevelthird',
  levelfourth: 'PF2E.SpellScalingModeLevelfourth',
  levelfifth: 'PF2E.SpellScalingModeLevelfifth',
  levelsixth: 'PF2E.SpellScalingModeLevelsixth',
  levelseventh: 'PF2E.SpellScalingModeLevelseventh',
  leveleighth: 'PF2E.SpellScalingModeLeveleighth',
  levelninth: 'PF2E.SpellScalingModeLevelninth',
  leveltenth: 'PF2E.SpellScalingModeLeveltenth',
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
  }
}
