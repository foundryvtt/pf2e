import { LightData } from "types/foundry/common/data/data.js";
import { RuleElementForm, RuleElementFormOptions, RuleElementFormSheetData } from "./base.ts";
import { TokenLightRuleElement, TokenLightRuleSource } from "@module/rules/rule-element/token-light.ts";
import { isObject } from "remeda";

class TokenLightForm extends RuleElementForm<TokenLightRuleSource, TokenLightRuleElement> {
    override template = "systems/pf2e/templates/items/rules/token-light.hbs";

    constructor(options: RuleElementFormOptions<TokenLightRuleSource, TokenLightRuleElement>) {
        super(options);

        this.tabNames = ["basic", "animation", "advanced"];
        this.tabDisplayStyle = "grid";
    }

    override async getData(): Promise<TokenLightSheetData> {
        const light = ((): LightData | TokenLightRuleElement["value"] | TokenLightRuleSource["value"] => {
            if (this.object) {
                return this.object.value;
            }
            // If we are dealing with an unowned item get default data from LightData
            const data = duplicate(this.rule.value);
            try {
                // Override brackets to construct LightData
                if (isObject(data.dim)) {
                    data.dim = 0;
                }
                if (isObject(data.bright)) {
                    data.bright = 0;
                }
                return new foundry.data.LightData(data);
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                }
                // If everything else fails return the source value
                return this.rule.value;
            }
        })();

        return {
            ...(await super.getData()),
            colorationTechniques: AdaptiveLightingShader.SHADER_TECHNIQUES,
            lightAnimations: Object.entries(CONFIG.Canvas.lightAnimations).reduce(
                (result: Record<string, string>, [key, value]) => {
                    return {
                        ...result,
                        [key]: value.label,
                    };
                },
                {}
            ),
            light,
        };
    }
}

interface TokenLightSheetData extends RuleElementFormSheetData<TokenLightRuleSource, TokenLightRuleElement> {
    colorationTechniques: typeof AdaptiveLightingShader.SHADER_TECHNIQUES;
    lightAnimations: Record<string, string>;
    light: LightData | TokenLightRuleElement["value"] | TokenLightRuleSource["value"];
}

export { TokenLightForm };
