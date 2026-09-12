import type { ProficiencyRank } from "@item/base/data/index.ts";
import { PROFICIENCY_RANKS } from "@module/data.ts";
import { objectHasKey } from "@util";

/** Shared prompt for skill-action macros that pick a skill, a DC by proficiency rank, and optional feat toggles. */

interface SkillActionSkillOption {
    value: string;
    label: string;
}

interface SkillActionFeatToggle {
    slug: string;
    label: string;
    checked: boolean;
}

interface SkillActionPromptConfig {
    id: string;
    title: string;
    intro: string;
    dcOptions: Partial<Record<ProficiencyRank, string>>;
    dcLabel: string;
    modifierLabel: string;
    /** Omitted when the action is bound to a single skill */
    skills?: { label: string; options: SkillActionSkillOption[] };
    feats?: SkillActionFeatToggle[];
}

interface SkillActionPromptResult {
    /** Null when the config offered no skill select */
    skill: string | null;
    /** The proficiency rank whose DC was chosen */
    rank: ProficiencyRank;
    modifier: number;
    feats: Record<string, boolean>;
}

/** Render the shared skill-action form, resolving to the user's selections or null if dismissed. */
async function skillActionPrompt(config: SkillActionPromptConfig): Promise<SkillActionPromptResult | null> {
    const feats = config.feats ?? [];
    const uid = fu.randomID();
    // A lone option is no choice at all: render nothing rather than a control keyboard users can't reach
    const skills = (config.skills?.options.length ?? 0) > 1 ? config.skills : null;
    const dcOptions = PROFICIENCY_RANKS.flatMap((rank) => {
        const label = config.dcOptions[rank];
        return label ? { value: rank, label } : [];
    });
    const content = await fa.handlebars.renderTemplate(
        `systems/${SYSTEM_ID}/templates/macros/skill-action/prompt.hbs`,
        {
            uid,
            intro: config.intro,
            // DialogV2 focuses the default button unless the content claims focus first
            autofocusSkill: !!skills,
            skills,
            dcLabel: config.dcLabel,
            dcOptions,
            modifierLabel: config.modifierLabel,
            feats: feats.map((f) => ({ ...f, id: `${uid}-${f.slug}` })),
            featsLegend: _loc("PF2E.Item.Feat.Plural"),
        },
    );

    return foundry.applications.api.DialogV2.input<SkillActionPromptResult>({
        id: `${config.id}-{id}`,
        classes: ["scrollable-content", "skill-action-prompt"],
        window: { title: config.title },
        content,
        ok: {
            callback: (_event, button) => {
                const form = button.form;
                const stringValue = (name: string): string => {
                    const element = form?.elements.namedItem(name);
                    return element instanceof HTMLInputElement || element instanceof HTMLSelectElement
                        ? element.value
                        : "";
                };
                const isChecked = (name: string): boolean => {
                    const element = form?.elements.namedItem(name);
                    return element instanceof HTMLInputElement && element.checked;
                };

                return {
                    skill: config.skills ? stringValue("skill") || (config.skills.options[0]?.value ?? null) : null,
                    rank: (() => {
                        const chosen = stringValue("rank");
                        return objectHasKey(config.dcOptions, chosen) ? chosen : dcOptions[0].value;
                    })(),
                    modifier: Number(stringValue("modifier")) || 0,
                    feats: Object.fromEntries(feats.map((f) => [f.slug, isChecked(f.slug)])),
                };
            },
        },
    });
}

export { skillActionPrompt };
export type { SkillActionPromptConfig, SkillActionPromptResult };
