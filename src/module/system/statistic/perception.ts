import type { CreaturePF2e } from "@actor";
import { SenseData } from "@actor/creature/data.ts";
import { Sense } from "@actor/creature/sense.ts";
import { AttributeString } from "@actor/types.ts";
import * as R from "remeda";
import type { StatisticData, StatisticTraceData } from "./data.ts";
import { RollOptionConfig, Statistic } from "./statistic.ts";

class PerceptionStatistic<TActor extends CreaturePF2e = CreaturePF2e> extends Statistic<TActor> {
    /** Special senses possessed by the actor */
    senses: Collection<string, Sense>;

    /** Whether the actor has standard vision */
    hasVision: boolean;

    constructor(actor: TActor, partialData: Partial<StatisticData>, config: RollOptionConfig = {}) {
        const data: PerceptionStatisticData = Object.assign(
            {
                slug: "perception",
                label: "PF2E.PerceptionLabel",
                attribute: "wis",
                rank: actor.system.perception.rank ?? null,
                domains: ["perception", "all"],
                check: { type: "perception-check" },
                senses: actor.system.perception.senses,
                vision: actor.system.perception.vision,
            },
            partialData,
        );
        super(actor, data, config);
        this.senses = new Collection(this.#prepareSenses(data.senses).map((s) => [s.type, s]));
        this.hasVision = data.vision ?? true;
    }

    #prepareSenses(data: SenseData[]): Sense[] {
        const actor = this.actor;
        const preparedSenses = data.map((d) => new Sense(d, { parent: actor }));
        const acuityValues = { precise: 2, imprecise: 1, vague: 0 };

        for (const { sense, predicate, force } of actor.synthetics.senses) {
            if (predicate && !predicate.test(actor.getRollOptions(["sense"]))) continue;
            const existing = preparedSenses.find((s) => s.type === sense.type);
            if (!existing) {
                preparedSenses.push(new Sense(sense, { parent: actor }));
            } else if (
                force ||
                acuityValues[sense.acuity] > acuityValues[existing.acuity] ||
                sense.range > existing.range
            ) {
                preparedSenses.splice(preparedSenses.indexOf(existing), 1, new Sense(sense, { parent: actor }));
            }
        }

        return R.uniqueBy(preparedSenses, (s) => s.type);
    }

    override getTraceData(this: Statistic<CreaturePF2e>): PerceptionTraceData<AttributeString>;
    override getTraceData(): PerceptionTraceData;
    override getTraceData(): PerceptionTraceData {
        const senses = this.senses.map((s) => s.toObject(false));
        return Object.assign(super.getTraceData({ value: "mod" }), { senses, vision: this.hasVision });
    }
}

interface PerceptionStatistic<TActor extends CreaturePF2e = CreaturePF2e> extends Statistic<TActor> {
    attribute: AttributeString;
}

interface PerceptionStatisticData extends StatisticData {
    senses: SenseData[];
    vision?: boolean;
    details?: string;
}

type LabeledSenseData = Required<SenseData> & {
    label: string | null;
};

interface PerceptionTraceData<
    TAttribute extends AttributeString = AttributeString,
> extends StatisticTraceData<TAttribute> {
    senses: LabeledSenseData[];
    /** Whether the creature has standard vision */
    vision: boolean;
}

export { PerceptionStatistic, type PerceptionTraceData };
