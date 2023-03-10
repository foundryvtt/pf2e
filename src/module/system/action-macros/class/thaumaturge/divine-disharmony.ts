import { ActionMacroHelpers, SkillActionOptions } from "../..";
import { StatisticModifier } from "@actor/modifiers";
import { CheckContext, CheckContextError } from "@system/action-macros/types";

export function divineDisharmony(options: SkillActionOptions) {
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        checkContext: (context): CheckContext<never> => {
            // filter out any unarmed variants, as those are handled above
            const candidates = options?.skill ? [options.skill] : ["deception", "intimidation"];
            const alternatives = candidates
                .map((slug) => {
                    const actionRollOptions = ["action:divineDisharmony", `action:divineDisharmony:${slug}`];
                    const { checkType, property } = ActionMacroHelpers.resolveStat(slug);
                    const { actor, rollOptions } = context.buildContext({
                        actor: context.actor,
                        rollOptions: {
                            contextual: [checkType, ...actionRollOptions],
                            generic: actionRollOptions,
                        },
                        target: context.target,
                    });
                    const statistic = getProperty(context.actor, property) as StatisticModifier & { rank?: number };
                    return {
                        actor,
                        rollOptions,
                        statistic: new StatisticModifier(
                            statistic.slug,
                            statistic.modifiers.concat(options?.modifiers ?? []),
                            rollOptions
                        ),
                    };
                });

            // find the highest modifier of deception, and intimidation
            const highest = alternatives.reduce(
                (highest, current) =>
                    current.statistic.totalModifier > (highest?.statistic.totalModifier ?? 0) ? current : highest
            );

            if (highest) {
                const { checkType, stat: slug, subtitle } = ActionMacroHelpers.resolveStat(highest.statistic.slug);
                return {
                    actor: highest.actor,
                    modifiers: options.modifiers,
                    rollOptions: highest.rollOptions,
                    slug,
                    statistic: highest.statistic,
                    subtitle,
                    type: checkType,
                };
            }
            throw new CheckContextError("No applicable statistic to roll for Divine Disharmony check.", context.actor, "null");
        },
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.DivineDisharmony.Title",
        traits: ["divine","enchantment", "esoterica", "manipulate", "thaumaturge"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.DivineDisharmony", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.DivineDisharmony", "success"),
        ],
    });
}
