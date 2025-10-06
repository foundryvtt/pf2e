import type { FormSelectOption } from "@client/applications/forms/fields.d.mts";
import { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/index.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import { DamageType } from "@system/damage/index.ts";
import { HTMLTagifyTagsElement } from "@system/html-elements/tagify-tags.ts";
import { htmlQuery, sortStringRecord } from "@util";
import { tagify } from "@util/tags.ts";
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
        const embeddedSpell = item.actor ? item.embeddedSpell : null;
        const shouldHaveSpell = !!embeddedSpell || ["scroll", "wand"].includes(item.system.category);

        // Get all choices, excluding the weapon category
        const ammoChoices = R.pipe(
            CONFIG.PF2E.ammoTypes,
            R.omitBy((value) => value.category === "weapon"),
            R.entries(),
            R.map(([key, data]) => ({
                value: key,
                label: game.i18n.localize(data.label),
                group: data.weapon ? "Specific Weapon" : undefined,
            })),
            R.sortBy((o) => o.label),
        );

        return {
            ...sheetData,
            isSpecialAmmo: !!item.system.ammo?.categories,
            ammoTypes: [{ label: "", value: "" }, ...ammoChoices],
            canHaveDamageOrHealing,
            canHaveHealing,
            canHaveUses: !item.isAmmo || item.system.ammo?.behavior === "magazine",
            categories: sortStringRecord(CONFIG.PF2E.consumableCategories),
            damageTypes: sortStringRecord(CONFIG.PF2E.damageTypes),
            damageKindOptions: [
                { value: "damage", label: "PF2E.DamageLabel" },
                { value: "healing", label: "PF2E.TraitHealing" },
            ],
            materialEffects: createSheetTags(CONFIG.PF2E.materialDamageEffects, item.system.material.effects),
            otherTags: createSheetTags(CONFIG.PF2E.otherConsumableTags, item.system.traits.otherTags),
            embeddedSpell: shouldHaveSpell
                ? {
                      uuid: embeddedSpell?.uuid ?? null,
                      img: embeddedSpell?.img,
                      name: embeddedSpell?.name,
                      rank: embeddedSpell?.rank,
                  }
                : null,
            // Disable changing bulk for ammunition if bulk is already set in the base ammo type
            bulkDisabled: sheetData.bulkDisabled || !!(item.isAmmo && item.system.stackGroup),
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

        const specialAmmoCheckbox = html.querySelector<HTMLInputElement>("input[data-action=set-special-ammo]");
        specialAmmoCheckbox?.addEventListener("change", (event) => {
            event.stopPropagation();
            if (specialAmmoCheckbox.checked) {
                this.item.update({ "system.ammo": { categories: [], baseType: null } });
            } else {
                const baseType = this.item.system.ammo?.baseType ?? "arrows";
                this.item.update({ "system.ammo": { categories: null, baseType } });
            }
        });

        const getInput = (name: string): HTMLTagifyTagsElement | null =>
            htmlQuery<HTMLTagifyTagsElement>(html, `tagify-tags[name="${name}"]`);

        const ammoData = this.item.system.ammo;
        if (ammoData?.categories !== null) {
            const validAmmoCategories = ammoData?.categories.length
                ? R.pickBy(CONFIG.PF2E.ammoCategories, (a) => a.behavior === ammoData.behavior)
                : CONFIG.PF2E.ammoCategories;
            tagify(getInput("system.ammo.categories"), { whitelist: validAmmoCategories });
        }
    }
}

interface ConsumableSheetData extends PhysicalItemSheetData<ConsumablePF2e> {
    canHaveDamageOrHealing: boolean;
    canHaveHealing: boolean;
    canHaveUses: boolean;
    categories: Record<ConsumableCategory, string>;
    isSpecialAmmo: boolean;
    ammoTypes: foundry.applications.fields.FormSelectOption[];
    damageKindOptions: FormSelectOption[];
    damageTypes: Record<DamageType, string>;
    materialEffects: SheetOptions;
    otherTags: SheetOptions;
    embeddedSpell: {
        /** The embedded spell uuid, or null if this item *should* have a spell but doesn't */
        uuid: string | null;
        img?: string;
        name?: string;
        rank?: number;
    } | null;
}

export { ConsumableSheetPF2e };
