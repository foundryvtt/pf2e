import { ActorPF2e } from "@actor";
import { StatisticModifier } from "@actor/modifiers.ts";
import { MovementType } from "@actor/types.ts";
import { extractModifierAdjustments, extractModifiers } from "@module/rules/helpers.ts";
import { ErrorPF2e } from "@util";
import { BaseStatistic } from "./base.ts";
import { BaseStatisticData, BaseStatisticTraceData } from "./data.ts";

class SpeedStatistic<TActor extends ActorPF2e, TType extends MovementType | "travel"> extends BaseStatistic<TActor> {
    constructor(actor: TActor, options: SpeedStatisticData<TType>) {
        const type = options.type;
        const slug = `${type}-speed`;
        const domains = (options.domains ??= ["all-speeds", "speed", slug]);
        const typeLabel = game.i18n.localize(`PF2E.Actor.Speed.Type.${type.capitalize()}`);
        const label = (options.label ??= game.i18n.format("PF2E.Actor.Speed.Type.Label", { type: typeLabel }));
        super(actor, Object.assign(options, { label, slug }));
        this.type = type;
        this.base = Math.max(5, (options.base ??= 25));
        this.source = options.source ??= null;
        if (!Number.isInteger(this.base) || this.base < 0) {
            throw ErrorPF2e("Non-integer or insufficient base speed provided");
        }
        this.rollOptions = this.createRollOptions(domains);
        const additionalModifiers = (options.modifiers ??= []);
        for (const modifier of additionalModifiers) {
            modifier.adjustments = extractModifierAdjustments(actor.synthetics.modifierAdjustments, domains, slug);
        }
        const syntheticModifiers = extractModifiers(actor.synthetics, domains, { test: this.rollOptions });
        this.modifiers = [...syntheticModifiers, ...additionalModifiers];
    }

    /** The movement type for this statistic */
    type: TType;

    /** The actor's base speed for this movement type */
    base: number;

    source: string | null;

    rollOptions: Set<string>;

    /** The "total modifier" of this speed, even though it isn't a check or DC statistic */
    get value(): number {
        this.#value ??= this.base + new StatisticModifier("", this.modifiers, this.rollOptions).totalModifier;
        return this.#value;
    }

    #value: number | null = null;

    get breakdown(): string {
        const typeLabel = game.i18n.localize(`PF2E.Actor.Speed.Type.${this.type.capitalize()}`);
        const baseLabel = game.i18n.format("PF2E.Actor.Speed.BaseLabel", { value: this.base, type: typeLabel });
        const components = this.modifiers
            .filter((m) => m.enabled && m.value !== 0)
            .map((m) => `${m.label} ${m.signedValue}`);
        return game.i18n.getListFormatter({ style: "narrow" }).format([baseLabel, ...components]);
    }

    /** Derive a travel speed from this statistic. */
    extend<TType extends MovementType | "travel">(options: ExtendParams<TType>): SpeedStatistic<TActor, TType> {
        const base = options.base ?? this.base;
        const source = options.source ?? this.source;
        const modifiers = [
            options.modifiers ?? [],
            this.modifiers
                .filter((m) => !["all-speeds", "speed"].some((d) => m.domains.includes(d)))
                .map((m) => m.clone()),
        ].flat();
        return new SpeedStatistic(this.actor, { type: options.type, base, modifiers, source });
    }

    override getTraceData(): SpeedStatisticTraceData<TType> {
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

interface SpeedStatisticTraceData<TType extends MovementType | "travel" = MovementType | "travel">
    extends BaseStatisticTraceData {
    type: TType;
    value: number;
    base: number;
    source: string | null;
}

interface LandSpeedStatisticTraceData extends SpeedStatisticTraceData {
    crawl: number;
    step: number;
}

interface ExtendParams<TType extends MovementType | "travel">
    extends Pick<SpeedStatisticData<TType>, "type" | "base" | "source" | "modifiers"> {}

export { SpeedStatistic };
export type { LandSpeedStatisticTraceData, SpeedStatisticTraceData };
