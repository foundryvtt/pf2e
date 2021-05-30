import { SkillAbbreviation } from '@actor/creature/data';
import { AbilityString } from './base';

export const ABILITY_ABBREVIATIONS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

export const CREATURE_ACTOR_TYPES = ['character', 'npc', 'familiar'] as const;

export const SAVE_TYPES = ['fortitude', 'reflex', 'will'] as const;

export const CONDITION_TYPES = [
    'blinded',
    'broken',
    'clumsy',
    'concealed',
    'confused',
    'controlled',
    'dazzled',
    'deafened',
    'doomed',
    'drained',
    'dying',
    'encumbered',
    'enfeebled',
    'fascinated',
    'fatigued',
    'flat-footed',
    'fleeing',
    'friendly',
    'frightened',
    'grabbed',
    'helpful',
    'hidden',
    'hostile',
    'immobilized',
    'indifferent',
    'invisible',
    'observed',
    'paralyzed',
    'persistent',
    'petrified',
    'prone',
    'quickened',
    'restrained',
    'sickened',
    'slowed',
    'stunned',
    'stupefied',
    'unconscious',
    'undetected',
    'unfriendly',
    'unnoticed',
    'wounded',
] as const;

export const SKILL_ABBREVIATIONS = [
    'acr',
    'arc',
    'ath',
    'cra',
    'dec',
    'dip',
    'itm',
    'med',
    'nat',
    'occ',
    'prf',
    'rel',
    'soc',
    'ste',
    'sur',
    'thi',
] as const;

export const SKILL_DICTIONARY = {
    acr: 'acrobatics',
    arc: 'arcana',
    ath: 'athletics',
    cra: 'crafting',
    dec: 'deception',
    dip: 'diplomacy',
    itm: 'intimidation',
    med: 'medicine',
    nat: 'nature',
    occ: 'occultism',
    prf: 'performance',
    rel: 'religion',
    soc: 'society',
    ste: 'stealth',
    sur: 'survival',
    thi: 'thievery',
};

interface SkillExpanded {
    ability: AbilityString;
    shortform: SkillAbbreviation;
}

export const SKILL_EXPANDED: Record<string, SkillExpanded> = {
    acrobatics: { ability: 'dex', shortform: 'acr' },
    arcana: { ability: 'int', shortform: 'arc' },
    athletics: { ability: 'str', shortform: 'ath' },
    crafting: { ability: 'int', shortform: 'cra' },
    deception: { ability: 'cha', shortform: 'dec' },
    diplomacy: { ability: 'cha', shortform: 'dip' },
    intimidation: { ability: 'cha', shortform: 'itm' },
    medicine: { ability: 'wis', shortform: 'med' },
    nature: { ability: 'wis', shortform: 'nat' },
    occultism: { ability: 'int', shortform: 'occ' },
    performance: { ability: 'cha', shortform: 'prf' },
    religion: { ability: 'wis', shortform: 'rel' },
    society: { ability: 'int', shortform: 'soc' },
    stealth: { ability: 'dex', shortform: 'ste' },
    survival: { ability: 'wis', shortform: 'sur' },
    thievery: { ability: 'dex', shortform: 'thi' },
};

export const SUPPORTED_ROLL_OPTIONS = [
    'all',
    'attack-roll',
    'damage-roll',
    'saving-throw',
    'fortitude',
    'reflex',
    'will',
    'perception',
    'initiative',
    'skill-check',
    'counteract-check',
];
