import { RuleElementSource } from "@module/rules/index.ts";
import type { TokenImageRuleElement } from "@module/rules/rule-element/token-image.ts";
import * as R from "remeda";
import { RuleElementForm, RuleElementFormSheetData, RuleElementFormTabData } from "./base.ts";

class TokenImageForm extends RuleElementForm<RuleElementSource, TokenImageRuleElement> {
    override template = "systems/pf2e/templates/items/rules/token-image.hbs";

    protected override tabs: RuleElementFormTabData = {
        names: ["basics", "ring"],
        displayStyle: "grid",
    };

    override async getData(): Promise<TokenImageFormSheetData> {
        return Object.assign(await super.getData(), {
            alphaEnabled: this.object.alpha !== null,
            scaleEnabled: this.object.scale !== null,
        });
    }

    override activateListeners(html: HTMLElement): void {
        super.activateListeners(html);

        const tintInput = html.querySelector<HTMLInputElement>(`input[name="system.rules.${this.index}.tint"]`);
        if (tintInput) tintInput.id = `${this.fieldIdPrefix}-tint`;
        for (const fieldName of ["alpha", "scale"] as const) {
            const checkbox = html.querySelector<HTMLInputElement>(`input[data-action=toggle-${fieldName}]`);
            const input = html.querySelector<fa.elements.HTMLRangePickerElement>(
                `range-picker[name="system.rules.${this.index}.${fieldName}"]`,
            );
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

    override updateObject(source: RuleElementSource & Partial<Record<string, JSONValue>>): void {
        if (
            R.isPlainObject(source.ring) &&
            R.isPlainObject(source.ring.subject) &&
            typeof source.ring.subject.texture === "string" &&
            !source.ring.subject.texture.trim()
        ) {
            source.ring = null;
        }
        return super.updateObject(source);
    }
}

interface TokenImageFormSheetData extends RuleElementFormSheetData<RuleElementSource, TokenImageRuleElement> {
    alphaEnabled: boolean;
    scaleEnabled: boolean;
}

export { TokenImageForm };
