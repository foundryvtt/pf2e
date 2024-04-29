import { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/index.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import { DamageType } from "@system/damage/index.ts";
import { sortStringRecord } from "@util";
import * as R from "remeda";
import type { ConsumablePF2e } from "./document.ts";
import { ConsumableCategory } from "./types.ts";
import { DAMAGE_OR_HEALING_CONSUMABLE_CATEGORIES } from "./values.ts";

class ConsumableSheetPF2e extends PhysicalItemSheetPF2e<ConsumablePF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<ConsumableSheetData> {
        const sheetData = await super.getData(options);
        const item = this.item;
        const canHaveDamageOrHealing = DAMAGE_OR_HEALING_CONSUMABLE_CATEGORIES.has(item.category);
        const canHaveHealing =
            canHaveDamageOrHealing &&
            item.system.category !== "snare" &&
            !!item.system.damage &&
            ["vitality", "void", "untyped"].includes(item.system.damage.type);

        return {
            ...sheetData,
            canHaveDamageOrHealing,
            canHaveHealing,
            categories: sortStringRecord(CONFIG.PF2E.consumableCategories),
            damageTypes: sortStringRecord(CONFIG.PF2E.damageTypes),
            damageKindOptions: [
                { value: "damage", label: "PF2E.DamageLabel" },
                { value: "healing", label: "PF2E.TraitHealing" },
            ],
            materialEffects: createSheetTags(CONFIG.PF2E.materialDamageEffects, item.system.material.effects),
            otherTags: createSheetTags(CONFIG.PF2E.otherConsumableTags, item.system.traits.otherTags),
            stackGroups: this.item.isAmmo ? R.omit(CONFIG.PF2E.stackGroups, ["coins", "gems"]) : null,
        };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        html.querySelector("button[data-action=add-damage]")?.addEventListener("click", () => {
            this.item.update({ "system.damage": { formula: "1d4", type: "untyped", kind: "damage" } });
        });

        html.querySelector("a[data-action=remove-damage]")?.addEventListener("click", () => {
            this.item.update({ "system.damage": null });
        });
    }

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        if (formData["system.stackGroup"] === "") {
            formData["system.stackGroup"] = null;
        }

        return super._updateObject(event, formData);
    }
}

interface ConsumableSheetData extends PhysicalItemSheetData<ConsumablePF2e> {
    canHaveDamageOrHealing: boolean;
    canHaveHealing: boolean;
    categories: Record<ConsumableCategory, string>;
    damageKindOptions: FormSelectOption[];
    damageTypes: Record<DamageType, string>;
    materialEffects: SheetOptions;
    otherTags: SheetOptions;
    stackGroups: Omit<typeof CONFIG.PF2E.stackGroups, "coins" | "gems"> | null;
}

export { ConsumableSheetPF2e };
