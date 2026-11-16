import type { ActorPF2e, CreaturePF2e } from "@actor";
import {
    SingleCheckAction,
    SingleCheckActionVariant,
    type SingleCheckActionUseOptions,
    type SingleCheckActionVariantData,
} from "@actor/actions/index.ts";
import type { ProficiencyRank } from "@item/base/data/index.ts";
import type { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { PROFICIENCY_RANKS } from "@module/data.ts";
import { calculateSimpleDC } from "@module/dc.ts";
import type { RollOptionRuleElement } from "@module/rules/rule-element/roll-option/rule-element.ts";
import type { ActionDefaultOptions, CheckResultCallback } from "@system/action-macros/types.ts";
import { DEGREE_ADJUSTMENT_AMOUNTS, type DegreeOfSuccessAdjustment } from "@system/degree-of-success.ts";
import { localizer, objectHasKey } from "@util";
import { getSelectedActors } from "@util/token-actor-utils.ts";
import { skillActionPrompt, type SkillActionPromptResult } from "../skill-action-dialog.ts";
import { CheckFeat, treatWoundsMacroCallback } from "./treat-wounds-callback.ts";

const localize = localizer("PF2E.Actions.TreatWounds");

const BONUS_HEALING: Record<ProficiencyRank, number> = {
    untrained: 0,
    trained: 0,
    expert: 10,
    master: 30,
    legendary: 50,
};

/** Override in-memory value of the risky surgery roll option RE */
function toggleRiskySurgery(actor: ActorPF2e, value: boolean | string | null): boolean | string | null {
    if (value === null) return null;

    const rollOption = actor.rules.find(
        (r): r is RollOptionRuleElement => r.key === "RollOption" && "option" in r && r.option === "risky-surgery",
    );
    if (!rollOption) return null;

    const currentValue = rollOption.value;
    if (rollOption.value !== value) {
        rollOption.value = value;
    }
    return currentValue;
}

/** Prompt for the skill, DC tier, DC modifier, and feat toggles this use of Treat Wounds should apply. */
async function promptForTreatWounds(actor: CreaturePF2e): Promise<SkillActionPromptResult | null> {
    const medicineName = _loc("PF2E.Skill.Medicine");
    const skillOptions = [
        ...(CheckFeat(actor, "chirurgeon") ? [{ value: "crafting", label: _loc("PF2E.Skill.Crafting") }] : []),
        ...(CheckFeat(actor, "natural-medicine") ? [{ value: "nature", label: _loc("PF2E.Skill.Nature") }] : []),
        { value: "medicine", label: medicineName },
        // Listed last so medicine stays the default: this one only applies while Refocusing
        ...(CheckFeat(actor, "three-pecks-of-dew")
            ? [{ value: "occultism", label: _loc("PF2E.Skill.Occultism") }]
            : []),
    ];
    const feats = [
        ...(CheckFeat(actor, "risky-surgery")
            ? [
                  {
                      slug: "risky-surgery",
                      label: localize("Feats.RiskySurgery"),
                      checked: actor.getRollOptions(["medicine"]).includes("risky-surgery"),
                  },
              ]
            : []),
        ...(CheckFeat(actor, "mortal-healing")
            ? [{ slug: "mortal-healing", label: localize("Feats.MortalHealing"), checked: true }]
            : []),
    ];

    return skillActionPrompt({
        id: "treat-wounds",
        title: localize("Label"),
        intro: localize("Content"),
        skills: { label: localize("SkillSelect"), options: skillOptions },
        dcLabel: _loc("PF2E.InlineCheck.DCWithName", { name: medicineName }),
        dcOptions: {
            trained: localize("DC.Trained"),
            expert: localize("DC.Expert"),
            master: localize("DC.Master"),
            legendary: localize("DC.Legendary"),
        },
        modifierLabel: localize("DC.Mod"),
        feats,
    });
}

interface TreatWoundsActionUseOptions extends SingleCheckActionUseOptions {
    /** Skip the prompt by supplying the selections it would have returned. */
    selection: SkillActionPromptResult;
}

class TreatWoundsActionVariant extends SingleCheckActionVariant {
    override async use(options: Partial<TreatWoundsActionUseOptions> = {}): Promise<CheckResultCallback[]> {
        const actors = Array.isArray(options.actors)
            ? options.actors
            : options.actors
              ? [options.actors]
              : getSelectedActors({ exclude: ["loot", "party"], assignedFallback: true });
        const actor = actors[0];
        if (!actor || !actor.isOfType("creature")) {
            ui.notifications.error("PF2E.ErrorMessage.NoPCTokenSelected", { localize: true });
            return [];
        }

        const selection = options.selection ?? (await promptForTreatWounds(actor));
        if (!selection) return [];

        const skillSlug = selection.skill ?? "medicine";
        const skill = actor.skills[skillSlug];
        if (!skill?.proficient) {
            const skillName = objectHasKey(CONFIG.PF2E.skills, skillSlug)
                ? _loc(CONFIG.PF2E.skills[skillSlug]?.label ?? skillSlug)
                : skillSlug;
            ui.notifications.warn(localize("Error", { name: actor.name, skill: skillName }));
            return [];
        }

        const mod = selection.modifier;
        const riskySurgery = !!selection.feats["risky-surgery"];
        const mortalHealing = !!selection.feats["mortal-healing"];

        const usedProf = Math.min(PROFICIENCY_RANKS.indexOf(selection.rank), skill.rank ?? 1);
        const usedRank = PROFICIENCY_RANKS[usedProf];
        const medicBonus = CheckFeat(actor, "medic-dedication") ? (usedProf - 1) * 5 : 0;
        const magicHandsBonus = CheckFeat(actor, "magic-hands") ? actor.system.details.level.value : 0;
        const dcValue = calculateSimpleDC(usedRank) + mod;
        const bonus = BONUS_HEALING[usedRank] + medicBonus + magicHandsBonus;

        // Medicine roll options apply even when rolling one of the substitute skills
        const rollOptions = actor.getRollOptions(["all", "skill-check", "medicine"]);
        if (riskySurgery) rollOptions.push("risky-surgery");

        // Risky Surgery carries its own AdjustDegreeOfSuccess rule element, so it needs nothing here.
        // Mortal Healing has only a roll note, so this is the sole implementation of its degree bump.
        const mortalHealingAdjustment: DegreeOfSuccessAdjustment | null =
            mortalHealing && !riskySurgery
                ? {
                      adjustments: {
                          success: {
                              label: localize("Feats.MortalHealing"),
                              amount: DEGREE_ADJUSTMENT_AMOUNTS.INCREASE,
                          },
                      },
                  }
                : null;
        const adjustments = (actor.synthetics.degreeOfSuccessAdjustments["medicine"] ??= []);

        const previousRSValue = toggleRiskySurgery(actor, riskySurgery);
        try {
            // Synthetics survive until the actor next prepares data, so this is removed again below
            if (mortalHealingAdjustment) adjustments.push(mortalHealingAdjustment);
            const results = await super.use({
                ...options,
                actors: [actor],
                difficultyClass: { value: dcValue, visible: true },
                rollOptions: rollOptions.concat(options.rollOptions ?? []),
                statistic: skillSlug,
            });
            for (const result of results) {
                if (!result.message) continue;
                const message = result.message as ChatMessagePF2e;
                // Ensure the message is fully rendered in the chat log before updating the flag
                Hooks.once("renderChatMessageHTML", (m) => {
                    if (m.id !== message.id) return;
                    const flags = fu.mergeObject(
                        m._source.flags,
                        { [SYSTEM_ID]: { treatWoundsMacroFlag: { bonus } } },
                        { inplace: false },
                    );
                    m.update({ flags }, { render: false });
                });
                await treatWoundsMacroCallback({ actor, bonus, message, outcome: result.outcome });
            }
            return results;
        } finally {
            const index = mortalHealingAdjustment ? adjustments.indexOf(mortalHealingAdjustment) : -1;
            if (index >= 0) adjustments.splice(index, 1);
            toggleRiskySurgery(actor, previousRSValue);
        }
    }
}

class TreatWoundsAction extends SingleCheckAction {
    constructor() {
        super({
            description: "PF2E.Actions.TreatWounds.Description",
            img: `systems/${SYSTEM_ID}/icons/features/feats/treat-wounds.webp`,
            name: "PF2E.Actions.TreatWounds.Label",
            section: "skill",
            slug: "treat-wounds",
            statistic: "medicine",
            traits: ["exploration", "healing", "manipulate"],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): TreatWoundsActionVariant {
        return new TreatWoundsActionVariant(this, data);
    }
}

const action = new TreatWoundsAction();

async function treatWounds(options: ActionDefaultOptions): Promise<void> {
    await action.use({ ...options, event: options.event ?? undefined });
}

export { action, treatWounds as legacy };
