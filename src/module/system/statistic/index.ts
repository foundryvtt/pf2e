import { ActorPF2e } from "@actor";
import { calculateMAPs } from "@actor/helpers";
import {
    CheckModifier,
    createAbilityModifier,
    ModifierPF2e,
    ProficiencyModifier,
    PROFICIENCY_RANK_OPTION,
    StatisticModifier,
} from "@actor/modifiers";
import { AbilityString } from "@actor/types";
import { ItemPF2e } from "@item";
import { ZeroToFour } from "@module/data";
import { extractNotes, extractRollSubstitutions, extractRollTwice } from "@module/rules/util";
import { eventToRollParams } from "@scripts/sheet-util";
import { CheckRoll } from "@system/check/roll";
import { CheckDC } from "@system/degree-of-success";
import { CheckPF2e, CheckRollCallback, CheckRollContext, CheckType, RollTwiceOption } from "@system/rolls";
import { isObject } from "@util";
import {
    BaseStatisticData,
    StatisticChatData,
    StatisticCompatData,
    StatisticData,
    StatisticDataWithCheck,
    StatisticDataWithDC,
} from "./data";

export * from "./data";

export interface StatisticRollParameters {
    /** Which attack this is (for the purposes of multiple attack penalty) */
    attackNumber?: number;
    /** Optional target for the roll */
    target?: ActorPF2e | null;
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
    /** Should this roll be rolled twice? If so, should it keep highest or lowest? */
    rollTwice?: RollTwiceOption;
    /** Callback called when the roll occurs. */
    callback?: CheckRollCallback;
}

interface RollOptionParameters {
    extraRollOptions?: string[];
    item?: ItemPF2e | null;
    target?: ActorPF2e | null;
}

type CheckValue<T extends BaseStatisticData> = T["check"] extends object ? StatisticCheck : null;
type DCValue<T extends BaseStatisticData> = T["dc"] extends object ? StatisticDifficultyClass : null;

function hasCheck(statistic: Statistic<BaseStatisticData>): statistic is Statistic<StatisticDataWithCheck> {
    return !!statistic.data.check;
}

function hasDC(statistic: Statistic<BaseStatisticData>): statistic is Statistic<StatisticDataWithDC> {
    return !!statistic.data.dc;
}

/** Object used to perform checks or get dcs, or both. These are created from StatisticData which drives its behavior. */
export class Statistic<T extends BaseStatisticData = StatisticData> {
    ability: AbilityString | null = null;

    abilityModifier: ModifierPF2e | null = null;

    rank: ZeroToFour | null = null;

    proficient = true;

    modifiers: ModifierPF2e[];

    slug: string;

    label: string;

