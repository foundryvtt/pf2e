import { ActionMacroHelpers, SkillActionOptions } from "..";
import { CharacterPF2e, NPCPF2e } from "@actor";
import { StrikeData } from "@actor/data/base";
import { StatisticModifier } from "@actor/modifiers";
import { CheckContext, CheckContextError } from "@system/action-macros/types";

const toHighestModifier = (highest: StatisticModifier | null, current: StatisticModifier) => {
    return current.totalModifier > (highest?.totalModifier ?? 0) ? current : highest;
};

export function escape(options: SkillActionOptions) {
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        checkContext: (context): CheckContext<never> => {
            // find all unarmed strikes and pick the one with the highest modifier
            const unarmed =
                options.skill && options.skill !== "unarmed"
                    ? null
                    : (() => {
                          const actionRollOptions = ["action:escape", "action:escape:unarmed"];
                          const { actor, rollOptions } = context.buildContext({
                              actor: context.actor,
                              rollOptions: {
                                  contextual: ["attack-roll", ...actionRollOptions],
                                  generic: actionRollOptions,
                              },
                              target: context.target,
                          });
                          const strikes = (() => {
                              if (actor instanceof CharacterPF2e) {
                                  return actor.system.actions.filter((strike) =>
                                      strike.weaponTraits.map((trait) => trait.name).includes("unarmed")
                                  );
                              } else if (actor instanceof NPCPF2e) {
                                  return actor.system.actions.filter((strike) =>
                                      strike.traits.map((trait) => trait.name).includes("unarmed")
                                  );
                              }
                              return [] as StrikeData[];
                          })();
                          const statistic = strikes
                              .map((strike) => {
                                  const modifiers = (strike.modifiers ?? []).concat(options?.modifiers ?? []);
                                  return new StatisticModifier("unarmed", modifiers, rollOptions);
                              })
                              .reduce(toHighestModifier, null);
                          return statistic ? { actor, rollOptions, statistic } : null;
                      })();

            // filter out any unarmed variants, as those are handled above
            const candidates = options?.skill ? [options.skill] : ["acrobatics", "athletics"];
            const alternatives = candidates
                .filter((slug) => slug !== "unarmed")
                .map((slug) => {
                    const actionRollOptions = ["action:escape", `action:escape:${slug}`];
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

            // find the highest modifier of unarmed, acrobatics, and athletics
            const highest = alternatives.reduce(
                (highest, current) =>
                    current.statistic.totalModifier > (highest?.statistic.totalModifier ?? 0) ? current : highest,
                unarmed
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
            throw new CheckContextError("No applicable statistic to roll for Escape check.", context.actor, "null");
        },
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Escape.Title",
        traits: ["attack"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.skills.athletics,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Escape", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Escape", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Escape", "criticalFailure"),
        ],
    });
}
