import { NPCPF2e } from "@actor";
import { CreatureTrait } from "@actor/creature/types.ts";
import { SkillLongForm } from "@actor/types.ts";
import { Rarity } from "@module/data.ts";
import {
    adjustDC,
    calculateDC,
    combineDCAdjustments,
    createDifficultyScale,
    DCAdjustment,
    DCOptions,
    NegativeDCAdjustment,
    rarityToDCAdjustment,
} from "./dc.ts";

/**
 * Implementation of Creature Identification
 * https://2e.aonprd.com/Rules.aspx?ID=566
 * https://2e.aonprd.com/Skills.aspx?ID=5&General=true
 *
 * See https://www.youtube.com/watch?v=UtNS1vM7czM for interpretations
 */

const identifySkills = new Map<CreatureTrait, SkillLongForm[]>([
    ["aberration", ["occultism"]],
    ["animal", ["nature"]],
    ["astral", ["occultism"]],
    ["beast", ["arcana", "nature"]],
    ["celestial", ["religion"]],
    ["construct", ["arcana", "crafting"]],
    ["dragon", ["arcana"]],
    ["elemental", ["arcana", "nature"]],
    ["ethereal", ["occultism"]],
    ["fey", ["nature"]],
    ["fiend", ["religion"]],
    ["fungus", ["nature"]],
    ["humanoid", ["society"]],
    ["monitor", ["religion"]],
    ["ooze", ["occultism"]],
    ["plant", ["nature"]],
    ["spirit", ["occultism"]],
    ["undead", ["religion"]],
]);

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

function creatureIdentificationDCs(
    creature: NPCPF2e,
    { proficiencyWithoutLevel = false }: DCOptions = {}
): CreatureIdentificationData {
    const { level, rarity } = creature;
    const dc = calculateDC(level, { proficiencyWithoutLevel });

    const traits = creature.system.traits.value;
    const skills = Array.from(new Set(traits.flatMap((t) => identifySkills.get(t) ?? [])));

    return {
        skills,
        standard: toKnowledgeDC(dc, rarity, "normal"),
        lore: [toKnowledgeDC(dc, rarity, "easy"), toKnowledgeDC(dc, rarity, "very-easy")],
    };
}

interface RecallKnowledgeDC {
    dc: number;
    progression: number[];
    start: DCAdjustment;
}

interface CreatureIdentificationData {
    skills: SkillLongForm[];
    standard: RecallKnowledgeDC;
    lore: [RecallKnowledgeDC, RecallKnowledgeDC];
}

export { CreatureIdentificationData, creatureIdentificationDCs };
