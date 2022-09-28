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
import {
    extractDegreeOfSuccessAdjustments,
    extractModifiers,
    extractNotes,
    extractRollSubstitutions,
    extractRollTwice,
} from "@module/rules/util";
import { eventToRollParams } from "@scripts/sheet-util";
import { CheckRoll } from "@system/check/roll";
import { CheckDC } from "@system/degree-of-success";
import { CheckPF2e, CheckRollCallback, CheckRollContext, CheckType, RollTwiceOption } from "@system/rolls";
import { isObject, Optional } from "@util";
import { StatisticChatData, StatisticTraceData, StatisticData, StatisticCheckData } from "./data";

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

/** Object used to perform checks or get dcs, or both. These are created from StatisticData which drives its behavior. */
export class Statistic {
    /** Source of truth of all statistic data and the params used to create it. Necessary for cloning. */
    #data: StatisticData;

    ability: AbilityString | null = null;

    abilityModifier: ModifierPF2e | null = null;

    rank: ZeroToFour | null = null;

    proficient = true;

    modifiers: ModifierPF2e[];

    slug: string;

    label: string;

    constructor(public actor: ActorPF2e, data: StatisticData, public options?: RollOptionParameters) {
        this.#data = data;
        this.slug = data.slug;
        this.ability = data.ability ?? null;
        this.label = game.i18n.localize(data.label);

        // Add some base modifiers depending on data values
        const baseModifiers: ModifierPF2e[] = [];

        if (actor.isOfType("character") && this.ability) {
            this.abilityModifier = createAbilityModifier({ actor, ability: this.ability, domains: data.domains ?? [] });
            baseModifiers.push(this.abilityModifier);
        }

        if (typeof data.rank === "number") {
            this.rank = data.rank;
            baseModifiers.push(ProficiencyModifier.fromLevelAndRank(actor.level, data.rank));
        } else if (data.rank === "untrained-level") {
            this.rank = 0;
            baseModifiers.push(ProficiencyModifier.fromLevelAndRank(actor.level, 0, { addLevel: true }));
        }

        this.modifiers = [baseModifiers, data.modifiers ?? []].flat();
        if (data.domains) this.modifiers.push(...extractModifiers(this.actor.synthetics, data.domains));

        // Check rank and data to assign proficient, but default to true
        this.proficient = data.proficient === undefined ? this.rank === null || this.rank > 0 : !!data.proficient;

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
            check: { type },
            modifiers: [...stat.modifiers],
        });
    }

    createRollOptions(domains: string[], args: RollOptionParameters = {}): Set<string> {
        const { item, extraRollOptions, target } = args;

        const rollOptions: string[] = [];
        if (domains && domains.length) {
            rollOptions.push(...this.actor.getRollOptions(domains), ...this.actor.getSelfRollOptions());
        }

        if (typeof this.rank === "number") {
            rollOptions.push(PROFICIENCY_RANK_OPTION[this.rank]);
        }

        if (this.#data.rollOptions) {
            rollOptions.push(...this.#data.rollOptions);
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

    withRollOptions(options?: RollOptionParameters): Statistic {
        const newOptions = mergeObject(this.options ?? {}, options ?? {}, { inplace: false });
        return new Statistic(this.actor, deepClone(this.#data), newOptions);
    }

    /**
     * Extend this statistic into a new cloned statistic with additional data.
     * Combines all domains and modifier lists.
     */
    extend(
        data: Omit<DeepPartial<StatisticData>, "check"> & { slug: string } & { check?: Partial<StatisticCheckData> }
    ): Statistic {
        function maybeMergeArrays<T>(arr1: Optional<T[]>, arr2: Optional<T[]>) {
            if (!arr1 && !arr2) return undefined;
            return [...new Set([arr1 ?? [], arr2 ?? []].flat())];
        }

        const result = mergeObject(deepClone(this.#data), data);
        result.domains = maybeMergeArrays(this.#data.domains, data.domains);
        result.modifiers = maybeMergeArrays(this.#data.modifiers, data.modifiers);
        if (result.check && this.#data.check) {
            result.check.domains = maybeMergeArrays(this.#data.check.domains, data.check?.domains);
            result.check.modifiers = maybeMergeArrays(this.#data.check.modifiers, data.check?.modifiers);
        }
        if (result.dc && this.#data.dc) {
            result.dc.domains = maybeMergeArrays(this.#data.dc.domains, data.dc?.domains);
            result.dc.modifiers = maybeMergeArrays(this.#data.dc.modifiers, data.dc?.modifiers);
        }
        return new Statistic(this.actor, result, this.options);
    }

    /** Creates and returns an object that can be used to perform a check if this statistic has check data. */
    get check(): StatisticCheck {
        return new StatisticCheck(this, this.#data, this.options);
    }

    /** Calculates the DC (with optional roll options) and returns it, if this statistic has DC data. */
    get dc(): StatisticDifficultyClass {
        return new StatisticDifficultyClass(this, this.#data, this.options);
    }

    /** Shortcut to `this#check#roll` */
    roll(args: StatisticRollParameters = {}): Promise<Rolled<CheckRoll> | null> {
        return this.check.roll(args);
    }

    /** Creates view data for sheets and chat messages */
    getChatData(options: RollOptionParameters = {}): StatisticChatData {
        const { check, dc } = this.withRollOptions(options);
        const { map1, map2 } = options.item
            ? calculateMAPs(options.item, {
                  domains: check?.domains ?? [],
                  options: check?.createRollOptions(options) ?? [],
              })
            : { map1: -5, map2: -10 };

        return {
            slug: this.slug,
            label: this.label,
            rank: this.rank,
            check: { mod: check.mod, breakdown: check.breakdown, label: check.label, map1, map2 },
            dc: {
                value: dc.value,
                breakdown: dc.breakdown,
            },
        };
    }

    /** Returns data intended to be merged back into actor data */
    getTraceData(this: Statistic, options: { value?: "dc" | "mod" } = {}): StatisticTraceData {
        const { check, dc } = this;
        const valueProp = options.value ?? "mod";

        return {
            slug: this.slug,
            label: this.label,
            value: valueProp === "mod" ? check.mod : dc.value,
            totalModifier: check.mod ?? 0,
            dc: dc.value,
            breakdown: check.breakdown ?? "",
            _modifiers: check.modifiers.map((m) => m.toObject()),
        };
    }
}

class StatisticCheck {
    type: CheckType;
    label: string;
    domains: string[];
    mod: number;
    modifiers: ModifierPF2e[];

    #stat: StatisticModifier;

    constructor(private parent: Statistic, data: StatisticData, options?: RollOptionParameters) {
        this.type = data.check?.type ?? "check";
        this.label = this.#calculateLabel(data);
        this.domains = (data.domains ?? []).concat(data.check?.domains ?? []);
        this.modifiers = parent.modifiers.concat(data.check?.modifiers ?? []);

        const rollOptions = parent.createRollOptions(this.domains, options);
        this.#stat = new StatisticModifier(this.label, this.modifiers, rollOptions);
        this.mod = this.#stat.totalModifier;
    }

    #calculateLabel(data: StatisticData) {
        const parentLabel = this.parent.label;
        if (data.check?.label) return game.i18n.localize(data.check?.label);

        switch (this.type) {
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

        const actor = this.parent.actor;
        const item = args.item ?? null;
        const domains = this.domains;

        // This is required to determine the AC for attack dialogs
        const rollContext = (() => {
            const isCreature = actor.isOfType("creature");
            const isAttackItem = item?.isOfType("weapon", "melee", "spell");
            if (isCreature && isAttackItem && ["attack-roll", "spell-attack-roll"].includes(this.type)) {
                return actor.getAttackRollContext({ item, domains, options: new Set() });
            }

            return null;
        })();

        // Add any degree of success adjustments if we are rolling against a DC
        if (args.dc) {
            args.dc.adjustments ??= [];
            args.dc.adjustments.push(...extractDegreeOfSuccessAdjustments(actor.synthetics, this.domains));
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
            type: this.type,
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

    constructor(private parent: Statistic, data: StatisticData, options: RollOptionParameters = {}) {
        this.domains = (data.domains ?? []).concat(data.dc?.domains ?? []);
        const rollOptions = parent.createRollOptions(this.domains, options);

        // toggle modifiers based on the specified options
        this.modifiers = (parent.modifiers ?? [])
            .concat(data.dc?.modifiers ?? [])
            .map((modifier) => modifier.clone({ test: rollOptions }));

        this.value = (data.dc?.base ?? 10) + new StatisticModifier("", this.modifiers).totalModifier;
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
