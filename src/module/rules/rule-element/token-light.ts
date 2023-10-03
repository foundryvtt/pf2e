import { ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";
import { RuleElementOptions, RuleElementPF2e } from "./index.ts";
import type { SchemaField } from "types/foundry/common/data/fields.d.ts";
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
            value: new fields.SchemaField({
                ...foundry.data.LightData.defineSchema(),
                dim: new ResolvableValueField({ required: false, nullable: false, initial: undefined }),
                bright: new ResolvableValueField({ required: false, nullable: false, initial: undefined }),
            }),
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
        this.actor.synthetics.tokenOverrides.light = deepClone(this.value as ValidatedProps);
    }
}

interface TokenLightRuleElement
    extends RuleElementPF2e<TokenLightRuleSchema>,
        ModelPropsFromSchema<TokenLightRuleSchema> {}

type TokenLightValueSchema = Omit<LightDataSchema, "dim" | "bright"> & {
    dim: ResolvableValueField<false, false, false>;
    bright: ResolvableValueField<false, false, false>;
};

type ValidatedProps = DeepPartial<
    Omit<ModelPropsFromSchema<TokenLightValueSchema>, "dim" | "bright"> & {
        dim: number;
        bright: number;
    }
>;

type TokenLightRuleSchema = RuleElementSchema & {
    value: SchemaField<TokenLightValueSchema>;
};

type TokenLightRuleSource = SourceFromSchema<TokenLightRuleSchema>;

export { TokenLightRuleElement };
export type { TokenLightRuleSource };
