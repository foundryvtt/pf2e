import { MODIFIER_TYPES, ModifierType } from "@actor/modifiers.ts";
import type { FlatModifierRuleElement, FlatModifierSource } from "@module/rules/rule-element/flat-modifier.ts";
import { DAMAGE_CATEGORIES_UNIQUE } from "@system/damage/values.ts";
import { htmlQuery, tupleHasValue } from "@util";
import * as R from "remeda";
import { RuleElementForm, RuleElementFormSheetData } from "./base.ts";
import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";

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

        // Make "untyped" the first option and alphabetize the rest
        const types = (() => {
            const abpEnabled = ABP.isEnabled(null);
            const entries = Array.from(MODIFIER_TYPES)
                .filter((t) => abpEnabled || t !== "potency")
                .map((t): [ModifierType, string] => [t, game.i18n.localize(`PF2E.ModifierType.${t}`)])
                .sort((a, b) => (a[0] === "untyped" ? -1 : b[0] === "untyped" ? 1 : a[1].localeCompare(b[1])));
            return R.fromPairs(entries);
        })();

        return {
            ...data,
            selectorIsArray: Array.isArray(this.rule.selector),
            abilities: CONFIG.PF2E.abilities,
            types,
            damageCategories: R.pick(CONFIG.PF2E.damageCategories, Array.from(DAMAGE_CATEGORIES_UNIQUE)),
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
    types: Record<ModifierType, string>;
    damageCategories: Pick<ConfigPF2e["PF2E"]["damageCategories"], "persistent" | "precision" | "splash">;
    isDamage: boolean;
}

export { FlatModifierForm };
