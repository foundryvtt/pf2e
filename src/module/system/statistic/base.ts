import type { ActorPF2e } from "@actor";
import { StatisticModifier, type Modifier } from "@actor/modifiers.ts";
import { extractModifiers } from "@module/rules/helpers.ts";
import * as R from "remeda";
import { BaseStatisticData, BaseStatisticTraceData, StatisticData } from "./data.ts";

/** Basic data forming any Pathfinder statistic */
abstract class BaseStatistic<TActor extends ActorPF2e> {
    /** The actor to which this statistic belongs */
    actor: TActor;
    /** A stable but human-readable identifier */
    slug: string;
    /** A display label */
    label: string;
    /** Original construction arguments */
    protected data: StatisticData;
    /** String category identifiers: used to retrieve modifiers and other synthetics as well as create roll options  */
    domains: string[];
    /** Penalties, bonuses, and actual modifiers comprising a total modifier value */
    modifiers: Modifier[];

    constructor(actor: TActor, data: BaseStatisticData) {
        this.actor = actor;
        this.slug = data.slug;
        this.label = game.i18n.localize(data.label).trim();
        this.data = { ...data };
        this.domains = R.unique((data.domains ??= []));

        // Extract modifiers, clone them, and test them if there are any domains
        // This must occur before stack resolution, to avoid disabled ability modifiers from suppressing other modifiers
        const test = this.domains.length > 0 ? this.createRollOptions() : null;
        const modifiers = [data.modifiers ?? [], extractModifiers(this.actor.synthetics, this.domains)]
            .flat()
            .map((m) => m.clone({ domains: this.domains }, { test }));

        this.modifiers = new StatisticModifier("", modifiers).modifiers;
    }

    createRollOptions(domains = this.domains): Set<string> {
        return new Set(this.actor.getRollOptions(domains));
    }

    abstract getTraceData(): BaseStatisticTraceData;
}

export { BaseStatistic };
