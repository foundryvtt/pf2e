import { ActorPF2e } from "@actor";
import { TraitViewData } from "@actor/data/base.ts";
import { calculateMAPs } from "@actor/helpers.ts";
import {
    CheckModifier,
    createAbilityModifier,
    createProficiencyModifier,
    ModifierPF2e,
    PROFICIENCY_RANK_OPTION,
    StatisticModifier,
} from "@actor/modifiers.ts";
import { AttributeString } from "@actor/types.ts";
import { ItemPF2e } from "@item";
import { ZeroToFour, ZeroToTwo } from "@module/data.ts";
import { RollNotePF2e, RollNoteSource } from "@module/notes.ts";
import {
    extractDegreeOfSuccessAdjustments,
    extractModifierAdjustments,
    extractModifiers,
    extractNotes,
    extractRollSubstitutions,
    extractRollTwice,
} from "@module/rules/helpers.ts";
import { TokenDocumentPF2e } from "@scene";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import {
    CheckPF2e,
    CheckRoll,
    CheckRollCallback,
    CheckRollContext,
    CheckType,
    RollTwiceOption,
} from "@system/check/index.ts";
import { CheckDC, DEGREE_ADJUSTMENT_AMOUNTS } from "@system/degree-of-success.ts";
import { ErrorPF2e, isObject, signedInteger, traitSlugToObject } from "@util";
import * as R from "remeda";
import {
    BaseStatisticData,
    BaseStatisticTraceData,
    StatisticChatData,
    StatisticCheckData,
    StatisticData,
    StatisticDifficultyClassData,
    StatisticTraceData,
} from "./data.ts";

/** Basic data forming any Pathfinder statistic */
abstract class BaseStatistic {
    /** The actor to which this statistic belongs */
    actor: ActorPF2e;
    /** A stable but human-readable identifier */
    slug: string;
    /** A display label */
    label: string;
    /** Original construction arguments */
    protected data: StatisticData;
    /** String category identifiers: used to retrieve modifiers and other synthetics as well as create roll options  */
    domains: string[];
    /** Penalties, bonuses, and actual modifiers comprising a total modifier value */
    modifiers: ModifierPF2e[];

    constructor(actor: ActorPF2e, data: BaseStatisticData) {
        this.actor = actor;
        this.slug = data.slug;
        this.label = game.i18n.localize(data.label);
        this.data = { ...data };
        this.domains = [...(data.domains ??= [])];
        const modifiers = [data.modifiers ?? [], extractModifiers(this.actor.synthetics, this.domains)].flat();
        this.modifiers = new StatisticModifier("", modifiers).modifiers.map((m) => m.clone());

        if (this.domains.length > 0) {
            // Test the gathered modifiers if there are any domains
            const options = this.createRollOptions();
            for (const modifier of this.modifiers) {
                modifier.test(options);
            }
        }
    }

    createRollOptions(domains = this.domains): Set<string> {
        return new Set(this.actor.getRollOptions(domains));
    }

    abstract getTraceData(): BaseStatisticTraceData;
}

/** A Pathfinder statistic used to perform checks and calculate DCs */
class Statistic extends BaseStatistic {
    ability: AttributeString | null = null;

    rank: ZeroToFour | null = null;

    proficient = true;

    /** The `Statistic` from which this one was derived (set by `Statistic#extend`), or otherwise `null`. */
    base: Statistic | null = null;

    /** If this is a skill, returns whether it is a lore skill or not */
    lore?: boolean;

    config: RollOptionConfig;

    #check?: StatisticCheck<this>;
    #dc?: StatisticDifficultyClass<this>;

    constructor(actor: ActorPF2e, data: StatisticData, config: RollOptionConfig = {}) {
        data.modifiers ??= [];
        const domains = (data.domains ??= []);

        // Add some base modifiers depending on data values
        // If this is a character with an ability, add/set the ability modifier
        const attributeModifier =
            actor.isOfType("character") && data.ability
                ? data.modifiers.find((m) => m.type === "ability" && m.ability === data.ability) ??
                  createAbilityModifier({ actor, ability: data.ability, domains })
                : null;

        // If this is a character with a proficiency, add a proficiency modifier
        const proficiencyModifier = !actor.isOfType("character")
            ? null
            : typeof data.rank === "number"
            ? createProficiencyModifier({ actor, rank: data.rank, domains })
            : data.rank === "untrained-level"
            ? createProficiencyModifier({ actor, rank: 0, domains, addLevel: true })
            : null;

        // Add the auto-generated modifiers, overriding any already existing copies
        const baseModifiers = R.compact([attributeModifier, proficiencyModifier]);
        const activeSlugs = new Set(baseModifiers.map((m) => m.slug));
        data.modifiers = data.modifiers.filter((m) => !activeSlugs.has(m.slug));
        data.modifiers.unshift(...baseModifiers);

        super(actor, data);

        this.ability = data.ability ?? null;
        if (typeof data.lore === "boolean") this.lore = data.lore;
        this.rank = data.rank === "untrained-level" ? 0 : data.rank ?? null;
        this.config = config;

        // Check rank and data to assign proficient, but default to true
        this.proficient = data.proficient === undefined ? this.rank === null || this.rank > 0 : !!data.proficient;

        // Run the modifiers filter function if one is supplied
        if (data.filter) {
            this.modifiers = this.modifiers.filter(data.filter);
        }

        // Add DC data with an additional domain if not already set
        this.data.dc ??= { domains: [`${this.slug}-dc`] };
    }

