import type { ActorPF2e } from "@actor";
import { StatisticModifier, type ModifierPF2e } from "@actor/modifiers.ts";
import { extractModifiers } from "@module/rules/helpers.ts";
import { BaseStatisticData, BaseStatisticTraceData, StatisticData } from "./data.ts";

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
        this.label = game.i18n.localize(data.label).trim();
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

export { BaseStatistic };