    constructor(public actor: ActorPF2e, public readonly data: T, public options?: RollOptionParameters) {
        this.slug = data.slug;
        this.ability = data.ability ?? null;
        this.label = game.i18n.localize(data.label);

        // Add some base modifiers depending on data values
        this.modifiers = [data.modifiers ?? []].flat();

        if (typeof data.rank === "number") {
            this.rank = data.rank;
            this.proficient = this.rank > 0;
            this.modifiers.unshift(ProficiencyModifier.fromLevelAndRank(actor.level, data.rank));
        } else {
            this.proficient = data.proficient === undefined ? true : !!data.proficient;
        }

        if (actor.isOfType("character") && this.ability) {
            this.abilityModifier = createAbilityModifier({ actor, ability: this.ability, domains: data.domains ?? [] });
            this.modifiers.unshift(this.abilityModifier);
        }

        // Pre-test modifiers so that inspection outside of rolls (such as modifier popups) works correctly
        if (data.domains) {
            const options = this.createRollOptions(data.domains, {});

            for (const modifier of this.modifiers) {
                modifier.test(options);
            }
            data.check?.modifiers?.forEach((mod) => mod.test(options));
            data.dc?.modifiers?.forEach((mod) => mod.test(options));
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
            label,
            check: { adjustments: stat.adjustments, type },
            dc: {},
            modifiers: [...stat.modifiers],
        });
    }

    createRollOptions(domains: string[], args: RollOptionParameters = {}): Set<string> {
        const { item, extraRollOptions, target } = args;

        const rollOptions: string[] = [];
        if (domains && domains.length) {
            rollOptions.push(...this.actor.getRollOptions(domains), ...this.actor.getSelfRollOptions());
        }

        if (typeof this.data.rank !== "undefined") {
            rollOptions.push(PROFICIENCY_RANK_OPTION[this.data.rank]);
        }

        if (this.data.rollOptions) {
            rollOptions.push(...this.data.rollOptions);
        }

        if (item) {
            rollOptions.push(...item.getRollOptions("item"));
            if (item.actor && item.actor.id !== this.actor.id) {
                rollOptions.push(...item.actor.getSelfRollOptions("origin"));
            }

            // Special cases, traits that modify the action itself universally
            // This might change once we've better decided how derivative traits will work
            const traits: string[] = item.system.traits?.value ?? [];
            if (traits.includes("attack")) {
                rollOptions.push("trait:attack");
            }
        }

        if (target) {
            rollOptions.push(...target.getSelfRollOptions("target"));
        }

        if (extraRollOptions) {
            rollOptions.push(...extraRollOptions);
        }

        return new Set(rollOptions);
    }

    withRollOptions(options?: RollOptionParameters): Statistic<T> {
        const newOptions = mergeObject(this.options ?? {}, options ?? {}, { inplace: false });
        return new Statistic(this.actor, deepClone(this.data), newOptions);
    }

    /** Creates and returns an object that can be used to perform a check if this statistic has check data. */
    get check(): CheckValue<T> {
        if (hasCheck(this)) {
            return new StatisticCheck(this, this.options) as CheckValue<T>;
        }

        return null as CheckValue<T>;
    }

    /** Calculates the DC (with optional roll options) and returns it, if this statistic has DC data. */
    get dc(): DCValue<T> {
        if (hasDC(this)) {
            return new StatisticDifficultyClass(this, this.options) as DCValue<T>;
        }

        return null as DCValue<T>;
    }

    /** Creates view data for sheets and chat messages */
    getChatData(options: RollOptionParameters = {}): StatisticChatData<T> {
        const { check, dc } = this.withRollOptions(options);
        const { map1, map2 } = options.item
            ? calculateMAPs(options.item, {
                  domains: check?.domains ?? [],
                  options: check?.createRollOptions(options) ?? [],
              })
            : { map1: -5, map2: -10 };

        return {
            name: this.slug,
            check: check ? { mod: check.mod, breakdown: check.breakdown, label: check.label, map1, map2 } : undefined,
            dc: dc
                ? {
                      value: dc.value,
                      breakdown: dc.breakdown,
                  }
                : undefined,
        } as StatisticChatData<T>;
    }

    /** Chat output data for checks only that is compatible with the older sheet styles. */
    getCompatData(this: Statistic<StatisticDataWithCheck>, options: RollOptionParameters = {}): StatisticCompatData {
        const { check } = this.withRollOptions(options);

        return {
            slug: this.slug,
            name: this.slug,
            value: check?.mod ?? 0,
            totalModifier: check?.mod ?? 0,
            breakdown: check?.breakdown ?? "",
            _modifiers: check.modifiers.map((m) => m.toObject()),
        };
    }
}

class StatisticCheck {
    domains: string[];
    mod: number;
    modifiers: ModifierPF2e[];

    #stat: StatisticModifier;

    constructor(private parent: Statistic<StatisticDataWithCheck>, options?: RollOptionParameters) {
        const data = parent.data;
        this.domains = (parent.data.domains ?? []).concat(data.check.domains ?? []);
        this.modifiers = parent.modifiers.concat(data.check.modifiers ?? []);

        const rollOptions = parent.createRollOptions(this.domains, options);
        this.#stat = new StatisticModifier(this.label, this.modifiers, rollOptions);
        this.mod = this.#stat.totalModifier;
    }

    get label() {
        const parentLabel = this.parent.label;
        const data = this.parent.data;
        if (data.check.label) return game.i18n.localize(data.check.label);

        switch (data.check.type) {
            case "skill-check":
                return game.i18n.format("PF2E.SkillCheckWithName", { skillName: parentLabel });
            case "saving-throw":
                return game.i18n.format("PF2E.SavingThrowWithName", { saveName: parentLabel });
            case "spell-attack-roll":
                return game.i18n.format("PF2E.SpellAttackWithTradition", { tradition: parentLabel });
            default:
                return parentLabel;
        }
    }

    createRollOptions(args: RollOptionParameters = {}): Set<string> {
        return this.parent.createRollOptions(this.domains, args);
    }

