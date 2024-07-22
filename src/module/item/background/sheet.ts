import { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import { SheetOptions, createSheetOptions } from "@module/sheet/helpers.ts";
import { htmlQuery, htmlQueryAll } from "@util";
import { ABCSheetData, ABCSheetPF2e } from "../abc/sheet.ts";
import { BackgroundSource } from "./data.ts";
import type { BackgroundPF2e } from "./document.ts";

export class BackgroundSheetPF2e extends ABCSheetPF2e<BackgroundPF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<BackgroundSheetData> {
        const data = await super.getData(options);
        const itemData = data.item;

        return {
            ...data,
            trainedSkills: createSheetOptions(CONFIG.PF2E.skills, itemData.system.trainedSkills),
            selectedBoosts: Object.fromEntries(
                Object.entries(itemData.system.boosts).map(([k, b]) => [k, this.getLocalizedAbilities(b)]),
            ),
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        htmlQuery(html, "a[data-action=add-lore]")?.addEventListener("click", () => {
            const lore = [...this.item.system.trainedSkills.lore, ""];
            this.item.update({ system: { trainedSkills: { lore } } });
        });

        for (const deleteLoreButton of htmlQueryAll(html, "a[data-action=delete-lore]")) {
            const idx = Number(deleteLoreButton.dataset.index);
            deleteLoreButton.addEventListener("click", () => {
                const lore = [...this.item.system.trainedSkills.lore];
                lore.splice(idx, 1);
                this.item.update({ system: { trainedSkills: { lore } } });
            });
        }
    }

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const data = fu.expandObject<DeepPartial<BackgroundSource>>(formData);
        if (data.system?.trainedSkills?.lore) {
            data.system.trainedSkills.lore = Object.values(data.system.trainedSkills.lore);
        }

        return super._updateObject(event, fu.flattenObject(data));
    }
}

interface BackgroundSheetData extends ABCSheetData<BackgroundPF2e> {
    trainedSkills: SheetOptions;
    selectedBoosts: Record<string, Record<string, string>>;
}
