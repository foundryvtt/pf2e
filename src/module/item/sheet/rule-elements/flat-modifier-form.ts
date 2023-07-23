import { MODIFIER_TYPES } from "@actor/modifiers.ts";
import { isBracketedValue } from "@module/rules/helpers.ts";
import { FlatModifierRuleElement, FlatModifierSource } from "@module/rules/rule-element/flat-modifier.ts";
import { DAMAGE_CATEGORIES_UNIQUE } from "@system/damage/values.ts";
import { htmlQuery, isObject, pick, tagify, tupleHasValue } from "@util";
import { coerceNumber, RuleElementForm, RuleElementFormSheetData } from "./base.ts";

/** Form handler for the flat modifier rule element */
class FlatModifierForm extends RuleElementForm<FlatModifierSource, FlatModifierRuleElement> {
    override template = "systems/pf2e/templates/items/rules/flat-modifier.hbs";

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

    override async getData(): Promise<FlatModifierFormSheetData> {
        const data = await super.getData();
        data.rule.type = data.rule.type === "untyped" ? "" : data.rule.type;
        const valueMode = isBracketedValue(this.rule.value)
            ? "brackets"
            : isObject(this.rule.value)
            ? "object"
            : "primitive";

        const selectors = [this.rule.selector ?? []].flat();
        const isDamage = selectors.some((s) => String(s).endsWith("damage"));

        return {
            ...data,
            selectorIsArray: Array.isArray(this.rule.selector),
            abilities: CONFIG.PF2E.abilities,
            types: [...MODIFIER_TYPES].filter((type) => type !== "untyped"),
            damageCategories: pick(CONFIG.PF2E.damageCategories, DAMAGE_CATEGORIES_UNIQUE),
            isDamage,
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
        delete formData[formData.type === "ability" ? "value" : "ability"];

        // `critical` is a tri-state of false, true, and null (default).
        formData.critical = tupleHasValue([false, "false"], formData.critical) ? false : !!formData.critical || null;
        if (formData.critical === null) {
            delete formData.critical;
        }

        // Remove empty string, null, or falsy values for certain optional parameters
        for (const optional of ["label", "type", "damageType", "damageCategory", "hideIfDisabled"] as const) {
            if (!formData[optional]) {
                delete formData[optional];
            }
        }
    }
}

interface FlatModifierFormSheetData extends RuleElementFormSheetData<FlatModifierSource, FlatModifierRuleElement> {
    selectorIsArray: boolean;
    abilities: ConfigPF2e["PF2E"]["abilities"];
    types: Omit<keyof typeof MODIFIER_TYPES, "untyped">[];
    damageCategories: Pick<ConfigPF2e["PF2E"]["damageCategories"], "persistent" | "precision" | "splash">;
    isDamage: boolean;
    value: {
        mode: "brackets" | "object" | "primitive";
        data: unknown;
    };
}

export { FlatModifierForm };
