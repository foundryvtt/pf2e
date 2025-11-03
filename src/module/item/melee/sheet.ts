import type { DocumentSheetV1Options } from "@client/appv1/api/document-sheet-v1.d.mts";
import { ItemSheetDataPF2e, ItemSheetPF2e } from "@item/base/sheet/sheet.ts";
import { EffectAreaShape } from "@item/types.ts";
import { EFFECT_AREA_SHAPES } from "@item/values.ts";
import { SheetOptions, createSheetOptions } from "@module/sheet/helpers.ts";
import { damageCategoriesUnique } from "@scripts/config/damage.ts";
import type { DamageCategoryUnique } from "@system/damage/types.ts";
import { htmlClosest, htmlQueryAll } from "@util";
import * as R from "remeda";
import type { MeleePF2e } from "./index.ts";
import { NPC_ATTACK_ACTIONS } from "./values.ts";

export class MeleeSheetPF2e extends ItemSheetPF2e<MeleePF2e> {
    override async getData(options?: Partial<DocumentSheetV1Options>): Promise<MeleeSheetData> {
        const sheetData = await super.getData(options);
        const item = this.item;
        const isCheck = item.system.action === "strike";

        // In case of weak/elite adjustments, display source values for attack modifier and damage formulas
        const itemSource = this.item._source;
        for (const key of Object.keys(sheetData.data.damageRolls)) {
            sheetData.data.damageRolls[key].damage = itemSource.system.damageRolls[key].damage;
        }

        return {
            ...sheetData,
            attackActions: R.mapValues(NPC_ATTACK_ACTIONS, (a) => game.i18n.localize(a)),
            areaShapes: R.mapToObj(EFFECT_AREA_SHAPES, (s) => [s, `PF2E.Area.Shape.${s}`]),
            damageTypes: CONFIG.PF2E.damageTypes,
            damageCategories: damageCategoriesUnique,
            attackEffects: createSheetOptions(this.getAttackEffectOptions(), item.system.attackEffects),
            modifierOrSave: {
                label: game.i18n.localize(`PF2E.Actor.NPC.BonusLabel.${isCheck ? "modifier" : "save"}`),
                value: item.system.bonus.value + (isCheck ? 0 : 10),
            },
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

        // Subtract 10 from the dc to get the modifier if its area/auto fire
        if (this.item.system.action !== "strike" && typeof formData["system.bonus.value"] === "number") {
            formData["system.bonus.value"] -= 10;
        }

        // Max has priority over increment in the document, so if we're adding an increment, remove the max range
        const incrementAdded =
            formData["system.range.increment"] &&
            formData["system.range.increment"] !== this.item.system.range?.increment;
        if (incrementAdded && formData["system.range.max"]) {
            formData["system.range.max"] = null;
        }

        return super._updateObject(event, formData);
    }
}

interface MeleeSheetData extends ItemSheetDataPF2e<MeleePF2e> {
    attackActions: Record<string, string>;
    areaShapes: Record<EffectAreaShape, string>;
    damageTypes: ConfigPF2e["PF2E"]["damageTypes"];
    damageCategories: Record<DamageCategoryUnique, string>;
    attackEffects: SheetOptions;
    /** The statistic value to display, based on whether it is a check or a save */
    modifierOrSave: {
        label: string;
        value: number;
    };
}
