import { RuleElementSource } from "@module/rules/index.ts";
import type { TokenImageRuleElement } from "@module/rules/rule-element/token-image.ts";
import { htmlQuery } from "@util";
import { RuleElementForm, RuleElementFormSheetData } from "./base.ts";

class TokenImageForm extends RuleElementForm<RuleElementSource, TokenImageRuleElement> {
    override template = "systems/pf2e/templates/items/rules/token-image.hbs";

    override async getData(): Promise<TokenImageFormSheetData> {
        return {
            ...(await super.getData()),
            alphaEnabled: this.object.alpha !== null,
            scaleEnabled: this.object.scale !== null,
        };
    }

    override activateListeners(html: HTMLElement): void {
        super.activateListeners(html);

        const tintInput = htmlQuery<HTMLInputElement>(html, `input[name="system.rules.${this.index}.tint"]`);
        if (tintInput) tintInput.id = `${this.fieldIdPrefix}-tint`;

        for (const fieldName of ["alpha", "scale"] as const) {
            const checkbox = htmlQuery<HTMLInputElement>(html, `input[data-action=toggle-${fieldName}]`);
            const input = htmlQuery<HTMLInputElement>(html, `input[name="system.rules.${this.index}.${fieldName}"]`);
            if (!(checkbox && input)) continue;
            input.id = `${this.fieldIdPrefix}-${fieldName}`;
            input.disabled = this.object[fieldName] === null;
            checkbox.addEventListener("change", (event) => {
                event.stopPropagation();
                const newValue = this.object[fieldName] === null ? 1 : null;
                this.updateItem({ [fieldName]: newValue });
            });
        }
    }
}

interface TokenImageFormSheetData extends RuleElementFormSheetData<RuleElementSource, TokenImageRuleElement> {
    alphaEnabled: boolean;
    scaleEnabled: boolean;
}

export { TokenImageForm };
