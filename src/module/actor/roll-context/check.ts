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
    against: string | null;

    constructor(params: CheckContextConstructorParams<TSelf, TStatistic, TItem>) {
        super(params);
        this.against = params.against ?? null;
    }

    override resolve(): Promise<CheckContextData<TSelf, TStatistic, TItem>>;
    override async resolve(): Promise<CheckContextData> {
        const baseContext = await super.resolve();
        const originIsSelf = !!baseContext.origin?.self;
        const selfActor = originIsSelf ? baseContext.origin?.actor : baseContext.target?.actor;
        const opposingActor = originIsSelf ? baseContext.target?.actor : baseContext.origin?.actor;

        const mayHaveRangePenalty = !!selfActor && originIsSelf && this.domains.includes("attack-roll");
        const rangeIncrement = baseContext.target?.rangeIncrement ?? null;
        const rangePenalty = mayHaveRangePenalty
            ? calculateRangePenalty(selfActor, rangeIncrement, this.domains, baseContext.options)
            : null;
        if (rangePenalty) baseContext.origin?.modifiers.push(rangePenalty);

        const dcData = ((): CheckDC | null => {
            const { domains, against } = this;
            if (!against) return null;
            const scope = domains.includes("attack") ? "attack" : "check";
            const statistic = opposingActor?.getStatistic(against.replace(/-dc$/, ""))?.dc;
            return statistic ? { scope, statistic, slug: against, value: statistic.value } : null;
        })();

        return { ...baseContext, dc: dcData };
    }
}

export { CheckContext };
