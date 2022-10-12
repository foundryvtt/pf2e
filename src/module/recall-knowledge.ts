/**
 * Implementation of Creature Identification
 * https://2e.aonprd.com/Rules.aspx?ID=566
 * https://2e.aonprd.com/Skills.aspx?ID=5&General=true
 *
 * See https://www.youtube.com/watch?v=UtNS1vM7czM for interpretations
 */

import { NPCPF2e } from "@actor";
import { SkillLongForm } from "@actor/types";
import { Rarity } from "@module/data";
import {
    adjustDC,
    calculateDC,
    combineDCAdjustments,
    createDifficultyScale,
    DCAdjustment,
    DCOptions,
    NegativeDCAdjustment,
    rarityToDCAdjustment,
} from "./dc";

const identifySkills = new Map<string, SkillLongForm[]>();
identifySkills.set("aberration", ["occultism"]);
identifySkills.set("animal", ["nature"]);
identifySkills.set("astral", ["occultism"]);
identifySkills.set("beast", ["arcana", "nature"]);
identifySkills.set("celestial", ["religion"]);
identifySkills.set("construct", ["arcana", "crafting"]);
identifySkills.set("dragon", ["arcana"]);
identifySkills.set("elemental", ["arcana", "nature"]);
identifySkills.set("ethereal", ["occultism"]);
identifySkills.set("fey", ["nature"]);
identifySkills.set("fiend", ["religion"]);
identifySkills.set("fungus", ["nature"]);
identifySkills.set("humanoid", ["society"]);
identifySkills.set("monitor", ["religion"]);
identifySkills.set("ooze", ["occultism"]);
identifySkills.set("plant", ["nature"]);
identifySkills.set("spirit", ["occultism"]);
identifySkills.set("undead", ["religion"]);

export interface RecallKnowledgeDC {
    dc: number;
    progression: number[];
    start: DCAdjustment;
}

export interface IdentifyCreatureData {
    skill: RecallKnowledgeDC;
    specificLoreDC: RecallKnowledgeDC;
    unspecificLoreDC: RecallKnowledgeDC;
    skills: Set<SkillLongForm>;
}

function toKnowledgeDC(dc: number, rarity: Rarity, loreAdjustment: NegativeDCAdjustment = "normal"): RecallKnowledgeDC {
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
    creature: NPCPF2e,
    { proficiencyWithoutLevel = false }: DCOptions = {}
): IdentifyCreatureData {
    const rarity = creature.system.traits.rarity ?? "common";
    const level = Number(creature.system.details.level?.value) || 0;
    const dc = calculateDC(level, { proficiencyWithoutLevel });

    const traits = creature.system.traits.value;
    const skills = new Set(traits.flatMap((t) => identifySkills.get(t) ?? []));

    return {
        specificLoreDC: toKnowledgeDC(dc, rarity, "very easy"),
        unspecificLoreDC: toKnowledgeDC(dc, rarity, "easy"),
        skill: toKnowledgeDC(dc, rarity, "normal"),
        skills,
    };
}
