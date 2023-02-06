import { ItemSheetPF2e } from "@item/sheet/base";
import { ItemSheetDataPF2e } from "@item/sheet/data-types";
import { createSheetOptions, SheetOptions } from "@module/sheet/helpers";
import { damageCategoriesUnique } from "@scripts/config/damage";
import { DamageCategoryUnique } from "@system/damage";
import { htmlClosest, htmlQueryAll } from "@util";
import { MeleePF2e } from ".";

export class MeleeSheetPF2e extends ItemSheetPF2e<MeleePF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<MeleeSheetData> {
        return {
            ...(await super.getData(options)),
            damageTypes: CONFIG.PF2E.damageTypes,
            damageCategories: damageCategoriesUnique,
            attackEffects: createSheetOptions(this.getAttackEffectOptions(), this.item.system.attackEffects),
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0]!;

        // Add damage partial
        for (const button of htmlQueryAll(html, "a[data-action=add-partial]")) {
            button.addEventListener("click", () => {
                const newKey = randomID();
                this.item.update({
                    [`system.damageRolls.${newKey}`]: { damage: "1d4", damageType: "bludgeoning" },
                });
            });
        }

        // Remove damage partial
        for (const button of htmlQueryAll(html, "a[data-action=remove-partial]")) {
            button.addEventListener("click", () => {
                const partialKey = htmlClosest(button, "[data-key]")?.dataset.key;
                if (partialKey) {
                    this.item.update({ [`system.damageRolls.-=${partialKey}`]: null });
                }
            });
        }
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Set empty-string damage categories to `null`
        const categories = Object.keys(formData).filter((k) => /^system.damageRolls\.[a-z0-9]+\.category$/i.test(k));
        for (const key of categories) {
            formData[key] ||= null;
        }

        return super._updateObject(event, formData);
    }
}

interface MeleeSheetData extends ItemSheetDataPF2e<MeleePF2e> {
    damageTypes: ConfigPF2e["PF2E"]["damageTypes"];
    damageCategories: Record<DamageCategoryUnique, string>;
    attackEffects: SheetOptions;
}
