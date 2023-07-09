import { RuleElementSchema, RuleElementSource } from "./data.ts";
import { RuleElementOptions, RuleElementPF2e } from "./index.ts";
import type { ObjectField } from "types/foundry/common/data/fields.d.ts";
import type { LightDataSchema } from "types/foundry/common/data/data.d.ts";

/**
 * Add or change the light emitted by a token
 * @category RuleElement
 */
class TokenLightRuleElement extends RuleElementPF2e<TokenLightRuleSchema> {
    static override defineSchema(): TokenLightRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            value: new fields.ObjectField({ required: true, nullable: false }),
        };
    }

    constructor(data: RuleElementSource, options: RuleElementOptions) {
        super(data, options);
        this.validateData();
    }

    validateData(): void {
        const light = this.value;

        for (const key of ["dim", "bright"] as const) {
            if (light[key] !== undefined) {
                const resolvedValue = this.resolveValue(light[key]);
                if (typeof resolvedValue === "number") {
                    light[key] = resolvedValue;
                } else {
                    return this.failValidation(`${key} must resolve to a number`);
                }
            }
        }

        try {
            new foundry.data.LightData(light);
        } catch (error) {
            if (error instanceof Error) this.failValidation(error.message);
        }
    }

    override afterPrepareData(): void {
        if (!this.test()) return;
        this.actor.synthetics.tokenOverrides.light = deepClone(this.value);
    }
}

interface TokenLightRuleElement
    extends RuleElementPF2e<TokenLightRuleSchema>,
        ModelPropsFromSchema<TokenLightRuleSchema> {}

type TokenLightRuleSchema = RuleElementSchema & {
    value: ObjectField<DeepPartial<SourceFromSchema<LightDataSchema>>>;
};

export { TokenLightRuleElement };
