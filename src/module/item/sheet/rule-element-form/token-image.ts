import { RuleElementSource } from "@module/rules/index.ts";
import type { TokenImageRuleElement } from "@module/rules/rule-element/token-image.ts";
import { htmlQuery } from "@util";
import { RuleElementForm, RuleElementFormSheetData } from "./base.ts";

class TokenImageForm extends RuleElementForm<RuleElementSource, TokenImageRuleElement> {
    override template = "systems/pf2e/templates/items/rules/token-image.hbs";

    override async getData(): Promise<TokenImageFormSheetData> {
        return {
            ...(await super.getData()),
            scaleEnabled: this.object.scale !== null,
        };
    }

    override activateListeners(html: HTMLElement): void {
        super.activateListeners(html);

        const tintInput = htmlQuery<HTMLInputElement>(html, `input[name="system.rules.${this.index}.tint"]`);
        const scaleCheckbox = htmlQuery<HTMLInputElement>(html, "input[data-action=toggle-scale]");
        const scaleInput = htmlQuery<HTMLInputElement>(html, `input[name="system.rules.${this.index}.scale"]`);
        if (!(tintInput && scaleCheckbox && scaleInput)) return;

        tintInput.id = `${this.fieldIdPrefix}-tint`;
        scaleInput.id = `${this.fieldIdPrefix}-scale`;
        scaleInput.disabled = this.object.scale === null;

        scaleCheckbox.addEventListener("change", (event) => {
            event.stopPropagation();
            const newValue = this.object.scale === null ? 1 : null;
            this.updateItem({ scale: newValue });
        });
    }
}

interface TokenImageFormSheetData extends RuleElementFormSheetData<RuleElementSource, TokenImageRuleElement> {
    scaleEnabled: boolean;
}

export { TokenImageForm };
