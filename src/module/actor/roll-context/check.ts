import type { ActorPF2e } from "@actor";
import type { StrikeData } from "@actor/data/base.ts";
import { calculateRangePenalty } from "@actor/helpers.ts";
import type { ItemPF2e } from "@item";
import { CheckDC } from "@system/degree-of-success.ts";
import type { Statistic } from "@system/statistic/statistic.ts";
import { RollContext } from "./base.ts";
import { CheckContextConstructorParams, CheckContextData } from "./types.ts";

class CheckContext<
    TSelf extends ActorPF2e,
    TStatistic extends Statistic | StrikeData,
    TItem extends ItemPF2e<ActorPF2e> | null,
> extends RollContext<TSelf, TStatistic, TItem> {
    /** The slug of a `Statistic` for use in building a DC */
    against: string;

    constructor(params: CheckContextConstructorParams<TSelf, TStatistic, TItem>) {
        super(params);
        this.against = params.against;
    }

    override resolve(): Promise<CheckContextData<TSelf, TStatistic, TItem>>;
    override async resolve(): Promise<CheckContextData> {
        const baseContext = await super.resolve();
        const targetActor = baseContext.target?.actor;
        const rangeIncrement = baseContext.target?.rangeIncrement ?? null;
        const rangePenalty = calculateRangePenalty(
            baseContext.origin.actor,
            rangeIncrement,
            this.domains,
            baseContext.options,
        );
        if (rangePenalty) baseContext.origin.modifiers.push(rangePenalty);

        const dcData = ((): CheckDC | null => {
            const { domains, against } = this;
            const scope = domains.includes("attack") ? "attack" : "check";
            const statistic = targetActor?.getStatistic(against.replace(/-dc$/, ""))?.dc;
            return statistic ? { scope, statistic, slug: against, value: statistic.value } : null;
        })();

        return { ...baseContext, dc: dcData };
    }
}

export { CheckContext };
