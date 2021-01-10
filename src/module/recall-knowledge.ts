/**
 * Implementation of Creature Identification
 * https://2e.aonprd.com/Rules.aspx?ID=566
 * https://2e.aonprd.com/Skills.aspx?ID=5&General=true
 *
 * See https://www.youtube.com/watch?v=UtNS1vM7czM for interpretations
 */

import { NpcData } from './actor/actorDataDefinitions';
import { toNumber } from './utils';
import {
    adjustDC,
    calculateDC,
    combineDCAdjustments,
    createDifficultyScale,
    DCAdjustment,
    DCOptions,
    NegativeDCAdjustment,
    rarityToDCAdjustment,
} from './dc';
import { Rarity } from './item/dataDefinitions';

const identifySkills = new Map<string, string[]>();
identifySkills.set('aberration', ['occ']);
identifySkills.set('animal', ['nat']);
identifySkills.set('astral', ['occ']);
identifySkills.set('beast', ['arc', 'nat']);
identifySkills.set('celestial', ['rel']);
identifySkills.set('construct', ['arc', 'cra']);
identifySkills.set('dragon', ['arc']);
identifySkills.set('elemental', ['arc', 'nat']);
identifySkills.set('ethereal', ['occ']);
identifySkills.set('fey', ['nat']);
identifySkills.set('fiend', ['rel']);
identifySkills.set('fungus', ['nat']);
identifySkills.set('humanoid', ['soc']);
identifySkills.set('monitor', ['rel']);
identifySkills.set('ooze', ['occ']);
identifySkills.set('plant', ['nat']);
identifySkills.set('spirit', ['occ']);
identifySkills.set('undead', ['rel']);

export interface RecallKnowledgeDC {
    dc: number;
    progression: number[];
    start: DCAdjustment;
}

export interface IdentifyCreatureData {
    skill: RecallKnowledgeDC;
    specificLoreDC: RecallKnowledgeDC;
    unspecificLoreDC: RecallKnowledgeDC;
    skills: Set<string>;
}

function toKnowledgeDC(dc: number, rarity: Rarity, loreAdjustment: NegativeDCAdjustment = 'normal'): RecallKnowledgeDC {
    const rarityAdjustment = rarityToDCAdjustment(rarity);
    const start = combineDCAdjustments(rarityAdjustment, loreAdjustment);
    const progression = createDifficultyScale(dc, start);
    return {
        dc: adjustDC(dc, start),
        progression,
        start,
    };
}

export function identifyCreature(
    creature: NpcData,
    { proficiencyWithoutLevel = false }: DCOptions = {},
): IdentifyCreatureData {
    const rarity = creature.data.traits?.rarity?.value ?? 'common';
    const level = toNumber(creature.data.details.level?.value) ?? 0;
    const dc = calculateDC(level, { proficiencyWithoutLevel });

    const traits = creature.data.traits?.traits?.value;
    const skills = new Set(
        traits.filter((trait) => identifySkills.has(trait)).flatMap((trait) => identifySkills.get(trait)),
    );

    return {
        specificLoreDC: toKnowledgeDC(dc, rarity, 'very easy'),
        unspecificLoreDC: toKnowledgeDC(dc, rarity, 'easy'),
        skill: toKnowledgeDC(dc, rarity, 'normal'),
        skills,
    };
}
