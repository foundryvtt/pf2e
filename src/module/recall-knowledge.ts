import { ActorPF2e, HazardPF2e, NPCPF2e } from "@actor";
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
import { Statistic, StatisticCheck, StatisticRollParameters } from "@system/statistic/statistic.ts";
import { StatisticData } from "@system/statistic/data.ts";

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

function recallKnowledgeRollData(
    actor: ActorPF2e,
    skill: Statistic
): { rkSkill: Statistic; rkRollParams: StatisticRollParameters } {
    /* 
    Per guidance on CRB p 239, physical skills should typically use intelligence instead of the skill's 
    normal physical ability score.
    */
    const physicalAttributes = ["str", "dex", "con"];
    const attribute = physicalAttributes.includes(skill?.attribute ?? "int") ? "int" : skill?.attribute;

    const target = Array.from(game.user.targets)[0]?.actor ?? undefined;
    const dc = target ? calculateDC(target?.level) : 10;

    const rkStatisticData: StatisticData = {
        attribute: attribute,
        rank: skill?.rank ?? "untrained-level",
        slug: skill?.slug,
        label: skill?.label,
        check: { type: "recall-knowledge-check" },
        domains: ["all", "recall-knowledge", `${attribute}-based`, `${attribute}-skill-check`, "skill-check"],
    };
    rkStatisticData.check = new StatisticCheck(skill, rkStatisticData);

    const recallKnowledgeType =
        target instanceof NPCPF2e
            ? "Creature Identification"
            : target instanceof HazardPF2e
            ? "Trap Identification"
            : "Recall Knowledge";
    const targetRarity = target instanceof NPCPF2e || target instanceof HazardPF2e ? target.rarity : "common";
    const rkContext: RecallKnowledgeContextData = {
        type: recallKnowledgeType,
        rarity: targetRarity,
        difficulty: "normal",
        isLore: skill.lore,
        applicableLore: "normal",
    };

    const rkSkill = new Statistic(actor, { ...rkStatisticData });

    const rkRollParams: StatisticRollParameters = {
        action: "recall-knowledge",
        label: "Recall Knowledge: " + rkSkill?.label,
        extraRollOptions: ["secret", "action:recall-knowledge"],
        dc: dc,
        recallKnowledge: rkContext,
        traits: ["concentrate", "secret"],
    };

    return { rkSkill, rkRollParams };
}

interface RecallKnowledgeContextData {
    type: "Creature Identification" | "Trap Identification" | "Recall Knowledge";
    rarity: "common" | "uncommon" | "rare" | "unique";
    difficulty: DCAdjustment;
    isLore: boolean | undefined;
    applicableLore: Omit<DCAdjustment, "incredibly-easy" | "hard" | "very-hard" | "incredibly-hard">;
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

export {
    creatureIdentificationDCs,
    recallKnowledgeRollData,
    type RecallKnowledgeContextData,
    type CreatureIdentificationData,
};
