import { CheckModifier, ModifierPF2e, StatisticModifier } from "@module/modifiers";
import { CheckPF2e, RollParameters } from "@system/rolls";
import { ActorPF2e, CreaturePF2e } from "@actor";
import { PredicatePF2e } from "@system/predication";
import { BaseStatisticData, CheckType, StatisticChatData, StatisticData } from "./data";

export * from "./data";

export interface StatisticCheck {
    modifiers: ModifierPF2e[];
    roll: (args?: RollParameters) => void;
    withOptions: (options?: { options?: string[] }) => {
        value: number;
        breakdown: string;
    };
    value: number;
    breakdown: string;
}

export interface StatisticDifficultyClass {
    labelKey: string;
    value: number;
    breakdown: string;
}

type CheckValue<T extends BaseStatisticData> = T["check"] extends object ? StatisticCheck : undefined;

/** Object used to perform checks or get dcs, or both. These are created from StatisticData which drives its behavior. */
export class Statistic<T extends BaseStatisticData = StatisticData> {
    constructor(private actor: ActorPF2e, public readonly data: T) {}

    /** Compatibility function which creates a statistic from a StatisticModifier instead of from StatisticData. */
    static from(actor: ActorPF2e, stat: StatisticModifier, name: string, label: string, type: CheckType) {
        return new Statistic(actor, {
            name: name,
            check: { adjustments: stat.adjustments, label, type },
            dc: {},
            modifiers: [...stat.modifiers],
            notes: stat.notes,
        });
    }

    /** Creates and returns an object that can be used to perform a check if this statistic has check data. */
    get check(): CheckValue<T> {
        const data = this.data;
        const check = data.check;
        if (!check) {
            return undefined as CheckValue<T>;
        }

        const modifiers = (data.modifiers ?? []).concat(check.modifiers ?? []);
        const stat = new StatisticModifier(data.name, modifiers);
        const name = game.i18n.localize(check.label ?? data.name);
        return {
            modifiers: modifiers,
            roll: (args: RollParameters = {}) => {
                const actor = this.actor;

                // This is required to determine the AC for attack dialogs
                const rollContext = (() => {
                    const isCreature = actor instanceof CreaturePF2e;
                    if (isCreature && ["attack-roll", "spell-attack-roll"].includes(check.type)) {
                        const domains = [];
                        if (check.type === "spell-attack-roll") {
                            domains.push("spell-attack-roll");
                        }
                        return actor.createAttackRollContext({ domains });
                    }

                    return null;
                })();

                if (args.dc && check.adjustments && check.adjustments.length) {
                    args.dc.adjustments ??= [];
                    args.dc.adjustments.push(...check.adjustments);
                }
                const context = {
                    actor,
                    dc: args.dc ?? rollContext?.dc,
                    notes: data.notes,
                    options: args.options,
                    item: args.item ?? null,
                    type: check.type,
                };
                CheckPF2e.roll(new CheckModifier(name, stat, args.modifiers), context, args.event, args.callback);
            },
            withOptions: (options?: { options?: string[] }) => {
                const check = new CheckModifier(name, stat);

                // toggle modifiers based on the specified options and re-apply stacking rules, if necessary
                check.modifiers.forEach((modifier) => {
                    modifier.ignored = !PredicatePF2e.test(modifier.predicate, options?.options ?? []);
                });
                check.applyStackingRules();

                return {
                    value: check.totalModifier,
                    breakdown: check.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                        .join(", "),
                };
            },
            value: stat.totalModifier,
            get breakdown() {
                return modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    .join(", ");
            },
        } as CheckValue<T>;
    }

    /** Calculates the DC (with optional roll options) and returns it, if this statistic has DC data. */
    dc(options?: { options?: string[] }): T["dc"] extends object ? StatisticDifficultyClass : undefined;

    dc(options?: { options?: string[] }): StatisticDifficultyClass | undefined {
        const data = this.data;
        if (!data.dc) {
            return undefined;
        }

        const modifiers = (data.modifiers ?? []).concat(data.dc.modifiers ?? []).map((modifier) => duplicate(modifier));

        // toggle modifiers based on the specified options
        modifiers.forEach((modifier) => {
            modifier.ignored = !PredicatePF2e.test(modifier.predicate, options?.options ?? []);
        });

        return {
            labelKey: data.dc.labelKey ?? `PF2E.CreatureStatisticDC.${data.name}`,
            value: (data.dc.base ?? 10) + new StatisticModifier(data.name, modifiers).totalModifier,
            get breakdown() {
                return [game.i18n.localize("PF2E.DCBase")]
                    .concat(
                        modifiers
                            .filter((m) => m.enabled)
                            .map((m) => `${game.i18n.localize(m.name)} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    )
                    .join(", ");
            },
        };
    }

    /** Creates view data for sheets and chat messages */
    getChatData(options: { options?: string[] } = {}): StatisticChatData<T> {
        const checkObject = this.check;
        const check = checkObject?.withOptions({ options: options.options });
        const dcData = this.dc({ options: options.options });
        return {
            check,
            dc: dcData
                ? {
                      value: dcData.value,
                      breakdown: dcData.breakdown,
                  }
                : undefined,
        } as StatisticChatData<T>;
    }
}
