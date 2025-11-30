import type { TokenLightRuleElement, TokenLightRuleSource } from "@module/rules/rule-element/token-light.ts";
import * as R from "remeda";
import { RuleElementForm, RuleElementFormSheetData, RuleElementFormTabData } from "./base.ts";

class TokenLightForm extends RuleElementForm<TokenLightRuleSource, TokenLightRuleElement> {
    override template = `${SYSTEM_ROOT}/templates/items/rules/token-light.hbs`;
    protected override tabs: RuleElementFormTabData = {
        names: ["basic", "animation", "advanced"],
        displayStyle: "grid",
    };

    override async getData(): Promise<TokenLightSheetData> {
        const data = await super.getData();
        return Object.assign(data, {
            colorationTechniques: fc.rendering.shaders.AdaptiveLightingShader.SHADER_TECHNIQUES,
            light: data.rule.value,
            lightAnimations: R.mapValues(CONFIG.Canvas.lightAnimations, (value) => value.label),
        });
    }
}

interface TokenLightSheetData extends RuleElementFormSheetData<TokenLightRuleSource, TokenLightRuleElement> {
    colorationTechniques: typeof fc.rendering.shaders.AdaptiveLightingShader.SHADER_TECHNIQUES;
    light: TokenLightRuleSource["value"];
    lightAnimations: Record<string, string>;
}

export { TokenLightForm };
