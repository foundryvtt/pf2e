import type { CreaturePF2e, HazardPF2e, VehiclePF2e } from "@actor";
import { StatisticModifier, createAttributeModifier } from "@actor/modifiers.ts";
import { signedInteger } from "@util";
import * as R from "remeda";
import { BaseStatistic } from "./base.ts";
import { BaseStatisticTraceData } from "./data.ts";

class HitPointsStatistic extends BaseStatistic {
    /** The actor's current hit points */
    value: number;

    /** The actor's maximum hit points, which is the "total modifier" of this statistic */
    max: number;

    /** A "base" max before any penalties, bonuses, or other modifiers */
    #baseMax: number;

    /** Temporary hit points */
    temp: number;

    /** Whether the actor is healed by void healing and harmed by vitality damage */
    negativeHealing: boolean;

    /** Unrecoverable hit points: a number of lost hit points that cannot be healed by any means */
    unrecoverable: number;

    /** Additional, unstructured information affecting the actor's hit points */
    details: string;

    constructor(actor: CreaturePF2e | HazardPF2e | VehiclePF2e, { baseMax = 0 }: { baseMax?: number } = {}) {
        const modifiers = actor.isOfType("character")
            ? [createAttributeModifier({ actor, attribute: "con", domains: ["hp", "con-based"] })]
            : [];

        super(actor, {
            slug: "hp",
            label: "PF2E.HitPointsHeader",
            domains: actor.isOfType("character", "npc") ? ["con-based", "hp"] : ["hp"],
            modifiers,
        });

        this.#baseMax = baseMax;
        this.max =
            baseMax +
            new StatisticModifier(
                "",
                this.modifiers.map((m) => m.clone()),
            ).totalModifier;
        this.value = Math.clamped(actor.system.attributes.hp.value, 0, this.max);
        this.temp = actor.system.attributes.hp.temp;
        this.negativeHealing = actor.system.attributes.hp.negativeHealing;
        this.unrecoverable = actor.system.attributes.hp.unrecoverable;
        this.details = actor.system.attributes.hp.details || "";
    }

    get breakdown(): string {
        return R.compact([
            this.#baseMax > 0 ? game.i18n.format("PF2E.MaxHitPointsBaseLabel", { base: this.#baseMax }) : null,
            ...this.modifiers.filter((m) => m.enabled).map((m) => `${m.label} ${signedInteger(m.modifier)}`),
        ]).join(", ");
    }

    override getTraceData(): HitPointsTraceData {
        return {
            slug: this.slug,
            label: this.label,
            value: this.value,
            max: this.max,
            temp: this.temp,
            breakdown: this.breakdown,
            negativeHealing: this.negativeHealing,
            unrecoverable: this.unrecoverable,
            details: this.details,
            modifiers: this.modifiers.map((m) => m.toObject()),
        };
    }
}

interface HitPointsTraceData
    extends BaseStatisticTraceData,
        Pick<HitPointsStatistic, "max" | "temp" | "negativeHealing" | "unrecoverable" | "details"> {
    /** The actor's current hit points */
    value: number;
}

export { HitPointsStatistic };
