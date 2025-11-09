import { ItemSheetDataPF2e, ItemSheetOptions, ItemSheetPF2e } from "@item/base/sheet/sheet.ts";
import { Coins, PhysicalItemPF2e } from "@item/physical/index.ts";
import { htmlClosest, htmlQueryAll } from "@util";
import { KitEntryData } from "./data.ts";
import { KitPF2e } from "./document.ts";

class KitSheetPF2e extends ItemSheetPF2e<KitPF2e> {
    static override get defaultOptions(): ItemSheetOptions {
        return Object.assign(super.defaultOptions, { dragDrop: [{ dropSelector: ".tab[data-tab=details]" }] });
    }

    override async getData(options?: Partial<ItemSheetOptions>): Promise<KitSheetData> {
        const items = Object.fromEntries(
            Object.entries(this.item.system.items).map(([key, ref]): [string, KitEntrySheetData] => [
                key,
                { ...ref, fromWorld: ref.uuid.startsWith("Item.") },
            ]),
        );
        return {
            ...(await super.getData(options)),
            priceString: this.item.price.value.toString(),
            items,
        };
    }

    protected override async _onDrop(event: DragEvent): Promise<void> {
        event.preventDefault();
        const dragData = event.dataTransfer?.getData("text/plain");
        const dragItem = JSON.parse(dragData ?? "");
        if (dragItem.type !== "Item") return;
        const item = await fromUuid(dragItem.uuid ?? "");
        if (!(item instanceof PhysicalItemPF2e || item instanceof KitPF2e)) return;

        const containerId = htmlClosest(event.target, "[data-container-id]")?.dataset.containerId;
        const entry = {
            uuid: item.uuid,
            img: item.img,
            quantity: 1,
            name: item.name,
            isContainer: item.type === "backpack" && !containerId,
            items: {},
        };

        let items = this.item.system.items;
        let pathPrefix = "system.items";
        if (containerId) {
            pathPrefix = `${pathPrefix}.${containerId}.items`;
            items = items[containerId]?.items ?? {};
        }
        let id: string;
        do {
            id = fu.randomID(5);
        } while (items[id]);
        await this.item.update({ [`${pathPrefix}.${id}`]: entry });
    }

    async removeItem(event: PointerEvent): Promise<KitPF2e | null> {
        const target = htmlClosest(event.currentTarget ?? null, "li");
        const index = target?.dataset.index;
        if (!index) return this.item;

        const containerId = target.closest<HTMLElement>("[data-container-id]")?.dataset.containerId;
        const path =
            containerId && containerId !== index ? `${containerId}.items.-=${index}` : `-=${target.dataset.index}`;
        const update = await this.item.update({ [`system.items.${path}`]: null });
        return update ?? null;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];
        for (const link of htmlQueryAll(html, "[data-action=remove]")) {
            link.addEventListener("click", (event) => {
                this.removeItem(event);
            });
        }
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Convert price from a string to an actual object
        const priceString = String(formData["system.price.value"] ?? "").trim();
        formData["system.price.value"] = Coins.fromString(priceString).toObject();
        return super._updateObject(event, formData);
    }
}

interface KitSheetData extends ItemSheetDataPF2e<KitPF2e> {
    priceString: string;
    items: Record<string, KitEntrySheetData>;
}

interface KitEntrySheetData extends KitEntryData {
    fromWorld: boolean;
}

export { KitSheetPF2e };
