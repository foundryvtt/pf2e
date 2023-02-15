import { ActionMacroHelpers, SkillActionOptions } from "..";
import { Statistic } from "@system/statistic";
import { CreaturePF2e } from "@actor";

function resolveCheckLabel(stat: string, skill?: { label?: string } | null) {
    const lore = skill?.label?.trim() ?? "";
    const check = lore ? "lore" : stat;
    return game.i18n.format(`PF2E.ActionsCheck.${check}`, { lore });
}

export function discover(options: SkillActionOptions) {
    const slug = options?.skill ?? "perception";
    const rollOptions = ["action:discover"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Discover.Title",
        checkContext: (opts) => {
            const context = ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug });
            if (context) {
                if (opts.target instanceof CreaturePF2e) {
                    context.subtitle = resolveCheckLabel(slug, opts.target.system.influence.discovery[slug]);
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
        traits: ["concentrate", "secret"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => {
            const { influence } = target.system;
            const discovery = influence?.discovery[slug];
            if (discovery) {
                return new Statistic(target, {
                    slug: "discover-dc", // usually Will-based, but that is not guaranteed, so it gets a dedicated slug
                    label: "PF2E.Actions.Discover.Title",
                    dc: { base: discovery.dc, label: "PF2E.Actions.Discover.DifficultyClass.Label" },
                });
            }
            return null;
        },
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Discover", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Discover", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Discover", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Discover", "criticalFailure"),
        ],
    });
}
