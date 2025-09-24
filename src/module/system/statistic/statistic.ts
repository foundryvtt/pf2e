import type { ActorPF2e, CreaturePF2e } from "@actor";
import { TraitViewData } from "@actor/data/base.ts";
import { calculateMAPs } from "@actor/helpers.ts";
import {
    CheckModifier,
    Modifier,
    PROFICIENCY_RANK_OPTION,
    StatisticModifier,
    createAttributeModifier,
    createProficiencyModifier,
} from "@actor/modifiers.ts";
import { CheckContext } from "@actor/roll-context/check.ts";
import { AttributeString } from "@actor/types.ts";
import type { Rolled } from "@client/dice/_module.d.mts";
import type { RollMode } from "@common/constants.d.mts";
import type { ItemPF2e } from "@item";
import { AbilityTrait } from "@item/ability/types.ts";
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
import { eventToRollParams } from "@module/sheet/helpers.ts";
import type { TokenDocumentPF2e } from "@scene";
import { Check, CheckRollCallback } from "@system/check/check.ts";
import type { CheckRoll } from "@system/check/index.ts";
import { CheckCheckContext, CheckType, RollTwiceOption } from "@system/check/types.ts";
import { CheckDC, DEGREE_ADJUSTMENT_AMOUNTS } from "@system/degree-of-success.ts";
import { ErrorPF2e, isObject, signedInteger, sluggify } from "@util";
import * as R from "remeda";
import { BaseStatistic } from "./base.ts";
import {
    StatisticChatData,
    StatisticCheckData,
    StatisticData,
    StatisticDifficultyClassData,
    StatisticTraceData,
} from "./data.ts";

/** A Pathfinder statistic used to perform checks and calculate DCs */
class Statistic<TActor extends ActorPF2e = ActorPF2e> extends BaseStatistic<TActor> {
    attribute: AttributeString | null = null;

    rank: ZeroToFour | null = null;

    proficient = true;

    /** The `Statistic` from which this one was derived (set by `Statistic#extend`), or otherwise `null`. */
    base: Statistic | null = null;

    /** If this is a skill, returns whether it is a lore skill or not */
    lore?: boolean;

    config: RollOptionConfig;

    #check?: StatisticCheck<this>;
    #dc?: StatisticDifficultyClass<this>;

    constructor(actor: TActor, data: StatisticData, config: RollOptionConfig = {}) {
        data.modifiers ??= [];
        const domains = (data.domains ??= []);

        // Add some base modifiers depending on data values
        // If this is a character with an attribute, add/set the attribute modifier
        const attributeModifier =
            actor.isOfType("character") && data.attribute
                ? (data.modifiers.find((m) => m.type === "ability" && m.ability === data.attribute) ??
                  createAttributeModifier({ actor, attribute: data.attribute, domains }))
                : null;
        if (data.attribute) domains.push(`${data.attribute}-based`);

        // If this is a character with a proficiency, add a proficiency modifier
        const proficiencyModifier =
            actor.isOfType("character") && typeof data.rank === "number"
                ? (data.modifiers.find((m) => m.type === "proficiency") ??
                  createProficiencyModifier({ actor, rank: data.rank, domains }))
                : null;

        // Add the auto-generated modifiers, overriding any already existing copies
        const baseModifiers = [attributeModifier, proficiencyModifier].filter(R.isTruthy);
        const activeSlugs = new Set(baseModifiers.map((m) => m.slug));
        data.modifiers = data.modifiers.filter((m) => !activeSlugs.has(m.slug));
        data.modifiers.unshift(...baseModifiers);

        super(actor, data);

        this.attribute = data.attribute ?? null;
        if (typeof data.lore === "boolean") this.lore = data.lore;
        this.rank = data.rank ?? null;
        this.config = config;

        // Check rank and data to assign proficient, but default to true
        this.proficient = data.proficient === undefined ? this.rank === null || this.rank > 0 : !!data.proficient;

        // Run the modifiers filter function if one is supplied
        if (data.filter) this.modifiers = this.modifiers.filter(data.filter);

        // Add DC data with an additional domain if not already set
        this.data.dc ??= { domains: [`${this.slug}-dc`] };
    }

