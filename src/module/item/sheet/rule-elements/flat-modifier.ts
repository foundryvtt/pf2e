import { MODIFIER_TYPES } from "@actor/modifiers";
import { FlatModifierSource } from "@module/rules/rule-element/flat-modifier";
import { isBracketedValue } from "@module/rules/util";
import { htmlQuery, isObject, tagify } from "@util";
import { coerceNumber, RuleElementForm } from "./base";

/** Form handler for the flat modifier rule element */
class FlatModifierForm extends RuleElementForm<FlatModifierSource> {
    override template = "systems/pf2e/templates/items/rules/flat-modifier.html";
    override activateListeners(html: HTMLElement): void {
        // Tagify the selector list
        const selectorElement = htmlQuery<HTMLInputElement>(html, ".selector-list");
        if (selectorElement) {
            tagify(selectorElement);
        }

        // Add events for toggle buttons
        html.querySelector("[data-action=toggle-selector]")?.addEventListener("click", () => {
            const selector = this.rule.selector;
            const newValue = Array.isArray(selector) ? selector.at(0) ?? "" : [selector ?? ""].filter((s) => !!s);
            this.updateItem({ selector: newValue });
        });

        // Add events for toggle buttons
        html.querySelector("[data-action=toggle-brackets]")?.addEventListener("click", () => {
            const value = this.rule.value;
            if (isBracketedValue(value)) {
                this.updateItem({ value: "" });
            } else {
                this.updateItem({ value: { brackets: [{ value: "" }] } });
            }
        });

        for (const button of html.querySelectorAll("[data-action=bracket-add]")) {
            button.addEventListener("click", () => {
                const value = this.rule.value;
                if (isBracketedValue(value)) {
                    value.brackets.push({ value: "" });
                    this.updateItem({ value });
                }
            });
        }

        for (const button of html.querySelectorAll("[data-action=bracket-delete]")) {
            button.addEventListener("click", (event) => {
                const value = this.rule.value;
                const idx = Number((event.target as HTMLElement)?.closest<HTMLElement>("[data-idx]")?.dataset.idx);
                if (isBracketedValue(value)) {
                    value.brackets.splice(idx, 1);
                    this.updateItem({ value });
                }
            });
        }
    }

    override async getData() {
        const data = await super.getData();
        data.rule.type = data.rule.type === "untyped" ? "" : data.rule.type;
        const valueMode = isBracketedValue(this.rule.value)
            ? "brackets"
            : isObject(this.rule.value)
            ? "object"
            : "primitive";

        return {
            ...data,
            selectorIsArray: Array.isArray(this.rule.selector),
            abilities: CONFIG.PF2E.abilities,
            types: [...MODIFIER_TYPES].filter((type) => type !== "untyped"),
            damageCategories: CONFIG.PF2E.damageCategories,
            value: {
                mode: valueMode,
                data: this.rule.value,
            },
        };
    }

    override _updateObject(formData: Partial<FlatModifierSource>): void {
        // Convert brackets to array, and coerce the value types
        if (isObject<{ brackets: object; field: string }>(formData.value) && "brackets" in formData.value) {
            const brackets = (formData.value.brackets = Array.from(Object.values(formData.value.brackets ?? {})));

            if (formData.value.field === "") {
                delete formData.value.field;
            }

            for (const bracket of brackets) {
                if (bracket.start === null) delete bracket.start;
                if (bracket.end === null) delete bracket.end;
                bracket.value = isObject(bracket.value) ? "" : coerceNumber(bracket.value);
            }
        } else if (!isObject(formData.value)) {
            formData.value = coerceNumber(formData.value ?? "");
        }

        // Flat Modifier types may have mutually exclusive properties
        if (formData.type === "ability") {
            delete formData.value;
        } else {
            delete formData.ability;
        }

        // Remove empty string, null, or falsy values for certain optional parameters
        for (const optional of [
            "label",
            "type",
            "min",
            "max",
            "damageType",
            "damageCategory",
            "hideIfDisabled",
        ] as const) {
            if (!formData[optional]) {
                delete formData[optional];
            }
        }
    }
}

export { FlatModifierForm };
