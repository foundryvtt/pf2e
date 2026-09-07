import { ActorPF2e } from "@actor";
import { StatisticModifier, type Modifier } from "@actor/modifiers.ts";
import { MovementType } from "@actor/types.ts";
import { extractModifierAdjustments, extractModifiers } from "@module/rules/helpers.ts";
import { ErrorPF2e, localizer } from "@util";
import * as R from "remeda";
import { BaseStatistic } from "./base.ts";
import { BaseStatisticData, BaseStatisticTraceData } from "./data.ts";

const SPEED_VALUE_PATTERN = /movement\.speeds\.(land|burrow|climb|fly|swim)\.value/;

/**
 * How a BaseSpeed formula that reads another speed's total is built in prepareMovementData.
 *
 * - equal: Resolved number matches the parent speed's total (e.g. fly = land.value). Treat as the same
 *   speed: reuse the parent's base and modifier domains so shared bonuses apply once and stack normally.
 * - scaled: Formula uses parent.value but the result differs (e.g. land.value * 0.5). Parent modifiers are
 *   already in that number; only apply modifiers on this movement type's domain afterward.
 * - independent: Fixed value, reads .base only, or min/max chose a constant floor/cap. Build like a normal
 *   speed with full modifier domains (all-speeds, speed, type-speed).
 */
type SpeedDeriveKind = "equal" | "scaled" | "independent";

function getDeriveParentType(formula: string | number, dependsOn: MovementType[]): MovementType | null {
    if (dependsOn.length === 0) return null;
    if (typeof formula === "string") {
        const fromValue = dependsOn.find((type) => formula.includes(`speeds.${type}.value`));
        if (fromValue) return fromValue;
    }
    return dependsOn[0] ?? null;
}

function classifySpeedDeriveKind(
    formula: string | number,
    resolved: number,
    parentValue: number | undefined,
): SpeedDeriveKind {
    if (typeof formula !== "string" || parentValue === undefined || !SPEED_VALUE_PATTERN.test(formula)) {
        return "independent";
    }
    if (resolved === parentValue) return "equal";
    return "scaled";
}

/** Keep one copy of a multi-selector FlatModifier. */
function dedupeModifiersByRule(modifiers: Modifier[]): Modifier[] {
    const seen = new Set<NonNullable<Modifier["rule"]>>();
    return modifiers.filter((modifier) => {
        if (!modifier.rule) return true;
        if (seen.has(modifier.rule)) return false;
        seen.add(modifier.rule);
        return true;
    });
}

class SpeedStatistic<TActor extends ActorPF2e, TType extends MovementType | "travel"> extends BaseStatistic<TActor> {
    constructor(actor: TActor, options: SpeedStatisticData<TType>) {
        const type = options.type;
        const slug = `${type}-speed`;
        const domains = R.unique(options.domains ?? ["all-speeds", "speed", slug]);
        const typeLabel = _loc(`PF2E.Actor.Speed.Type.${type.capitalize()}`);
        const label = options.label ?? _loc("PF2E.Actor.Speed.Type.Label", { type: typeLabel });
        // Empty domains skip BaseStatistic extract; this class extracts once with the real domain list
        super(actor, { label, slug, domains: [], modifiers: [] });
        this.domains = domains;
        this.type = type;
        this.base = Math.max(0, options.base ?? 25);
        this.source = options.source ?? null;
        if (!Number.isInteger(this.base) || this.base < 0) {
            throw ErrorPF2e("Non-integer or insufficient base speed provided");
        }
        this.rollOptions = this.createRollOptions(domains);
        const additionalModifiers = options.modifiers ?? [];
        const modifierAdjustments = actor.synthetics.modifierAdjustments;
        for (const modifier of additionalModifiers) {
            modifier.adjustments = extractModifierAdjustments(modifierAdjustments, domains, modifier.slug);
        }
        const syntheticModifiers = extractModifiers(actor.synthetics, domains, { test: this.rollOptions });
        this.modifiers = dedupeModifiersByRule([...syntheticModifiers, ...additionalModifiers]);
    }

    /** The movement type for this statistic */
    type: TType;

    /** The actor's base speed for this movement type */
    base: number;

    source: string | null;

    rollOptions: Set<string>;

    /** Equal-derived parent; used to collapse shared modifiers in the breakdown */
    #parent: { type: MovementType | "travel"; modifiers: readonly Modifier[] } | null = null;

