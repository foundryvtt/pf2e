import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { MODIFIER_TYPES, ModifierType } from "@actor/modifiers.ts";
import type { FormSelectOption } from "@client/applications/forms/fields.d.mts";
import type { FlatModifierRuleElement, FlatModifierSource } from "@module/rules/rule-element/flat-modifier.ts";
import type { DamageCategoryUnique } from "@system/damage/types.ts";
import { DAMAGE_CATEGORIES_UNIQUE } from "@system/damage/values.ts";
import { htmlQuery, tupleHasValue } from "@util";
import * as R from "remeda";
import { RuleElementForm, RuleElementFormSheetData } from "./base.ts";

/** Form handler for the flat modifier rule element */
class FlatModifierForm extends RuleElementForm<FlatModifierSource, FlatModifierRuleElement> {
    override template = `${SYSTEM_ROOT}/templates/items/rules/flat-modifier.hbs`;

    get isDamage(): boolean {
        const selectors = [this.rule.selector ?? []].flat();
        return selectors.some((s) => s === "damage" || String(s).endsWith("-damage"));
    }

    override activateListeners(html: HTMLElement): void {
        super.activateListeners(html);

        // Add events for toggle buttons
        htmlQuery(html, "[data-action=toggle-selector]")?.addEventListener("click", () => {
            const selector = this.rule.selector;
            const newValue = Array.isArray(selector) ? (selector.at(0) ?? "") : [selector ?? ""].filter((s) => !!s);
            this.updateItem({ selector: newValue });
        });
    }

    override async getData(): Promise<FlatModifierFormSheetData> {
        const data = await super.getData();

        // Make "untyped" the first option and alphabetize the rest
        const abpEnabled = ABP.isEnabled(null);
        const types = R.mapToObj(
            Array.from(MODIFIER_TYPES)
                .filter((t) => abpEnabled || t !== "potency")
                .sort((a, b) => (a[0] === "untyped" ? -1 : b[0] === "untyped" ? 1 : a[1].localeCompare(b[1]))),

            (t) => [t, game.i18n.localize(`PF2E.ModifierType.${t}`)],
        );
        if (typeof data.rule.selector === "string") data.rule.selector = [data.rule.selector];

        return Object.assign(data, {
            abilities: CONFIG.PF2E.abilities,
            types,
            damageCategories: R.pick(CONFIG.PF2E.damageCategories, DAMAGE_CATEGORIES_UNIQUE),
            isDamage: this.isDamage,
            criticalOptions: [
                { value: "false", label: "PF2E.RuleEditor.General.CriticalBehavior.false" },
                { value: "true", label: "PF2E.RuleEditor.General.CriticalBehavior.true" },
            ],
        });
    }

    override updateObject(
        formData: { key: string } & Partial<FlatModifierSource> & Partial<Record<string, JSONValue>>,
    ): void {
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
    abilities: typeof CONFIG.PF2E.abilities;
    types: Record<ModifierType, string>;
    damageCategories: Record<DamageCategoryUnique, string>;
    isDamage: boolean;
    criticalOptions: FormSelectOption[];
}

export { FlatModifierForm };
