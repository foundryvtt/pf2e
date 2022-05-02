import { AncestryPF2e, HeritagePF2e, ItemPF2e } from "@item";
import { ItemSheetPF2e } from "@item/sheet/base";
import { HeritageSheetData } from "@item/sheet/data-types";
import { createSheetOptions } from "@module/sheet/helpers";
import { ErrorPF2e } from "@util";

export class HeritageSheetPF2e extends ItemSheetPF2e<HeritagePF2e> {
    static override get defaultOptions(): DocumentSheetOptions {
        return {
            ...super.defaultOptions,
            dragDrop: [{ dropSelector: ".sheet-sidebar" }],
        };
    }

    override async getData(options: Partial<DocumentSheetOptions> = {}): Promise<HeritageSheetData> {
        const sheetData = super.getBaseData(options);
        const ancestry = await (async (): Promise<AncestryPF2e | null> => {
            const item = this.item.data.data.ancestry ? await fromUuid(this.item.data.data.ancestry.uuid) : null;
            return item instanceof AncestryPF2e ? item : null;
        })();

        return {
            ...sheetData,
            ancestry,
            ancestryRefBroken: !!sheetData.data.ancestry && ancestry === null,
            hasSidebar: true,
            hasDetails: false,
            sidebarTemplate: () => "systems/pf2e/templates/items/heritage-sidebar.html",
            rarities: createSheetOptions(CONFIG.PF2E.rarityTraits, { value: [sheetData.data.traits.rarity] }),
            traits: createSheetOptions(CONFIG.PF2E.featTraits, sheetData.data.traits),
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        // Remove ancestry reference
        $html.find('a[data-action="remove-ancestry"]').on("click", () => {
            this.item.update({ "data.ancestry": null });
        });
    }

    override async _onDrop(event: ElementDragEvent): Promise<void> {
        const item = await (async (): Promise<ItemPF2e | null> => {
            try {
                const dataString = event.dataTransfer?.getData("text/plain");
                const dropData = JSON.parse(dataString ?? "");
                return (await ItemPF2e.fromDropData(dropData)) ?? null;
            } catch {
                return null;
            }
        })();
        if (!(item instanceof AncestryPF2e)) {
            throw ErrorPF2e("Invalid item drop on heritage sheet");
        }
        const ancestryReference = { name: item.name, uuid: item.uuid };
        await this.item.update({ "data.ancestry": ancestryReference });
    }
}
