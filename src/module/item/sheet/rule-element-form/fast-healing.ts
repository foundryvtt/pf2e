import type {
    FastHealingRuleElement,
    FastHealingSource,
    FastHealingType,
} from "@module/rules/rule-element/fast-healing.ts";
import { htmlQuery, tagify } from "@util";
import { RuleElementForm, RuleElementFormSheetData } from "./base.ts";

class FastHealingForm extends RuleElementForm<FastHealingSource, FastHealingRuleElement> {
    override template = "systems/pf2e/templates/items/rules/fast-healing.hbs";
    override activateListeners(html: HTMLElement): void {
        super.activateListeners(html);

        // Tagify the selector list. Valid defaults should be the IWR weakness types
        const selectorElement = htmlQuery<HTMLInputElement>(html, ".deactivated-by");
        if (selectorElement) {
            const whitelist = CONFIG.PF2E.weaknessTypes;
            tagify(selectorElement, { whitelist, enforceWhitelist: false });
        }
    }

    override async getData(): Promise<FastHealingSheetData> {
        return {
            ...(await super.getData()),
            types: {
                "fast-healing": "PF2E.Encounter.Broadcast.FastHealing.fast-healing.Name",
                regeneration: "PF2E.Encounter.Broadcast.FastHealing.regeneration.Name",
            },
        };
    }

    override updateObject(source: FastHealingSource): void {
        // Fast healing has mutually exclusive properties
        delete source[source.type === "regeneration" ? "details" : "deactivatedBy"];
        super.updateObject(source);
    }
}

interface FastHealingSheetData extends RuleElementFormSheetData<FastHealingSource, FastHealingRuleElement> {
    types: Record<FastHealingType, string>;
}

export { FastHealingForm };