    async roll(args: StatisticRollParameters = {}): Promise<Rolled<CheckRoll> | null> {
        // Allow use of events for modules and macros but don't allow it for internal system use
        const { secret, skipDialog } = (() => {
            if (isObject<{ event: { originalEvent?: unknown } }>(args)) {
                const event = args.event?.originalEvent ?? args.event;
                if (event instanceof MouseEvent) {
                    return mergeObject({ secret: args.secret, skipDialog: args.skipDialog }, eventToRollParams(event));
                }
            }

            return args;
        })();

        const data = this.parent.data;
        const actor = this.parent.actor;
        const item = args.item ?? null;
        const domains = this.domains;

        // This is required to determine the AC for attack dialogs
        const rollContext = (() => {
            const isCreature = actor.isOfType("creature");
            const isAttackItem = item?.isOfType("weapon", "melee", "spell");
            if (isCreature && isAttackItem && ["attack-roll", "spell-attack-roll"].includes(data.check.type)) {
                return actor.getAttackRollContext({ item, domains, options: new Set() });
            }

            return null;
        })();

        if (args.dc && data.check.adjustments && data.check.adjustments.length) {
            args.dc.adjustments ??= [];
            args.dc.adjustments.push(...data.check.adjustments);
        }

        const target =
            args.target ??
            rollContext?.target?.actor ??
            Array.from(game.user.targets)
                .flatMap((t) => t.actor ?? [])
                .find((a) => a.isOfType("creature"));

        const extraModifiers = [...(args.modifiers ?? [])];
        const extraRollOptions = [...(args.extraRollOptions ?? []), ...(rollContext?.options ?? [])];
        const options = this.createRollOptions({ ...args, target, extraRollOptions });

        // Get just-in-time roll options from rule elements
        for (const rule of actor.rules.filter((r) => !r.ignored)) {
            rule.beforeRoll?.(domains, options);
        }

        // Include multiple attack penalty to extra modifiers if given
        if (args.attackNumber && args.attackNumber > 1) {
            if (!item) {
                console.warn("Missing item argument while calculating MAP during check");
            } else {
                const maps = calculateMAPs(item, { domains, options });
                const mapStage = (Math.clamped(args.attackNumber, 2, 3) - 1) as 1 | 2;
                const penalty = maps[`map${mapStage}`];
                extraModifiers.push(new ModifierPF2e(maps.label, penalty, "untyped"));
            }
        }

        // Create parameters for the check roll function
        const context: CheckRollContext = {
            actor,
            item,
            domains,
            target: rollContext?.target ?? null,
            dc: args.dc ?? rollContext?.dc,
            notes: extractNotes(actor.synthetics.rollNotes, this.domains),
            options,
            type: data.check.type,
            secret,
            skipDialog,
            rollTwice: args.rollTwice || extractRollTwice(actor.synthetics.rollTwice, domains, options),
            substitutions: extractRollSubstitutions(actor.synthetics.rollSubstitutions, domains, options),
        };

        const roll = await CheckPF2e.roll(
            new CheckModifier(this.label, this.#stat, extraModifiers),
            context,
            null,
            args.callback
        );

        for (const rule of actor.rules.filter((r) => !r.ignored)) {
            await rule.afterRoll?.({ roll, selectors: domains, domains, rollOptions: options });
        }

        return roll;
    }

    get breakdown() {
        return this.modifiers
            .filter((m) => m.enabled)
            .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
            .join(", ");
    }
}

class StatisticDifficultyClass {
    domains: string[];
    value: number;
    modifiers: ModifierPF2e[];

    constructor(private parent: Statistic<StatisticDataWithDC>, options: RollOptionParameters = {}) {
        const data = parent.data;
        this.domains = (data.domains ?? []).concat(data.dc.domains ?? []);
        const rollOptions = parent.createRollOptions(this.domains, options);

        // toggle modifiers based on the specified options
        this.modifiers = (parent.modifiers ?? [])
            .concat(data.dc.modifiers ?? [])
            .map((modifier) => modifier.clone({ test: rollOptions }));

        this.value = (data.dc.base ?? 10) + new StatisticModifier("", this.modifiers).totalModifier;
    }

    createRollOptions(args: RollOptionParameters = {}): Set<string> {
        return this.parent.createRollOptions(this.domains, args);
    }

    get breakdown() {
        const enabledMods = this.modifiers.filter((m) => m.enabled);
        return [game.i18n.localize("PF2E.DCBase")]
            .concat(enabledMods.map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`))
            .join(", ");
    }
}
