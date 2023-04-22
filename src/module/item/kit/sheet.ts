import { CoinsPF2e, PhysicalItemPF2e } from "@item/physical/index.ts";
import { ItemSheetDataPF2e } from "@item/sheet/data-types.ts";
import { htmlClosest, htmlQueryAll } from "@util";
import { ItemSheetPF2e } from "../sheet/base.ts";
import { KitEntryData } from "./data.ts";
import { KitPF2e } from "./document.ts";

class KitSheetPF2e extends ItemSheetPF2e<KitPF2e> {
    static override get defaultOptions(): DocumentSheetOptions {
        return {
            ...super.defaultOptions,
            scrollY: [".item-details"],
            dragDrop: [{ dropSelector: ".item-details" }],
        };
    }

    override async getData(options?: Partial<DocumentSheetOptions>): Promise<KitSheetData> {
        const items = Object.fromEntries(
            Object.entries(this.item.system.items).map(([key, ref]): [string, KitEntrySheetData] => [
                key,
                { ...ref, fromWorld: ref.uuid.startsWith("Item.") },
            ])
        );

        return {
            ...(await super.getData(options)),
            priceString: this.item.price.value,
            items,
            hasSidebar: true,
            hasDetails: true,
        };
    }

    protected override async _onDrop(event: ElementDragEvent): Promise<void> {
        event.preventDefault();
        const dragData = event.dataTransfer?.getData("text/plain");
        const dragItem = JSON.parse(dragData ?? "");
        const containerId =
            event.target.dataset.containerId ??
            event.target.closest<HTMLElement>("[data-container-id]")?.dataset.containerId;

        if (dragItem.type !== "Item") return;

        const item = await fromUuid(dragItem.uuid ?? "");
        if (!(item instanceof PhysicalItemPF2e || item instanceof KitPF2e)) {
            return;
        }

        const entry = {
            uuid: item.uuid,
            img: item.img,
            quantity: 1,
            name: item.name,
            isContainer: item.type === "backpack" && !containerId,
            items: {},
        };

        let { items } = this.item.system;
        let pathPrefix = "system.items";

        if (containerId !== undefined) {
            pathPrefix = `${pathPrefix}.${containerId}.items`;
            items = items[containerId]?.items ?? {};
        }
        let id: string;
        do {
            id = randomID(5);
        } while (items[id]);

        await this.item.update({ [`${pathPrefix}.${id}`]: entry });
    }

    async removeItem(event: MouseEvent): Promise<KitPF2e> {
        const target = htmlClosest(event.currentTarget ?? null, "li");
        const index = target?.dataset.index;
        if (!index) return this.item;

        const containerId = target.closest<HTMLElement>("[data-container-id]")?.dataset.containerId;
        const path = containerId ? `${containerId}.items.-=${index}` : `-=${target.dataset.index}`;

        return this.item.update({ [`system.items.${path}`]: null });
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0]!;

        for (const link of htmlQueryAll(html, "[data-action=remove]")) {
            link.addEventListener("click", (event) => {
                this.removeItem(event);
            });
        }
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Convert price from a string to an actual object
        if (formData["system.price.value"]) {
            formData["system.price.value"] = CoinsPF2e.fromString(String(formData["system.price.value"]));
        }

        return super._updateObject(event, formData);
    }
}

interface KitSheetData extends ItemSheetDataPF2e<KitPF2e> {
    priceString: CoinsPF2e;
    items: Record<string, KitEntrySheetData>;
}

interface KitEntrySheetData extends KitEntryData {
    fromWorld: boolean;
}

export { KitSheetPF2e };