    /** Get the ability modifier used with this statistic. Since NPC statistics are contrived, create a new one. */
    get attributeModifier(): ModifierPF2e | null {
        if (this.actor.isOfType("npc")) {
            return this.ability
                ? createAbilityModifier({ actor: this.actor, ability: this.ability, domains: this.domains })
                : null;
        }
        return this.modifiers.find((m) => m.type === "ability" && m.enabled && m.ability === this.ability) ?? null;
    }

    get check(): StatisticCheck<this> {
        return (this.#check ??= new StatisticCheck(this, this.data, this.config));
    }

    get dc(): StatisticDifficultyClass<this> {
        return (this.#dc ??= new StatisticDifficultyClass(this, this.data, this.config));
    }

    /** Convenience getter to the statistic's total modifier */
    get mod(): number {
        return this.check.mod;
    }

    override createRollOptions(domains = this.domains, args: RollOptionConfig = {}): Set<string> {
        const { item, extraRollOptions, origin, target } = args;

        const rollOptions: string[] = [];
        if (domains.length > 0) {
            rollOptions.push(...super.createRollOptions(domains));
        }

        if (typeof this.rank === "number") {
            rollOptions.push(PROFICIENCY_RANK_OPTION[this.rank]);
        }

        if (this.data.rollOptions) {
            rollOptions.push(...this.data.rollOptions);
        }

        if (item) {
            rollOptions.push(...item.getRollOptions("item"));
            if (item.actor && item.actor.uuid !== this.actor.uuid) {
                rollOptions.push(...item.actor.getSelfRollOptions("origin"));
            }

            // Special cases, traits that modify the action itself universally
            // This might change once we've better decided how derivative traits will work
            const traits: string[] = item.system.traits?.value ?? [];
            if (traits.includes("attack")) {
                rollOptions.push("trait:attack");
            }
        }

        if (origin) {
            rollOptions.push(...origin.getSelfRollOptions("origin"));
        } else if (target) {
            rollOptions.push(...target.getSelfRollOptions("target"));
        }

        if (extraRollOptions) {
            rollOptions.push(...extraRollOptions);
        }

        return new Set(rollOptions.sort());
    }

    withRollOptions(options?: RollOptionConfig): Statistic {
        const newOptions = mergeObject(this.config ?? {}, options ?? {}, { inplace: false });
        return new Statistic(this.actor, deepClone(this.data), newOptions);
    }

    /**
     * Extend this statistic into a new cloned statistic with additional data.
     * Combines all domains and modifier lists.
     */
    extend(
        data: Omit<DeepPartial<StatisticData>, "check" | "dc" | "modifiers"> & {
            dc?: Partial<StatisticDifficultyClassData>;
            check?: Partial<StatisticCheckData>;
            modifiers?: ModifierPF2e[];
        }
    ): Statistic {
        function maybeMergeArrays<T>(arr1: Maybe<T[]>, arr2: Maybe<T[]>) {
            if (!arr1 && !arr2) return undefined;
            return [...new Set([arr1 ?? [], arr2 ?? []].flat())];
        }

        const result = mergeObject(deepClone(this.data), data);
        result.domains = maybeMergeArrays(this.domains, data.domains);
        result.modifiers = maybeMergeArrays(this.data.modifiers, data.modifiers);
        result.rollOptions = maybeMergeArrays(this.data.rollOptions, data.rollOptions);
        if (result.check && this.data.check) {
            result.check.domains = maybeMergeArrays(this.data.check.domains, data.check?.domains);
            result.check.modifiers = maybeMergeArrays(this.data.check.modifiers, data.check?.modifiers);
        }
        if (result.dc && this.data.dc) {
            result.dc.domains = maybeMergeArrays(this.data.dc.domains, data.dc?.domains);
            result.dc.modifiers = maybeMergeArrays(this.data.dc.modifiers, data.dc?.modifiers);
        }

        const extended = new Statistic(this.actor, result, this.config);
        extended.base = this;
        return extended;
    }

    /** Shortcut to `this#check#roll` */
    roll(args: StatisticRollParameters = {}): Promise<Rolled<CheckRoll> | null> {
        return this.check.roll(args);
    }

    /** Creates view data for sheets and chat messages */
    getChatData(options: RollOptionConfig = {}): StatisticChatData {
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

    /** Returns data intended to be merged back into actor data. By default the value is the DC */
    getTraceData(options: { value?: "dc" | "mod" } = {}): StatisticTraceData {
        const { check, dc } = this;
        const valueProp = options.value ?? "mod";
        const [label, value, totalModifier, breakdown, modifiers] =
            valueProp === "mod"
                ? [this.label, check.mod, check.mod, check.breakdown, check.modifiers]
                : [dc.label || this.label, dc.value, dc.value - 10, dc.breakdown, dc.modifiers];

        return {
            slug: this.slug,
            label,
            value,
            totalModifier,
            dc: dc.value,
            breakdown,
            modifiers: modifiers.map((m) => m.toObject()),
        };
    }
}

class StatisticCheck<TParent extends Statistic = Statistic> {
    parent: TParent;
    type: CheckType;
    label: string;
    domains: string[];
    mod: number;
    modifiers: ModifierPF2e[];

    constructor(parent: TParent, data: StatisticData, config: RollOptionConfig = {}) {
        this.parent = parent;
        this.type = data.check?.type ?? "check";
        this.label = this.#determineLabel(data);
        this.domains = (data.domains ?? []).concat(data.check?.domains ?? []);

        // If this is a flat check, ensure there are no input domains and replace them
        if (this.type === "flat-check") {
            if (this.domains.length > 0) {
                throw ErrorPF2e("Flat checks cannot have associated domains");
            }
            this.domains = [`${this.parent.slug}-check`];
        }

        // Acquire additional adjustments for cloned parent modifiers
        const { modifierAdjustments } = parent.actor.synthetics;
        const parentModifiers = parent.modifiers.map((modifier) => {
            const clone = modifier.clone();
            clone.adjustments.push(
                ...extractModifierAdjustments(modifierAdjustments, data.check?.domains ?? [], clone.slug)
            );
            return clone;
        });

        const allCheckModifiers = [
            data.check?.modifiers ?? [],
            extractModifiers(parent.actor.synthetics, data.check?.domains ?? []),
        ].flat();
        const rollOptions = parent.createRollOptions(this.domains, config);
        this.modifiers = [
            ...parentModifiers,
            ...allCheckModifiers.map((modifier) => modifier.clone({ test: rollOptions })),
        ];
        this.mod = new StatisticModifier(this.label, this.modifiers, rollOptions).totalModifier;
    }

    get actor(): ActorPF2e {
        return this.parent.actor;
    }

    #determineLabel(data: StatisticData): string {
        const parentLabel = this.parent.label;
        if (data.check?.label) return game.i18n.localize(data.check?.label);

        switch (this.type) {
            case "skill-check":
                return game.i18n.format("PF2E.SkillCheckWithName", { skillName: parentLabel });
            case "saving-throw":
                return game.i18n.format("PF2E.SavingThrowWithName", { saveName: parentLabel });
            case "spell-attack-roll":
                return game.i18n.format("PF2E.SpellAttackWithTradition", { tradition: parentLabel });
            case "perception-check":
                return game.i18n.format("PF2E.PerceptionCheck");
            default:
                return parentLabel;
        }
    }

    createRollOptions(args: RollOptionConfig = {}): Set<string> {
        return this.parent.createRollOptions(this.domains, args);
    }

    async roll(args: StatisticRollParameters = {}): Promise<Rolled<CheckRoll> | null> {
        // Allow use of events for modules and macros but don't allow it for internal system use
        const { rollMode, skipDialog } = (() => {
            if (isObject<{ event: { originalEvent?: unknown } }>(args)) {
                const event = args.event?.originalEvent ?? args.event;
                if (event instanceof MouseEvent) {
                    const { rollMode, skipDialog } = args;
                    return mergeObject({ rollMode, skipDialog }, eventToRollParams(event));
                }
            }

            return args;
        })();

        const { actor, domains } = this;
        const token = args.token ?? actor.getActiveTokens(false, true).shift();
        const item = args.item ?? null;

        const { origin } = args;
        const targetToken = origin
            ? null
            : (args.target?.getActiveTokens() ?? Array.from(game.user.targets)).find((t) =>
                  t.actor?.isOfType("creature")
              ) ?? null;

        // This is required to determine the AC for attack dialogs
        const rollContext = await (() => {
            const isValidAttacker = actor.isOfType("creature", "hazard");
            const isTargetedCheck =
                (this.type === "spell-attack-roll" && item?.isOfType("spell")) ||
                (["check", "perception-check", "skill-check"].includes(this.type) &&
                    !!(args.dc && (args.dc?.slug || "statistic" in args.dc)) &&
                    (!item || item.isOfType("action", "weapon")));

            return isValidAttacker && isTargetedCheck
                ? actor.getCheckContext({
                      item: item?.isOfType("melee", "spell", "weapon") ? item : null,
                      domains,
                      statistic: this,
                      target: targetToken,
                      targetedDC: args.dc?.slug ?? "armor",
                      options: new Set(args.extraRollOptions ?? []),
                  })
                : null;
        })();

        const targetActor = origin ? null : rollContext?.target?.actor ?? args.target ?? null;
        const dc = args.dc && "value" in args.dc ? args.dc : rollContext?.dc ?? null;

        // Extract modifiers, unless this is a flat check
        const extraModifiers = this.type === "flat-check" ? [] : [...(args.modifiers ?? [])];

        // Get roll options and roll notes
        const extraRollOptions = [
            ...(args.extraRollOptions ?? []),
            ...(rollContext?.options ?? []),
            `check:statistic:${this.parent.slug}`,
            `check:type:${this.type.replace(/-check$/, "")}`,
        ];
        if (this.parent.base) {
            extraRollOptions.push(`check:statistic:base:${this.parent.base.slug}`);
        }
        const options = this.createRollOptions({ ...args, origin, target: targetActor, extraRollOptions });
        const notes = [...extractNotes(actor.synthetics.rollNotes, domains), ...(args.extraRollNotes ?? [])];

        // Get just-in-time roll options from rule elements
        for (const rule of actor.rules.filter((r) => !r.ignored)) {
            rule.beforeRoll?.(domains, options);
        }

        // Add any degree of success adjustments if rolling against a DC
        const dosAdjustments = dc ? [extractDegreeOfSuccessAdjustments(actor.synthetics, domains)].flat() : [];

        // Handle special case of incapacitation trait
        if ((options.has("incapacitation") || options.has("item:trait:incapacitation")) && dc) {
            const effectLevel = item?.isOfType("spell")
                ? 2 * item.rank
                : item?.isOfType("physical")
                ? item.level
                : origin?.level ?? actor.level;

            const amount =
                this.type === "saving-throw" && actor.level > effectLevel
                    ? DEGREE_ADJUSTMENT_AMOUNTS.INCREASE
                    : !!targetActor &&
                      targetActor.level > effectLevel &&
                      ["attack-roll", "spell-attack-roll", "skill-check"].includes(this.type)
                    ? DEGREE_ADJUSTMENT_AMOUNTS.LOWER
                    : null;

            if (amount) {
                dosAdjustments.push({
                    adjustments: {
                        all: {
                            label: "PF2E.TraitIncapacitation",
                            amount,
                        },
                    },
                });
            }
        }
        const mapIncreases = Math.clamped((args.attackNumber ?? 1) - 1, 0, 2) as ZeroToTwo;

        // Include multiple attack penalty to extra modifiers if given
        if (mapIncreases !== 0) {
            if (!item) {
                console.warn("Missing item argument while calculating MAP during check");
            } else {
                const maps = calculateMAPs(item, { domains, options });
                const penalty = maps[`map${mapIncreases}`];
                extraModifiers.push(new ModifierPF2e(maps.label, penalty, "untyped"));
            }
        }

        // Process any given action traits, then add to roll options
        const traits = args.traits?.map((t) =>
            typeof t === "string" ? traitSlugToObject(t, CONFIG.PF2E.actionTraits) : t
        );
        for (const trait of traits ?? []) {
            options.add(trait.name);
        }

        // Create parameters for the check roll function
        const context: CheckRollContext = {
            actor,
            token,
            item,
            domains,
            target: rollContext?.target ?? null,
            dc,
            notes,
            options,
            type: this.type,
            rollMode,
            skipDialog,
            rollTwice: args.rollTwice || extractRollTwice(actor.synthetics.rollTwice, domains, options),
            substitutions: extractRollSubstitutions(actor.synthetics.rollSubstitutions, domains, options),
            dosAdjustments,
            traits,
            title: args.title,
            createMessage: args.createMessage ?? true,
        };

        if (typeof args.attackNumber === "number") {
            context.mapIncreases = mapIncreases;
            context.options?.add(`map:increases:${mapIncreases}`);
        }

        const roll = await CheckPF2e.roll(
            new CheckModifier(args.label || this.label, { modifiers: this.modifiers }, extraModifiers),
            context,
            null,
            args.callback
        );

        for (const rule of actor.rules.filter((r) => !r.ignored)) {
            await rule.afterRoll?.({ roll, statistic: this.parent, selectors: domains, domains, rollOptions: options });
        }

        return roll;
    }

    get breakdown(): string {
        return this.modifiers
            .filter((m) => m.enabled)
            .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
            .join(", ");
    }
}

class StatisticDifficultyClass<TParent extends Statistic = Statistic> {
    parent: TParent;
    domains: string[];
    label?: string;
    modifiers: ModifierPF2e[];
    options: Set<string>;

    constructor(parent: TParent, data: StatisticData, options: RollOptionConfig = {}) {
        this.parent = parent;
        this.domains = (data.domains ?? []).concat(data.dc?.domains ?? []);
        this.label = data.dc?.label;
        this.options = parent.createRollOptions(this.domains, options);

        // Acquire additional adjustments for cloned parent modifiers
        const { modifierAdjustments } = parent.actor.synthetics;
        const parentModifiers = parent.modifiers.map((modifier) => {
            const clone = modifier.clone();
            clone.adjustments.push(
                ...extractModifierAdjustments(modifierAdjustments, data.dc?.domains ?? [], clone.slug)
            );
            return clone;
        });

        // Add all modifiers from all sources together, then test them
        const allDCModifiers = [
            data.dc?.modifiers ?? [],
            extractModifiers(parent.actor.synthetics, data.dc?.domains ?? []),
        ].flat();
        this.modifiers = [
            ...new StatisticModifier("", [...parentModifiers, ...allDCModifiers.map((m) => m.clone())], this.options)
                .modifiers,
        ];
    }

    get value(): number {
        return (
            10 +
            new StatisticModifier(
                "",
                this.modifiers.map((m) => m.clone()),
                this.options
            ).totalModifier
        );
    }

    get breakdown(): string {
        const enabledMods = this.modifiers.filter((m) => m.enabled);
        return [game.i18n.localize("PF2E.DCBase")]
            .concat(enabledMods.map((m) => `${m.label} ${signedInteger(m.modifier)}`))
            .join(", ");
    }

    toString(): string {
        return String(this.value);
    }
}

interface CheckDCReference {
    slug: string;
}

interface StatisticRollParameters {
    /** What token to use for the roll itself. Defaults to the actor's token */
    token?: TokenDocumentPF2e;
    /** Which attack this is (for the purposes of multiple attack penalty) */
    attackNumber?: number;
    /** Optional target for the roll */
    target?: ActorPF2e | null;
    /** Optional origin for the roll: only one of target and origin may be provided */
    origin?: ActorPF2e | null;
    /** Optional DC data for the roll */
    dc?: CheckDC | CheckDCReference | null;
    /** Optional override for the check modifier label */
    label?: string;
    /** Optional override for the dialog's title. Defaults to label */
    title?: string;
    /** Any additional roll notes that should be used in the roll. */
    extraRollNotes?: (RollNotePF2e | RollNoteSource)[];
    /** Any additional options that should be used in the roll. */
    extraRollOptions?: string[];
    /** Additional modifiers */
    modifiers?: ModifierPF2e[];
    /** The originating item of this attack, if any */
    item?: ItemPF2e<ActorPF2e> | null;
    /** The roll mode (i.e., 'roll', 'blindroll', etc) to use when rendering this roll. */
    rollMode?: RollMode | "roll";
    /** Should the dialog be skipped */
    skipDialog?: boolean;
    /** Should this roll be rolled twice? If so, should it keep highest or lowest? */
    rollTwice?: RollTwiceOption;
    /** Any traits for the check */
    traits?: (TraitViewData | string)[];
    /** Whether to create a chat message using the roll (defaults true) */
    createMessage?: boolean;
    /** Callback called when the roll occurs. */
    callback?: CheckRollCallback;
}

interface RollOptionConfig {
    extraRollOptions?: string[];
    item?: ItemPF2e | null;
    origin?: ActorPF2e | null;
    target?: ActorPF2e | null;
}

export * from "./data.ts";
export {
    BaseStatistic,
    CheckDCReference,
    RollOptionConfig,
    Statistic,
    StatisticCheck,
    StatisticDifficultyClass,
    StatisticRollParameters,
};
