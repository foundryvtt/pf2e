import type { LightDataSchema } from "@common/data/data.d.mts";
import type { SchemaField } from "@common/data/fields.d.mts";
import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/**
 * Add or change the light emitted by a token
 * @category RuleElement
 */
class TokenLightRuleElement extends RuleElement<TokenLightRuleSchema> {
    static override defineSchema(): TokenLightRuleSchema {
        return {
            ...super.defineSchema(),
            value: new fields.SchemaField({
                ...foundry.data.LightData.defineSchema(),
                bright: new ResolvableValueField({ required: false, nullable: false, initial: undefined }),
                color: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
                dim: new ResolvableValueField({ required: false, nullable: false, initial: undefined }),
            }),
        };
    }

    getLightData(): fields.SourceFromSchema<LightDataSchema> | null {
        const light = this.value;

        light.color &&= this.resolveInjectedProperties(light.color);

        for (const key of ["bright", "dim"] as const) {
            if (light[key] !== undefined) {
                const resolvedValue = this.resolveValue(light[key]);
                if (typeof resolvedValue === "number") {
                    light[key] = resolvedValue;
                } else {
                    this.failValidation(`${key}: must resolve to a number`);
                    return null;
                }
            }
        }

        try {
            return new foundry.data.LightData(light).toObject();
        } catch (error) {
            if (error instanceof Error) this.failValidation(error.message);
            return null;
        }
    }

    override afterPrepareData(): void {
        if (!this.test()) return;

        const data = this.getLightData();
        if (data) {
            this.actor.synthetics.tokenOverrides.light = data;
        }
    }
}

interface TokenLightRuleElement
    extends RuleElement<TokenLightRuleSchema>,
        ModelPropsFromRESchema<TokenLightRuleSchema> {}

type TokenLightValueSchema = Omit<LightDataSchema, "bright" | "color" | "dim"> & {
    bright: ResolvableValueField<false, false, false>;
    /** `LightData#color` as an injectable property */
    color: fields.StringField<string, string, false, true, true>;
    dim: ResolvableValueField<false, false, false>;
};

type TokenLightRuleSchema = RuleElementSchema & {
    value: SchemaField<TokenLightValueSchema>;
};

type TokenLightRuleSource = fields.SourceFromSchema<TokenLightRuleSchema>;

export { TokenLightRuleElement };
export type { TokenLightRuleSource };
