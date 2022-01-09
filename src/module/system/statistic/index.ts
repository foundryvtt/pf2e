import {
    AbilityModifier,
    CheckModifier,
    ModifierPF2e,
    ProficiencyModifier,
    PROFICIENCY_RANK_OPTION,
    StatisticModifier,
} from "@module/modifiers";
import { CheckPF2e } from "@system/rolls";
import { ActorPF2e, CharacterPF2e, CreaturePF2e } from "@actor";
import {
    BaseStatisticData,
    CheckType,
    StatisticChatData,
    StatisticCompatData,
    StatisticData,
    StatisticDataWithCheck,
} from "./data";
import { ItemPF2e } from "@item";
import { CheckDC } from "@system/check-degree-of-success";

export * from "./data";

export interface StatisticRollParameters {
    /** Which attack this is (for the purposes of multiple attack penalty) */
    attackNumber?: number;
    /** Optional DC data for the roll */
    dc?: CheckDC | null;
    /** Any additional options which should be used in the roll. */
    extraRollOptions?: string[];
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

interface RollOptionParameters {
    extraRollOptions?: string[];
    item?: ItemPF2e | null;
}

export interface StatisticCheck {
    label: string;
    modifiers: ModifierPF2e[];
    calculateMap(options: { item: ItemPF2e }): { penalty: number; label: string };
    roll: (args?: StatisticRollParameters) => void;
    withOptions: (options?: RollOptionParameters) => {
        value: number;
        breakdown: string;
    };
    value: number;
    breakdown: string;
}

export interface StatisticDifficultyClass {
    value: number;
    breakdown: string;
}

type CheckValue<T extends BaseStatisticData> = T["check"] extends object ? StatisticCheck : undefined;

/** Object used to perform checks or get dcs, or both. These are created from StatisticData which drives its behavior. */
export class Statistic<T extends BaseStatisticData = StatisticData> {
    abilityModifier?: ModifierPF2e;

    get slug() {
        return this.data.slug;
    }

    get modifiers() {
        return this.data.modifiers ?? [];
    }

    constructor(private actor: ActorPF2e, public readonly data: T) {
        // Add some base modifiers depending on data values
        data.modifiers ??= [];
        if (typeof data.rank !== "undefined") {
            data.modifiers.unshift(ProficiencyModifier.fromLevelAndRank(actor.level, data.rank));
        }
        if (actor instanceof CharacterPF2e && data.ability) {
            this.abilityModifier = AbilityModifier.fromScore(data.ability, actor.abilities[data.ability].value);
            data.modifiers.unshift(this.abilityModifier);
        }
    }

    /** Compatibility function which creates a statistic from a StatisticModifier instead of from StatisticData. */
    static from(
        actor: ActorPF2e,
        stat: StatisticModifier,
        slug: string,
        label: string,
        type: CheckType,
        domains?: string[]
    ) {
        return new Statistic(actor, {
            slug,
            domains,
            check: { adjustments: stat.adjustments, label, type },
            dc: {},
            modifiers: [...stat.modifiers],
            notes: stat.notes,
        });
    }