    /** Get the attribute modifier used with this statistic. Since NPC statistics are contrived, create a new one. */
    get attributeModifier(): Modifier | null {
        if (this.actor.isOfType("npc")) {
            return this.attribute
                ? createAttributeModifier({ actor: this.actor, attribute: this.attribute, domains: this.domains })
                : null;
        }
        return this.modifiers.find((m) => m.type === "ability" && m.enabled && m.ability === this.attribute) ?? null;
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
        const { item, extraRollOptions, target } = args;
        const origin = args.origin ?? (item?.actor && item.actor.uuid !== this.actor.uuid ? item.actor : null);

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

        return new Set(rollOptions);
    }

    withRollOptions(options?: RollOptionConfig): Statistic {
        const newOptions = fu.mergeObject(this.config ?? {}, options ?? {}, { inplace: false });
        return new Statistic(this.actor, fu.deepClone(this.data), newOptions);
    }

    /**
     * Extend this statistic into a new cloned statistic with additional data.
     * Combines all domains and modifier lists.
     */
    clone(
        data: Omit<DeepPartial<StatisticData>, "check" | "dc" | "modifiers"> & {
            dc?: Partial<StatisticDifficultyClassData>;
            check?: Partial<StatisticCheckData>;
            modifiers?: Modifier[];
        },
    ): this;
    clone(
        data: Omit<DeepPartial<StatisticData>, "check" | "dc" | "modifiers"> & {
            dc?: Partial<StatisticDifficultyClassData>;
            check?: Partial<StatisticCheckData>;
            modifiers?: Modifier[];
        },
    ): Statistic<TActor> {
        function maybeMergeArrays<T>(arr1: Maybe<T[]>, arr2: Maybe<T[]>) {
            if (!arr1 && !arr2) return undefined;
            return [...new Set([arr1 ?? [], arr2 ?? []].flat())];
        }

        const result = fu.mergeObject(fu.deepClone(this.data), data);
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

    /**
     * Extend this statistic into a new cloned statistic with additional data.
     * Combines all domains and modifier lists, and sets the new statistic to be the base of the other
     */
    extend(
        data: Omit<DeepPartial<StatisticData>, "check" | "dc" | "modifiers"> & {
            dc?: Partial<StatisticDifficultyClassData>;
            check?: Partial<StatisticCheckData>;
            modifiers?: Modifier[];
        },
    ): this;
    extend(
        data: Omit<DeepPartial<StatisticData>, "check" | "dc" | "modifiers"> & {
            dc?: Partial<StatisticDifficultyClassData>;
            check?: Partial<StatisticCheckData>;
            modifiers?: Modifier[];
        },
    ): Statistic<TActor> {
        const extended = this.clone(data);
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
    getTraceData(
        this: Statistic<CreaturePF2e>,
        options?: { value?: "dc" | "mod" },
    ): StatisticTraceData<AttributeString>;
    getTraceData(options?: { value?: "dc" | "mod" }): StatisticTraceData;
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
            attribute: this.attribute,
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
    modifiers: Modifier[];

    constructor(parent: TParent, data: StatisticData, config: RollOptionConfig = {}) {
        this.parent = parent;
        this.type = data.check?.type ?? "check";
        data.check = fu.mergeObject(data.check ?? {}, { type: this.type });

        const checkDomains = new Set(["check", data.check.domains].flat().filter(R.isTruthy));
        if (this.type === "attack-roll") {
            checkDomains.add("attack");
            checkDomains.add("attack-roll");
            checkDomains.add(`${this.parent.slug}-attack-roll`);
        } else {
            checkDomains.add(`${this.parent.slug}-check`);
            if (this.type === "flat-check") {
                // If this is a flat check, replace the "check" domain with "flat-check"
                checkDomains.delete("check");
                checkDomains.add("flat-check");
            }
        }

        data.check.domains = Array.from(checkDomains);
        this.domains = R.unique([data.domains, data.check.domains].flat()).filter(R.isTruthy);

        this.label = this.#determineLabel(data);

        // Acquire additional adjustments for cloned parent modifiers
        const modifierAdjustments = parent.actor.synthetics.modifierAdjustments;
        const parentModifiers = parent.modifiers.map((modifier) => {
            const clone = modifier.clone();
            clone.adjustments.push(
                ...extractModifierAdjustments(modifierAdjustments, data.check?.domains ?? [], clone.slug),
            );
            return clone;
        });

        // Acquire additional adjustments for check-only modifiers using the parent's domains
        const checkOnlyModifiers = [
            data.check?.modifiers ?? [],
            extractModifiers(parent.actor.synthetics, data.check?.domains ?? []),
        ]
            .flat()
            .map((modifier) => {
                modifier.adjustments.push(
                    ...extractModifierAdjustments(
                        parent.actor.synthetics.modifierAdjustments,
                        parent.domains,
                        this.parent.slug,
                    ),
                );
                return modifier;
            });
        const rollOptions = parent.createRollOptions(this.domains, config);
        this.modifiers = [
            ...parentModifiers,
            ...checkOnlyModifiers.map((m) => m.clone({ domains: this.domains }, { test: rollOptions })),
        ];
        if (this.type === "flat-check" && this.modifiers.length > 0) {
            console.error(ErrorPF2e("Flat checks cannot have modifiers.").message);
            this.modifiers = [];
        }

        this.mod = new StatisticModifier(this.label, this.modifiers, rollOptions).totalModifier;
    }

    get actor(): ActorPF2e {
        return this.parent.actor;
    }

    #determineLabel(data: StatisticData): string {
        const parentLabel = this.parent.label;
        if (data.check?.label) return game.i18n.localize(data.check?.label);

        // Check for specific check localization, and use if it exists
        const checkKey = `PF2E.ActionsCheck.${this.parent.slug}`;
        const checkLabel = game.i18n.localize(checkKey);
        if (!["x", "x-attack-roll"].includes(this.parent.slug) && checkLabel !== checkKey) {
            return checkLabel;
        }

        if (this.domains.includes("spell-attack-roll")) {
            return game.i18n.format("PF2E.SpellAttackWithTradition", { tradition: parentLabel });
        }

        switch (this.type) {
            case "skill-check":
                return game.i18n.format("PF2E.SkillCheckWithName", { skillName: parentLabel });
            case "saving-throw":
                return game.i18n.format("PF2E.SavingThrowWithName", { saveName: parentLabel });
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
        // Work with a `CheckDC` object
        args.dc = typeof args.dc === "number" ? { value: Math.trunc(args.dc) || 0 } : (args.dc ?? null);

        // Allow use of events for modules and macros but don't allow it for internal system use
        const { rollMode, skipDialog } = (() => {
            if (isObject<{ event: { originalEvent?: unknown } }>(args)) {
                const event = args.event?.originalEvent ?? args.event;
                if (event instanceof PointerEvent) {
                    const { rollMode, skipDialog } = args;
                    return fu.mergeObject({ rollMode, skipDialog }, eventToRollParams(event, { type: "check" }));
                }
            }

            return args;
        })();

        const self = this.actor;
        const domains = this.domains;
        const selfToken = args.token ?? self.getActiveTokens(true, true).shift() ?? null;
        const selfIsTarget = self === args.target || (!args.target && this.type === "saving-throw");
        const item = args.item ?? null;
        const targetToken = selfIsTarget
            ? selfToken
            : (args.target?.getActiveTokens(true, true)?.find((t) => t.actor?.isOfType("army", "creature", "hazard")) ??
              game.user.targets.find((t) => !!t.actor?.isOfType("army", "creature", "hazard"))?.document ??
              null);

        const selfIsTargeting =
            !selfIsTarget &&
            !!targetToken &&
            ((this.domains.includes("spell-attack-roll") && item?.isOfType("spell")) ||
                (!["flat-check", "saving-throw"].includes(this.type) &&
                    !!(args.dc?.slug || "statistic" in (args.dc ?? {})) &&
                    (!item || item.isOfType("action", "campaignFeature", "feat", "weapon"))));

        // Only armies can target armies
        const isValidRoller = targetToken?.actor?.isOfType("army")
            ? self.isOfType("army")
            : self.isOfType("army", "creature", "hazard", "party", "vehicle");
        if (!isValidRoller) return null;

        // This is required to determine the AC for attack dialogs
        const rollContext = await (() => {
            const contextItem = item?.isOfType("action", "melee", "spell", "weapon") ? item : null;
            const optionSet = new Set(args.extraRollOptions ?? []);

            const originalOrigin = selfIsTarget ? args.origin : self;
            const originToken = selfIsTarget ? originalOrigin?.getActiveTokens(true, true).shift() : selfToken;

            if (selfIsTargeting) {
                return new CheckContext({
                    origin: {
                        actor: self,
                        token: originToken,
                        statistic: this.parent,
                        item: contextItem,
                    },
                    target: {
                        actor: targetToken?.actor ?? null,
                        token: targetToken,
                    },
                    domains,
                    against: args.dc?.slug ?? "ac",
                    options: optionSet,
                }).resolve();
            } else if (selfIsTarget) {
                return new CheckContext({
                    target: {
                        actor: this.actor,
                        token: targetToken,
                        statistic: this.parent,
                    },
                    origin: {
                        actor: originToken?.actor ?? originalOrigin ?? null,
                        token: originToken,
                        item: contextItem,
                    },
                    domains,
                    against: args.dc?.slug ?? null,
                    options: optionSet,
                }).resolve();
            } else {
                return new CheckContext({
                    origin: {
                        actor: self,
                        token: selfToken,
                        statistic: this.parent,
                        item: contextItem,
                    },
                    domains,
                    options: optionSet,
                }).resolve();
            }
        })();

        const originActor = rollContext.origin?.actor ?? self;
        const targetActor = rollContext.target?.actor ?? null;
        const selfActor = (selfIsTarget ? targetActor : originActor) ?? self;
        const dc = typeof args.dc?.value === "number" ? args.dc : (rollContext?.dc ?? null);

        // Extract modifiers, unless this is a flat check
        const extraModifiers =
            this.type === "flat-check"
                ? []
                : [args.modifiers, rollContext?.origin?.modifiers].flat().filter(R.isTruthy);

        // Get roll options and roll notes
        const extraRollOptions = [
            ...(args.extraRollOptions ?? []),
            ...(rollContext?.options ?? []),
            `check:statistic:${this.parent.slug}`,
            `check:type:${this.type.replace(/-check$/, "")}`,
            args.slug ? `check:slug:${args.slug}` : null,
        ].filter(R.isTruthy);
        if (this.parent.base) {
            extraRollOptions.push(`check:statistic:base:${this.parent.base.slug}`);
        }
        const options = this.createRollOptions({ ...args, origin: originActor, target: targetActor, extraRollOptions });
        const notes = [...extractNotes(selfActor.synthetics.rollNotes, domains), ...(args.extraRollNotes ?? [])];

        // Get just-in-time roll options from rule elements
        for (const rule of selfActor.rules.filter((r) => !r.ignored)) {
            rule.beforeRoll?.(domains, options);
        }

        // Add any degree of success adjustments if rolling against a DC
        const dosAdjustments = dc ? extractDegreeOfSuccessAdjustments(selfActor.synthetics, domains) : [];

        // Handle special case of incapacitation trait
        if ((options.has("incapacitation") || options.has("item:trait:incapacitation")) && dc) {
            const effectLevel = item?.isOfType("spell")
                ? 2 * item.rank
                : item?.isOfType("physical")
                  ? item.level
                  : (originActor?.level ?? selfActor.level);

            const amount =
                this.type === "saving-throw" && selfActor.level > effectLevel
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
        const mapIncreases = Math.clamp((args.attackNumber ?? 1) - 1, 0, 2) as ZeroToTwo;

        // Include multiple attack penalty to extra modifiers if given
        if (mapIncreases !== 0) {
            if (!item) {
                console.warn("Missing item argument while calculating MAP during check");
            } else {
                const maps = calculateMAPs(item, { domains, options });
                const penalty = maps[`map${mapIncreases}`];
                extraModifiers.push(new Modifier(maps.label, penalty, "untyped"));
            }
        }

        // Process any given action traits, then add to roll options
        const traits =
            args.traits
                ?.map((t) => (typeof t === "string" ? t : t.name))
                .filter((t): t is AbilityTrait => t in CONFIG.PF2E.actionTraits) ?? [];
        for (const trait of traits) {
            options.add(trait);
        }
        if (args.action) {
            options.add(`self:action:slug:${sluggify(args.action)}`);
            for (const trait of traits) {
                options.add(`self:action:trait:${trait}`);
            }
        }

        // Create parameters for the check roll function
        const context: CheckCheckContext = {
            actor: selfActor,
            token: selfToken,
            origin: rollContext.origin,
            target: rollContext.target,
            item,
            type: this.type,
            identifier: args.identifier,
            domains,
            dc,
            notes,
            options,
            action: args.action,
            damaging: args.damaging,
            rollMode,
            skipDialog,
            rollTwice: args.rollTwice || extractRollTwice(selfActor.synthetics.rollTwice, domains, options),
            substitutions: extractRollSubstitutions(selfActor.synthetics.rollSubstitutions, domains, options),
            dosAdjustments,
            traits,
            title: args.title?.trim() || args.label?.trim() || this.label,
            createMessage: args.createMessage ?? true,
        };

        if (typeof args.attackNumber === "number") {
            context.mapIncreases = mapIncreases;
            context.options?.add(`map:increases:${mapIncreases}`);
        }

        const clonedStatistic = selfIsTarget ? rollContext.target?.statistic : rollContext.origin?.statistic;
        const modifiers = clonedStatistic?.check.modifiers ?? this.modifiers;
        const check = new CheckModifier(this.parent.slug, { modifiers }, extraModifiers);
        const roll = await Check.roll(check, context, null, args.callback);

        if (roll) {
            for (const rule of selfActor.rules.filter((r) => !r.ignored)) {
                await rule.afterRoll?.({
                    roll,
                    check,
                    context,
                    domains,
                    rollOptions: options,
                });
            }
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

interface StatisticRollParameters {
    /** A string of some kind to identify the roll: will be included in `CheckRoll#options` */
    identifier?: string;
    /** The slug of an action of which this check is a constituent roll */
    action?: string;
    /** What token to use for the roll itself. Defaults to the actor's token */
    token?: Maybe<TokenDocumentPF2e>;
    /** Which attack this is (for the purposes of multiple attack penalty) */
    attackNumber?: number;
    /** Optional target for the roll */
    target?: Maybe<ActorPF2e>;
    /** Optional origin for the roll: only one of target and origin may be provided */
    origin?: Maybe<ActorPF2e>;
    /** Optional DC data for the roll */
    dc?: CheckDC | CheckDCReference | number | null;
    /** Optional override for the check modifier label */
    label?: string;
    /** An optional identifying slug to give a specific check: propagated to roll options */
    slug?: Maybe<string>;
    /** Optional override for the dialog's title: defaults to label */
    title?: string;
    /** Any additional roll notes that should be used in the roll. */
    extraRollNotes?: (RollNotePF2e | RollNoteSource)[];
    /** Any additional options that should be used in the roll. */
    extraRollOptions?: string[];
    /** Additional modifiers */
    modifiers?: Modifier[];
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
    /** Whether the check is part of a damaging action */
    damaging?: boolean;
    /** Indication that the check is associated with a melee action */
    melee?: boolean;
    /** Whether to create a chat message using the roll (defaults true) */
    createMessage?: boolean;
    /** Callback called when the roll occurs. */
    callback?: CheckRollCallback;
}

class StatisticDifficultyClass<TParent extends Statistic = Statistic> {
    parent: TParent;
    domains: string[];
    label?: string;
    modifiers: Modifier[];
    options: Set<string>;

    constructor(parent: TParent, data: StatisticData, options: RollOptionConfig = {}) {
        this.parent = parent;
        this.domains = R.unique([data.domains, data.dc?.domains].flat()).filter(R.isTruthy);
        this.label = data.dc?.label;
        this.options = parent.createRollOptions(this.domains, options);

        // Acquire additional adjustments for cloned parent modifiers
        const { modifierAdjustments } = parent.actor.synthetics;
        const parentModifiers = parent.modifiers.map((modifier) => {
            const clone = modifier.clone();
            clone.adjustments.push(
                ...extractModifierAdjustments(modifierAdjustments, data.dc?.domains ?? [], clone.slug),
            );
            return clone;
        });

        // Acquire additional adjustments for DC-only modifiers using the parent's domains
        const dcOnlyModifiers = [
            data.dc?.modifiers ?? [],
            extractModifiers(parent.actor.synthetics, data.dc?.domains ?? []),
        ]
            .flat()
            .map((modifier) => {
                modifier.adjustments.push(
                    ...extractModifierAdjustments(
                        parent.actor.synthetics.modifierAdjustments,
                        parent.domains,
                        this.parent.slug,
                    ),
                );
                return modifier;
            });

        // Add modifiers from both sources together and test them
        this.modifiers = [
            ...new StatisticModifier("", [...parentModifiers, ...dcOnlyModifiers.map((m) => m.clone())], this.options)
                .modifiers,
        ];
    }

    get value(): number {
        return (
            10 +
            new StatisticModifier(
                "",
                this.modifiers.map((m) => m.clone()),
                this.options,
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
    value?: never;
}

interface RollOptionConfig {
    extraRollOptions?: string[];
    item?: ItemPF2e | null;
    origin?: ActorPF2e | null;
    target?: ActorPF2e | null;
}

export { Statistic, StatisticCheck, StatisticDifficultyClass };
export type { CheckDCReference, RollOptionConfig, StatisticRollParameters };
