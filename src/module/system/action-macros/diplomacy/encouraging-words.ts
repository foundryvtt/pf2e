import { CharacterPF2e } from "@actor";
import {
    SingleCheckAction,
    SingleCheckActionVariant,
    type SingleCheckActionUseOptions,
    type SingleCheckActionVariantData,
} from "@actor/actions/index.ts";
import type { ProficiencyRank } from "@item/base/data/index.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { PROFICIENCY_RANKS } from "@module/data.ts";
import { calculateSimpleDC } from "@module/dc.ts";
import type { ActionDefaultOptions, CheckResultCallback } from "@system/action-macros/types.ts";
import { localizer } from "@util";
import { getSelectedActors } from "@util/token-actor-utils.ts";
import { skillActionPrompt, type SkillActionPromptResult } from "../skill-action-dialog.ts";

const localize = localizer("PF2E.Actions.EncouragingWords");

const BONUS_STAMINA: Record<ProficiencyRank, number> = {
    untrained: 0,
    trained: 0,
    expert: 5,
    master: 15,
    legendary: 25,
};

async function promptForEncouragingWords(): Promise<SkillActionPromptResult | null> {
    return skillActionPrompt({
        id: "encouraging-words",
        title: localize("Title"),
        intro: localize("Content"),
        dcLabel: localize("DC.Label"),
        dcOptions: {
            trained: localize("DC.Trained"),
            expert: localize("DC.Expert"),
            master: localize("DC.Master"),
            legendary: localize("DC.Legendary"),
        },
        modifierLabel: localize("DC.Mod"),
    });
}

/** Post the stamina recovery or mental damage roll indicated by the check's outcome. */
async function encouragingWordsCallback(
    actor: CharacterPF2e,
    bonus: number,
    result: CheckResultCallback,
): Promise<void> {
    const bonusString = bonus > 0 ? `+ ${bonus}` : "";
    const { healFormula, successLabel } = ((): { healFormula?: string; successLabel?: string } => {
        switch (result.outcome) {
            case "criticalSuccess":
                return { healFormula: `2d8${bonusString}`, successLabel: localize("CritSuccess") };
            case "success":
                return { healFormula: `1d8${bonusString}`, successLabel: localize("Success") };
            case "failure":
                return { successLabel: localize("Failure") };
            case "criticalFailure":
                return { healFormula: "1d8", successLabel: localize("CritFailure") };
            default:
                return {};
        }
    })();
    if (!healFormula) return;

    const healRoll = await new Roll(healFormula).roll();
    const rollType = result.outcome === "criticalFailure" ? localize("Damage") : localize("Recovery");
    const token = actor.getActiveTokens().shift()?.document ?? null;

    await ChatMessagePF2e.create({
        speaker: ChatMessagePF2e.getSpeaker({ actor, token }),
        flavor: `<strong>${rollType} ${localize("Title")}</strong> (${successLabel})`,
        rolls: [healRoll.toJSON()],
    });
}

interface EncouragingWordsActionUseOptions extends SingleCheckActionUseOptions {
    /** Skip the prompt by supplying the selections it would have returned. */
    selection: SkillActionPromptResult;
}

class EncouragingWordsActionVariant extends SingleCheckActionVariant {
    override async use(options: Partial<EncouragingWordsActionUseOptions> = {}): Promise<CheckResultCallback[]> {
        const actors = Array.isArray(options.actors)
            ? options.actors
            : options.actors
              ? [options.actors]
              : getSelectedActors({ exclude: ["loot", "party"], assignedFallback: true });
        const actor = actors[0];
        if (actors.length > 1 || !(actor instanceof CharacterPF2e)) {
            ui.notifications.error(localize("BadArgs"));
            return [];
        }

        const selection = options.selection ?? (await promptForEncouragingWords());
        if (!selection) return [];

        const usedProf = Math.min(PROFICIENCY_RANKS.indexOf(selection.rank), actor.skills.diplomacy.rank ?? 0);
        if (usedProf < 1) {
            ui.notifications.warn(localize("NotTrained", { name: actor.name }));
            return [];
        }
        const usedRank = PROFICIENCY_RANKS[usedProf];
        const dcValue = calculateSimpleDC(usedRank) + selection.modifier;
        const bonus = BONUS_STAMINA[usedRank];

        const results = await super.use({ ...options, actors: [actor], difficultyClass: { value: dcValue } });
        for (const result of results) {
            await encouragingWordsCallback(actor, bonus, result);
        }
        return results;
    }
}

class EncouragingWordsAction extends SingleCheckAction {
    constructor() {
        super({
            cost: 1,
            description: "PF2E.Actions.EncouragingWords.Description",
            img: `systems/${SYSTEM_ID}/icons/actions/OneAction.webp`,
            name: "PF2E.Actions.EncouragingWords.Title",
            section: "skill",
            slug: "encouraging-words",
            statistic: "diplomacy",
            traits: ["auditory", "linguistic", "mental"],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): EncouragingWordsActionVariant {
        return new EncouragingWordsActionVariant(this, data);
    }
}

const action = new EncouragingWordsAction();

async function encouragingWords(options: ActionDefaultOptions): Promise<void> {
    await action.use({ ...options, event: options.event ?? undefined });
}

export { action, encouragingWords as legacy };
