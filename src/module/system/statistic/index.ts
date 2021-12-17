import { CheckModifier, ModifierPF2e, StatisticModifier } from "@module/modifiers";
import { CheckPF2e } from "@system/rolls";
import { ActorPF2e, CreaturePF2e } from "@actor";
import { BaseStatisticData, CheckType, StatisticChatData, StatisticData } from "./data";
import { ItemPF2e } from "@item";
import { CheckDC } from "@system/check-degree-of-success";

export * from "./data";

export interface StatisticRollParameters {
    /** Which attack this is (for the purposes of multiple attack penalty) */
    attackNumber?: number;
    /** Optional DC data for the roll */
    dc?: CheckDC | null;
    /** Any options which should be used in the roll. */
    options?: string[];
    /** Additional modifiers */
    modifiers?: ModifierPF2e[];
    /** The originating item of this attack, if any */
    item?: Embedded<ItemPF2e> | null;
    /** Is this a secret roll? */
    secret?: boolean;
    /** Should the dialog be skipped */
    skipDialog?: boolean;
    /** Callback called when the roll occurs. */
    callback?: (roll: Rolled<Roll>) => void;
}

export interface StatisticCheck {
    modifiers: ModifierPF2e[];
    calculateMap(options: { item: ItemPF2e; options?: string[] }): { penalty: number; label: string };
    roll: (args?: StatisticRollParameters) => void;
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
    get name() {
        return this.data.name;
    }

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

        const domains = (data.domains ?? []).concat(check.domains ?? []);
        const modifiers = (data.modifiers ?? []).concat(check.modifiers ?? []);
        const stat = new StatisticModifier(data.name, modifiers);
        const name = game.i18n.localize(check.label ?? data.name);

        const checkObject: StatisticCheck = {
            modifiers: modifiers,
            calculateMap: (options: { item: ItemPF2e; options: string[] }) => {
                const baseMap = options.item.calculateMap();
                const penalties = [...(check.penalties ?? [])];
                penalties.push({
                    label: "PF2E.MultipleAttackPenalty",
                    penalty: baseMap.map2,
                });
                const { label, penalty } = penalties.reduce(
                    (lowest, current) => (lowest.penalty > current.penalty ? lowest : current),
                    penalties[0]
                );

                return { label, penalty };
            },
            roll: (args: StatisticRollParameters = {}) => {
                const actor = this.actor;
                const item = args.item ?? null;

                // This is required to determine the AC for attack dialogs
                const rollContext = (() => {
                    const isCreature = actor instanceof CreaturePF2e;
                    if (isCreature && ["attack-roll", "spell-attack-roll"].includes(check.type)) {
                        return actor.createAttackRollContext({ domains });
                    }

                    return null;
                })();

                if (args.dc && check.adjustments && check.adjustments.length) {
                    args.dc.adjustments ??= [];
                    args.dc.adjustments.push(...check.adjustments);
                }

                const extraModifiers = [...(args?.modifiers ?? [])];
                const options = this.actor.getRollOptions(domains).concat(args.options ?? []);

                // Include multiple attack penalty to extra modifiers if given
                if (args.attackNumber && args.attackNumber > 1) {
                    if (!item) {
                        console.warn("Missing item argument while calculating MAP during check");
                    } else {
                        const map = checkObject.calculateMap({ item, options });
                        const mapValue = Math.min(3, args.attackNumber);
                        const penalty = (mapValue - 1) * map.penalty;
                        extraModifiers.push(new ModifierPF2e(map.label, penalty, "untyped"));
                    }
                }

                // Create parameters for the check roll function
                const context = {
                    actor,
                    item,
                    dc: args.dc ?? rollContext?.dc,
                    notes: data.notes,
                    options,
                    type: check.type,
                    secret: args.secret,
                    skipDialog: args.skipDialog,
                };

                CheckPF2e.roll(new CheckModifier(name, stat, extraModifiers), context, null, args.callback);
            },
            withOptions: (options: { options?: string[] } = {}) => {
                const check = new CheckModifier(name, stat);

                // toggle modifiers based on the specified options and re-apply stacking rules, if necessary
                const rollOptions = this.actor.getRollOptions(domains).concat(options.options ?? []);
                check.modifiers.forEach((modifier) => modifier.test(rollOptions));
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
        };

        return checkObject as CheckValue<T>;
    }

    /** Calculates the DC (with optional roll options) and returns it, if this statistic has DC data. */
    dc(options?: { options?: string[] }): T["dc"] extends object ? StatisticDifficultyClass : undefined;

    dc(options: { options?: string[] } = {}): StatisticDifficultyClass | undefined {
        const data = this.data;
        if (!data.dc) {
            return undefined;
        }

        const domains = (data.domains ?? []).concat(data.dc.domains ?? []);
        const rollOptions = this.actor.getRollOptions(domains).concat(options.options ?? []);

        // toggle modifiers based on the specified options
        const modifiers = (data.modifiers ?? [])
            .concat(data.dc.modifiers ?? [])
            .map((modifier) => modifier.clone({ test: rollOptions }));

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
    getChatData(options: { item?: ItemPF2e; options?: string[] } = {}): StatisticChatData<T> {
        const checkObject = this.check;
        const check = checkObject?.withOptions({ options: options.options });
        const dcData = this.dc({ options: options.options });

        const mapData = options.item && checkObject?.calculateMap({ item: options.item, options: options.options });
        const map1 = mapData?.penalty ?? -5;

        return {
            name: this.name,
            check: check ? { ...check, map1, map2: map1 * 2 } : undefined,
            dc: dcData
                ? {
                      value: dcData.value,
                      breakdown: dcData.breakdown,
                  }
                : undefined,
        } as StatisticChatData<T>;
    }
}
