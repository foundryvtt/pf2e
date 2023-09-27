import { RuleElementForm, RuleElementFormSheetData, RuleElementFormTabData } from "./base.ts";
import type { TokenLightRuleElement, TokenLightRuleSource } from "@module/rules/rule-element/token-light.ts";
import * as R from "remeda";

class TokenLightForm extends RuleElementForm<TokenLightRuleSource, TokenLightRuleElement> {
    override template = "systems/pf2e/templates/items/rules/token-light.hbs";
    protected override tabs: RuleElementFormTabData = {
        names: ["basic", "animation", "advanced"],
        displayStyle: "grid",
    };

    protected override getInitialValue(): object {
        const initial = super.getInitialValue();

        if (!this.object) {
            // If we are dealing with an unowned item get initial data from LightData
            const data = duplicate(this.rule.value ?? {});
            try {
                // Override brackets to construct LightData
                if (R.isObject(data.dim)) {
                    data.dim = 0;
                }
                if (R.isObject(data.bright)) {
                    data.bright = 0;
                }
                const lightData = new foundry.data.LightData(data).toObject();
                mergeObject(initial, lightData);
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                }
            }
        }
        return initial;
    }

    override async getData(): Promise<TokenLightSheetData> {
        const data = await super.getData();
        return {
            ...data,
            colorationTechniques: AdaptiveLightingShader.SHADER_TECHNIQUES,
            light: data.rule.value,
            lightAnimations: R.mapValues(CONFIG.Canvas.lightAnimations, (value) => value.label),
        };
    }

    override updateObject(source: TokenLightRuleSource): void {
        if (!source.value.bright) delete source.value.bright;
        if (!source.value.dim) delete source.value.dim;
        super.updateObject(source);
    }
}

interface TokenLightSheetData extends RuleElementFormSheetData<TokenLightRuleSource, TokenLightRuleElement> {
    colorationTechniques: typeof AdaptiveLightingShader.SHADER_TECHNIQUES;
    light: TokenLightRuleSource["value"];
    lightAnimations: Record<keyof typeof CONFIG.Canvas.lightAnimations, string>;
}

export { TokenLightForm };
