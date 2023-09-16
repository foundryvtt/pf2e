import { MODIFIER_TYPES } from "@actor/modifiers.ts";
import { FlatModifierRuleElement, FlatModifierSource } from "@module/rules/rule-element/flat-modifier.ts";
import { DAMAGE_CATEGORIES_UNIQUE } from "@system/damage/values.ts";
import { htmlQuery, pick, tupleHasValue } from "@util";
import { RuleElementForm, RuleElementFormSheetData } from "./base.ts";

/** Form handler for the flat modifier rule element */
class FlatModifierForm extends RuleElementForm<FlatModifierSource, FlatModifierRuleElement> {
    override template = "systems/pf2e/templates/items/rules/flat-modifier.hbs";

    get isDamage(): boolean {
        const selectors = [this.rule.selector ?? []].flat();
        return selectors.some((s) => s === "damage" || String(s).endsWith("-damage"));
    }

    override activateListeners(html: HTMLElement): void {
        super.activateListeners(html);

        // Add events for toggle buttons
        htmlQuery(html, "[data-action=toggle-selector]")?.addEventListener("click", () => {
            const selector = this.rule.selector;
            const newValue = Array.isArray(selector) ? selector.at(0) ?? "" : [selector ?? ""].filter((s) => !!s);
            this.updateItem({ selector: newValue });
        });
    }

    override async getData(): Promise<FlatModifierFormSheetData> {
        const data = await super.getData();
        data.rule.type = data.rule.type === "untyped" ? "" : data.rule.type;

        return {
            ...data,
            selectorIsArray: Array.isArray(this.rule.selector),
            abilities: CONFIG.PF2E.abilities,
            types: [...MODIFIER_TYPES].filter((type) => type !== "untyped"),
            damageCategories: pick(CONFIG.PF2E.damageCategories, DAMAGE_CATEGORIES_UNIQUE),
            isDamage: this.isDamage,
        };
    }

    override updateObject(formData: Partial<FlatModifierSource>): void {
        // Flat Modifier types may have mutually exclusive properties
        delete formData[formData.type === "ability" ? "value" : "ability"];

        // `critical` is a tri-state of false, true, and null (default).
        formData.critical = tupleHasValue([false, "false"], formData.critical) ? false : !!formData.critical || null;

        // If this cannot possibly be damage, delete the damage properties
        if (!this.isDamage) {
            delete formData.damageCategory;
            delete formData.damageType;
            delete formData.critical;
        }

        super.updateObject(formData);
    }
}

interface FlatModifierFormSheetData extends RuleElementFormSheetData<FlatModifierSource, FlatModifierRuleElement> {
    selectorIsArray: boolean;
    abilities: ConfigPF2e["PF2E"]["abilities"];
    types: Omit<keyof typeof MODIFIER_TYPES, "untyped">[];
    damageCategories: Pick<ConfigPF2e["PF2E"]["damageCategories"], "persistent" | "precision" | "splash">;
    isDamage: boolean;
}

export { FlatModifierForm };
