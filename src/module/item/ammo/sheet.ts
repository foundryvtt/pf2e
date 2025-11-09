import { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/sheet.ts";
import { HTMLTagifyTagsElement } from "@system/html-elements/tagify-tags.ts";
import { htmlQuery } from "@util";
import { tagify } from "@util/tags.ts";
import * as R from "remeda";
import { AmmoPF2e } from "./document.ts";

class AmmoSheetPF2e extends PhysicalItemSheetPF2e<AmmoPF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<AmmoSheetData> {
        const sheetData = await super.getData(options);
        const item = this.item;

        // Get all choices
        const ammoChoices = R.pipe(
            CONFIG.PF2E.ammoTypes,
            R.entries(),
            R.map(([key, data]) => ({
                value: key,
                label: game.i18n.localize(data.label),
                group: data.weapon ? "Specific Weapon" : undefined,
            })),
            R.sortBy((o) => o.label),
        );

        const ammoTypeData = item.system.baseItem ? CONFIG.PF2E.ammoTypes[item.system.baseItem] : null;

        return {
            ...sheetData,
            canHaveUses: !!ammoTypeData?.magazine,
            isSpecialAmmo: !!item.system.craftableAs,
            ammoTypes: [{ label: "", value: "" }, ...ammoChoices],
            // Disable changing bulk for ammunition if bulk is already set in the base ammo type
            bulkDisabled: sheetData.bulkDisabled || !!item.system.stackGroup,
        };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        const specialAmmoCheckbox = html.querySelector<HTMLInputElement>("input[data-action=set-special-ammo]");
        specialAmmoCheckbox?.addEventListener("change", (event) => {
            event.stopPropagation();
            if (specialAmmoCheckbox.checked) {
                item.update({ system: { craftableAs: [], baseItem: null } });
            } else {
                const baseItem = item.system.baseItem ?? "arrows";
                item.update({ system: { craftableAs: null, baseItem } });
            }
        });

        const getInput = (name: string): HTMLTagifyTagsElement | null =>
            htmlQuery<HTMLTagifyTagsElement>(html, `tagify-tags[name="${name}"]`);

        const item = this.item;
        if (item.system.craftableAs !== null) {
            const validAmmoTypes = R.pickBy(CONFIG.PF2E.ammoTypes, (a) => !a.magazine && !a.parent);
            tagify(getInput("system.craftableAs"), { whitelist: validAmmoTypes });
        }
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        formData["system.baseItem"] ||= null;
        return super._updateObject(event, formData);
    }
}

interface AmmoSheetData extends PhysicalItemSheetData<AmmoPF2e> {
    canHaveUses: boolean;
    isSpecialAmmo: boolean;
    ammoTypes: foundry.applications.fields.FormSelectOption[];
}

export { AmmoSheetPF2e };
