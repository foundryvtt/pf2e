import type { ActorType, CharacterPF2e, NPCPF2e } from "@actor";
import {
    DEGREE_ADJUSTMENT_AMOUNTS,
    DEGREE_OF_SUCCESS_STRINGS,
    DegreeAdjustmentAmount,
    DegreeOfSuccessString,
} from "@system/degree-of-success.ts";
import { RecordField } from "@system/schema-data-fields.ts";
import { ModelPropsFromRESchema } from "./data.ts";
import { RuleElement, RuleElementSchema } from "./index.ts";
import fields = foundry.data.fields;

/**
 * @category RuleElement
 */
class AdjustDegreeOfSuccessRuleElement extends RuleElement<AdjustDegreeRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    static override defineSchema(): AdjustDegreeRuleSchema {
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
                { required: true, nullable: false },
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

        const record = (["all", ...DEGREE_OF_SUCCESS_STRINGS] as const).reduce(
            (accumulated, outcome) => {
                const adjustment = adjustments[outcome];
                if (adjustment) {
                    accumulated[outcome] = { label: this.label, amount: stringToAdjustment[adjustment] };
                }
                return accumulated;
            },
            {} as { [key in "all" | DegreeOfSuccessString]?: { label: string; amount: DegreeAdjustmentAmount } },
        );

        const synthetics = (this.actor.synthetics.degreeOfSuccessAdjustments[selector] ??= []);
        synthetics.push({
            adjustments: record,
            predicate: this.resolveInjectedProperties(this.predicate),
        });
    }
}

interface AdjustDegreeOfSuccessRuleElement
    extends RuleElement<AdjustDegreeRuleSchema>,
        ModelPropsFromRESchema<AdjustDegreeRuleSchema> {
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
    selector: fields.StringField<string, string, true, false, false>;
    adjustment: RecordField<
        fields.StringField<"all" | DegreeOfSuccessString, "all" | DegreeOfSuccessString, true, false, false>,
        fields.StringField<DegreeAdjustmentAmountString, DegreeAdjustmentAmountString, true, false, false>
    >;
};

export { AdjustDegreeOfSuccessRuleElement };
