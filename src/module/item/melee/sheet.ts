import { ItemSheetDataPF2e, ItemSheetPF2e } from "@item/base/sheet/sheet.ts";
import { SheetOptions, createSheetOptions } from "@module/sheet/helpers.ts";
import { damageCategoriesUnique } from "@scripts/config/damage.ts";
import { DamageCategoryUnique } from "@system/damage/types.ts";
import { htmlClosest, htmlQueryAll } from "@util";
import type { MeleePF2e } from "./index.ts";

export class MeleeSheetPF2e extends ItemSheetPF2e<MeleePF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<MeleeSheetData> {
        const sheetData = await super.getData(options);

        // In case of weak/elite adjustments, display source values for attack modifier and damage formulas
        const itemSource = this.item._source;
        for (const key of Object.keys(sheetData.data.damageRolls)) {
            sheetData.data.damageRolls[key].damage = itemSource.system.damageRolls[key].damage;
        }

        return {
            ...sheetData,
            damageTypes: CONFIG.PF2E.damageTypes,
            damageCategories: damageCategoriesUnique,
            attackEffects: createSheetOptions(this.getAttackEffectOptions(), this.item.system.attackEffects),
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // Add damage partial
        for (const button of htmlQueryAll(html, "a[data-action=add-partial]")) {
            button.addEventListener("click", () => {
                const newKey = fu.randomID();
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
