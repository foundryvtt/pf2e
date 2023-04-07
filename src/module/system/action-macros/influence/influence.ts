import { ActionMacroHelpers, SkillActionOptions } from "..";
import { Statistic } from "@system/statistic";
import { CreaturePF2e } from "@actor";

function resolveCheckLabel(stat: string, skill?: { label?: string } | null) {
    const lore = skill?.label?.trim() ?? "";
    const check = lore ? "lore" : stat;
    return game.i18n.format(`PF2E.ActionsCheck.${check}`, { lore });
}

export function influence(options: SkillActionOptions) {
    const slug = options?.skill ?? "diplomacy";
    const rollOptions = ["action:influence"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Influence.Title",
        checkContext: (opts) => {
            const context = ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug });
            if (context) {
                if (opts.target instanceof CreaturePF2e) {
                    context.subtitle = resolveCheckLabel(slug, opts.target.system.influence.skills[slug]);
                } else if (opts.actor instanceof CreaturePF2e) {
                    context.subtitle = resolveCheckLabel(slug, opts.actor.skills[slug]);
                } else {
                    const translated = game.i18n.localize(context.subtitle);
                    context.subtitle =
                        translated === context.subtitle
                            ? game.i18n.format("PF2E.ActionsCheck.lore", { lore: game.i18n.localize("PF2E.Lore") })
                            : translated;
                }
            }
            return context;
        },
        traits: ["concentrate", "linguistic"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => {
            const { influence } = target.system;
            const skill = influence?.skills[slug];
            if (skill) {
                return new Statistic(target, {
                    slug: "influence-dc", // usually Will-based, but that is not guaranteed, so it gets a dedicated slug
                    label: "PF2E.Actions.Influence.Title",
                    dc: { base: skill.dc, label: "PF2E.Actions.Influence.DifficultyClass.Label" },
                });
            }
            return null;
        },
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Influence", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Influence", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Influence", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Influence", "criticalFailure"),
        ],
    });
}
