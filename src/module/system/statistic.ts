import { CheckModifier, ModifierPF2e, ModifierPredicate, StatisticModifier } from '@module/modifiers';
import { CheckPF2e, RollParameters } from '@system/rolls';
import { RollNotePF2e } from '@module/notes';
import { ActorPF2e } from '@actor';
import { DegreeOfSuccessAdjustment } from '@system/check-degree-of-success';

export interface StatisticCheckData {
    adjustments?: DegreeOfSuccessAdjustment[];
    label?: string;
    modifiers?: ModifierPF2e[];
    type: string;
}

export interface StatisticDifficultyClassData {
    base?: number;
    labelKey?: string;
    modifiers?: ModifierPF2e[];
}

export interface StatisticData {
    name: string;
    check?: StatisticCheckData;
    dc?: StatisticDifficultyClassData;
    modifiers?: ModifierPF2e[];
    notes?: RollNotePF2e[];
}

export interface StatisticCheck {
    modifiers: ModifierPF2e[];
    roll: (args: RollParameters & { modifiers: ModifierPF2e[] }) => void;
    totalModifier: (options?: { options?: string[] }) => number;
    value: number;
}

export interface StatisticDifficultyClass {
    labelKey: string;
    value: number;
}

export interface StatisticWithDC {
    dc(options?: { options?: string[] }): StatisticDifficultyClass;
}

export interface StatisticWithCheck {
    get check(): StatisticCheck;
}

export interface Statistic extends StatisticWithCheck, StatisticWithDC {}

export class StatisticBuilder {
    static from(
        actor: ActorPF2e,
        data: StatisticData & ({ check: StatisticCheckData } & { dc: StatisticDifficultyClassData }),
    ): StatisticWithCheck & StatisticWithDC;
    static from(actor: ActorPF2e, data: StatisticData & { check: StatisticCheckData }): StatisticWithCheck;
    static from(actor: ActorPF2e, data: StatisticData & { dc: StatisticDifficultyClassData }): StatisticWithDC;
    static from(
        actor: ActorPF2e,
        data: StatisticData & ({ check: StatisticCheckData } | { dc: StatisticDifficultyClassData }),
    ): StatisticWithCheck | StatisticWithDC {
        const stat = {} as StatisticWithCheck & StatisticWithDC;
        if (data.dc) {
            stat.dc = (options?: { options?: string[] }): StatisticDifficultyClass => {
                const modifiers = (data.modifiers ?? [])
                    .concat(data.dc!.modifiers ?? [])
                    .map((modifier) => duplicate(modifier));

                // toggle modifiers based on the specified options
                modifiers.forEach((modifier) => {
                    modifier.ignored = !ModifierPredicate.test(modifier.predicate, options?.options ?? []);
                });

                return {
                    labelKey: data.dc!.labelKey ?? `PF2E.CreatureStatisticDC.${data.name}`,
                    value: (data.dc!.base ?? 10) + new StatisticModifier(data.name, modifiers).totalModifier,
                };
            };
        }
        if (data.check) {
            Object.defineProperty(stat, 'check', {
                get(): StatisticCheck {
                    const modifiers = (data.modifiers ?? []).concat(data.check!.modifiers ?? []);
                    const stat = new StatisticModifier(data.name, modifiers);
                    const name = game.i18n.localize(data.check!.label ?? data.name);
                    return {
                        modifiers: modifiers,
                        roll: (args: RollParameters & { modifiers: ModifierPF2e[] }) => {
                            if (args?.dc && data.check!.adjustments && data.check!.adjustments.length) {
                                args.dc.adjustments ??= [];
                                args.dc.adjustments.push(...data.check!.adjustments);
                            }
                            const context = {
                                actor: actor,
                                dc: args?.dc,
                                notes: data.notes,
                                options: args?.options,
                                type: data.check!.type,
                            };
                            CheckPF2e.roll(
                                new CheckModifier(name, stat, args?.modifiers),
                                context,
                                args?.event,
                                args?.callback,
                            );
                        },
                        totalModifier: (options?: { options?: string[] }) => {
                            const check = new CheckModifier(name, stat);

                            // toggle modifiers based on the specified options and re-apply stacking rules, if necessary
                            check.modifiers.forEach((modifier) => {
                                modifier.ignored = !ModifierPredicate.test(modifier.predicate, options?.options ?? []);
                            });
                            check.applyStackingRules();

                            return check.totalModifier;
                        },
                        value: stat.totalModifier,
                    };
                },
            });
        }
        return stat;
    }
}
