import type { ActorPF2e, CreaturePF2e } from "@actor";
import { SenseData } from "@actor/creature/data.ts";
import { Sense } from "@actor/creature/sense.ts";
import { AttributeString } from "@actor/types.ts";
import * as R from "remeda";
import type { StatisticData, StatisticTraceData } from "./data.ts";
import { Statistic, type RollOptionConfig } from "./statistic.ts";

class PerceptionStatistic<TActor extends ActorPF2e = ActorPF2e> extends Statistic<TActor> {
    /** Special senses possessed by the actor */
    senses: Collection<Sense>;

    /** Whether the actor has standard vision */
    hasVision: boolean;

    /** Special senses or other perception-related details without formalization in the system: used for NPCs */
    declare details?: string;

    constructor(actor: TActor, data: PerceptionStatisticData, config: RollOptionConfig = {}) {
        super(actor, data, config);
        this.senses = new Collection(this.#prepareSenses(data.senses).map((s) => [s.type, s]));
        this.hasVision = data.vision ?? true;
        if (typeof data.details === "string") {
            this.details = data.details;
        }
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

        return R.uniqBy(preparedSenses, (s) => s.type);
    }

    override getTraceData(this: Statistic<CreaturePF2e>): PerceptionTraceData<AttributeString>;
    override getTraceData(): PerceptionTraceData;
    override getTraceData(): PerceptionTraceData {
        return {
            ...super.getTraceData({ value: "mod" }),
            senses: this.senses.map((s) => s.toObject(false)),
            vision: this.hasVision,
            details: this.details ?? "",
        };
    }
}

interface PerceptionStatisticData extends StatisticData {
    senses: SenseData[];
    vision?: boolean;
    details?: string;
}

type LabeledSenseData = Required<SenseData> & {
    label: string | null;
};

interface PerceptionTraceData<TAttribute extends AttributeString | null = AttributeString | null>
    extends StatisticTraceData<TAttribute> {
    /** Unusual senses or other perception-related notes */
    details: string;
    senses: LabeledSenseData[];
    /** Whether the creature has standard vision */
    vision: boolean;
}

export { PerceptionStatistic, type PerceptionTraceData };