    /** The "total modifier" of this speed, even though it isn't a check or DC statistic */
    get value(): number {
        if (this.#value === null) {
            const total = this.base + new StatisticModifier("", this.modifiers, this.rollOptions).totalModifier;
            this.#value = this.base > 0 ? Math.max(5, total) : Math.max(0, total);
        }
        return this.#value;
    }

    #value: number | null = null;

    get breakdown(): string {
        const localize = localizer("PF2E.Actor.Speed");
        const parent = this.#parent;
        if (parent) {
            const parentRules = new Set(parent.modifiers.flatMap((m) => (m.rule ? [m.rule] : [])));
            const parentSlugs = new Set(parent.modifiers.map((m) => m.slug));
            const fromParent = (m: Modifier): boolean => (m.rule ? parentRules.has(m.rule) : parentSlugs.has(m.slug));
            const shared = this.modifiers.filter((m) => m.enabled && fromParent(m));
            const childOnly = this.modifiers.filter((m) => m.enabled && m.value !== 0 && !fromParent(m));
            const displayBase = this.base + shared.reduce((sum, m) => sum + m.value, 0);
            const typeLabel = localize(`Type.${this.type.capitalize()}`);
            const baseKey = this.source ? "BaseWithSource" : "BaseLabel";
            const baseLabel = localize(baseKey, { value: displayBase, type: typeLabel, source: this.source });
            const components = childOnly.map((m) => `${m.label} ${m.signedValue}`);
            return game.i18n.getListFormatter({ style: "narrow" }).format([baseLabel, ...components]);
        }
        const typeLabel = localize(`Type.${this.type.capitalize()}`);
        const baseKey = this.source ? "BaseWithSource" : "BaseLabel";
        const baseLabel = localize(baseKey, {
            value: this.base,
            type: typeLabel,
            source: this.source,
        });
        const components = this.modifiers
            .filter((m) => m.enabled && m.value !== 0)
            .map((m) => `${m.label} ${m.signedValue}`);
        return game.i18n.getListFormatter({ style: "narrow" }).format([baseLabel, ...components]);
    }

    /**
     * Derive another speed from this one.
     * equal: same base, union domains.
     * scaled: formula result as base, type-speed domains only.
     */
    derive<U extends MovementType | "travel">(
        type: U,
        options: { mode: "equal" | "scaled"; value?: number; source?: string | null; modifiers?: Modifier[] },
    ): SpeedStatistic<TActor, U> {
        const { mode, source = this.source, modifiers = [] } = options;
        if (mode === "equal") {
            const statistic = new SpeedStatistic(this.actor, {
                type,
                base: this.base,
                domains: R.unique([...this.domains, `${type}-speed`]),
                modifiers,
                source,
            });
            statistic.#parent = this;
            return statistic;
        }
        return new SpeedStatistic(this.actor, {
            type,
            base: options.value ?? this.value,
            domains: [`${type}-speed`],
            modifiers: modifiers.filter((m) => m.domains.includes(`${type}-speed`)),
            source,
        });
    }

    override getTraceData(): TType extends "land"
        ? LandSpeedStatisticTraceData
        : TType extends MovementType | "travel"
          ? SpeedStatisticTraceData<TType>
          : never;
    override getTraceData(): LandSpeedStatisticTraceData | SpeedStatisticTraceData<TType> {
        const data: SpeedStatisticTraceData<TType> & { crawl?: number; step?: number } = {
            type: this.type,
            slug: this.slug,
            label: this.label,
            value: this.value,
            base: this.base,
            source: this.source,
            breakdown: this.breakdown,
            modifiers: this.modifiers.filter((m) => m.enabled && m.value !== 0).map((m) => m.toObject()),
        };
        if (this.type === "land") {
            data.crawl = 5;
            data.step = 5;
        }
        return data;
    }
}

interface SpeedStatisticData<TType extends MovementType | "travel"> extends Omit<Partial<BaseStatisticData>, "slug"> {
    type: TType;
    base?: number;
    /** A feature, ancestry, effect, etc. from which this speed originated */
    source?: string | null;
}

interface SpeedStatisticTraceData<
    TType extends MovementType | "travel" = MovementType | "travel",
> extends BaseStatisticTraceData {
    type: TType;
    value: number;
    base: number;
    source: string | null;
}

interface LandSpeedStatisticTraceData extends SpeedStatisticTraceData<"land"> {
    crawl: number;
    step: number;
}

export { SpeedStatistic, classifySpeedDeriveKind, getDeriveParentType };
export type { LandSpeedStatisticTraceData, SpeedStatisticTraceData };
