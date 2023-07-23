import { CharacterPF2e, NPCPF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import {
    DEGREE_ADJUSTMENT_AMOUNTS,
    DEGREE_OF_SUCCESS_STRINGS,
    DegreeAdjustmentAmount,
    DegreeOfSuccessString,
} from "@system/degree-of-success.ts";
import { RuleElementPF2e, RuleElementSchema } from "./index.ts";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { RecordField } from "@system/schema-data-fields.ts";

/**
 * @category RuleElement
 */
class AdjustDegreeOfSuccessRuleElement extends RuleElementPF2e<AdjustDegreeRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    static override defineSchema(): AdjustDegreeRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, nullable: false, blank: false }),
            adjustment: new RecordField(
                new fields.StringField({
                    required: true,
                    nullable: false,
                    choices: ["all", ...DEGREE_OF_SUCCESS_STRINGS],
                }),
                new fields.StringField({ required: true, nullable: false, choices: degreeAdjustmentAmountString }),
                { required: true, nullable: false }
            ),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);
        const adjustments = this.adjustment;

        const stringToAdjustment = {
            "two-degrees-better": DEGREE_ADJUSTMENT_AMOUNTS.INCREASE_BY_TWO,
            "one-degree-better": DEGREE_ADJUSTMENT_AMOUNTS.INCREASE,
            "one-degree-worse": DEGREE_ADJUSTMENT_AMOUNTS.LOWER,
            "two-degrees-worse": DEGREE_ADJUSTMENT_AMOUNTS.LOWER_BY_TWO,
            "to-critical-failure": DEGREE_ADJUSTMENT_AMOUNTS.TO_CRITICAL_FAILURE,
            "to-failure": DEGREE_ADJUSTMENT_AMOUNTS.TO_FAILURE,
            "to-success": DEGREE_ADJUSTMENT_AMOUNTS.TO_SUCCESS,
            "to-critical-success": DEGREE_ADJUSTMENT_AMOUNTS.TO_CRITICAL_SUCCESS,
        } as const;

        const record = (["all", ...DEGREE_OF_SUCCESS_STRINGS] as const).reduce((accumulated, outcome) => {
            const adjustment = adjustments[outcome];
            if (adjustment) {
                accumulated[outcome] = { label: this.label, amount: stringToAdjustment[adjustment] };
            }
            return accumulated;
        }, {} as { [key in "all" | DegreeOfSuccessString]?: { label: string; amount: DegreeAdjustmentAmount } });

        const synthetics = (this.actor.synthetics.degreeOfSuccessAdjustments[selector] ??= []);
        synthetics.push({
            adjustments: record,
            predicate: this.predicate,
        });
    }
}

interface AdjustDegreeOfSuccessRuleElement
    extends RuleElementPF2e<AdjustDegreeRuleSchema>,
        ModelPropsFromSchema<AdjustDegreeRuleSchema> {
    get actor(): CharacterPF2e | NPCPF2e;
}

const degreeAdjustmentAmountString = [
    "one-degree-better",
    "one-degree-worse",
    "two-degrees-better",
    "two-degrees-worse",
    "to-critical-failure",
    "to-failure",
    "to-success",
    "to-critical-success",
] as const;
type DegreeAdjustmentAmountString = (typeof degreeAdjustmentAmountString)[number];

type AdjustDegreeRuleSchema = RuleElementSchema & {
    selector: StringField<string, string, true, false, false>;
    adjustment: RecordField<
        StringField<"all" | DegreeOfSuccessString, "all" | DegreeOfSuccessString, true, false, false>,
        StringField<DegreeAdjustmentAmountString, DegreeAdjustmentAmountString, true, false, false>
    >;
};

export { AdjustDegreeOfSuccessRuleElement };