    private createRollOptions(domains: string[], args: RollOptionParameters): string[] {
        const { item, extraRollOptions } = args;

        const rollOptions: string[] = [];
        if (domains && domains.length) {
            rollOptions.push(...this.actor.getRollOptions(domains), ...this.actor.getSelfRollOptions());
        }

        if (typeof this.data.rank !== "undefined") {
            rollOptions.push(PROFICIENCY_RANK_OPTION[this.data.rank]);
        }

        if (item) {
            rollOptions.push(...item.getItemRollOptions("item"));
            if (item.actor && item.actor.id !== this.actor.id) {
                rollOptions.push(...item.actor.getSelfRollOptions("origin"));
            }

            // Special cases, traits that modify the action itself universally
            // This might change once we've better decided how derivative traits will work
            const traits: string[] = item.data.data.traits?.value ?? [];
            if (traits.includes("attack")) {
                rollOptions.push("trait:attack");
            }
        }

        if (extraRollOptions) {
            rollOptions.push(...extraRollOptions);
        }

        return [...new Set(rollOptions)];
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
        const label = game.i18n.localize(check.label);
        const stat = new StatisticModifier(label, modifiers);

        const checkObject: StatisticCheck = {
            label,
            modifiers: modifiers,
            calculateMap: (options: { item: ItemPF2e }) => {
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
                const options = this.createRollOptions(domains, args);

                // Include multiple attack penalty to extra modifiers if given
                if (args.attackNumber && args.attackNumber > 1) {
                    if (!item) {
                        console.warn("Missing item argument while calculating MAP during check");
                    } else {
                        const map = checkObject.calculateMap({ item });
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

                CheckPF2e.roll(new CheckModifier(label, stat, extraModifiers), context, null, args.callback);
            },
            withOptions: (options: RollOptionParameters = {}) => {
                const check = new CheckModifier(label, stat);

                // toggle modifiers based on the specified options and re-apply stacking rules, if necessary
                const rollOptions = this.createRollOptions(domains, options);
                check.modifiers.forEach((modifier) => modifier.test(rollOptions));
                check.applyStackingRules();

                return {
                    value: check.totalModifier,
                    breakdown: check.modifiers
                        .filter((m) => m.enabled)
                        .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                        .join(", "),
                };
            },
            value: stat.totalModifier,
            get breakdown() {
                return modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    .join(", ");
            },
        };

        return checkObject as CheckValue<T>;
    }

    /** Calculates the DC (with optional roll options) and returns it, if this statistic has DC data. */
    dc(options?: RollOptionParameters): T["dc"] extends object ? StatisticDifficultyClass : undefined;

    dc(options: RollOptionParameters = {}): StatisticDifficultyClass | undefined {
        const data = this.data;
        if (!data.dc) {
            return undefined;
        }

        const domains = (data.domains ?? []).concat(data.dc.domains ?? []);
        const rollOptions = this.createRollOptions(domains, options);

        // toggle modifiers based on the specified options
        const modifiers = (data.modifiers ?? [])
            .concat(data.dc.modifiers ?? [])
            .map((modifier) => modifier.clone({ test: rollOptions }));

        return {
            value: (data.dc.base ?? 10) + new StatisticModifier("", modifiers).totalModifier,
            get breakdown() {
                return [game.i18n.localize("PF2E.DCBase")]
                    .concat(
                        modifiers
                            .filter((m) => m.enabled)
                            .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                    )
                    .join(", ");
            },
        };
    }

    /** Creates view data for sheets and chat messages */
    getChatData(options: RollOptionParameters = {}): StatisticChatData<T> {
        const check = this.check;
        const checkValues = check?.withOptions(options);
        const dcData = this.dc(options);

        const mapData = options.item && check?.calculateMap({ item: options.item });
        const map1 = mapData?.penalty ?? -5;

        return {
            name: this.slug,
            check: check && checkValues ? { ...checkValues, label: check.label, map1, map2: map1 * 2 } : undefined,
            dc: dcData
                ? {
                      value: dcData.value,
                      breakdown: dcData.breakdown,
                  }
                : undefined,
        } as StatisticChatData<T>;
    }

    /** Chat output data for checks only that is compatible with the older sheet styles. */
    getCompatData(this: Statistic<StatisticDataWithCheck>, options: RollOptionParameters = {}): StatisticCompatData {
        const check = this.check;
        const checkValues = check.withOptions(options);

        return {
            slug: this.slug,
            name: this.slug,
            value: checkValues.value ?? 0,
            totalModifier: checkValues.value ?? 0,
            breakdown: checkValues.breakdown ?? "",
            _modifiers: check.modifiers.map((mod) => ({
                slug: mod.slug,
                label: mod.label,
                modifier: mod.modifier,
                type: mod.type,
                enabled: mod.enabled,
                custom: mod.custom ?? false,
            })),
        };
    }
}
