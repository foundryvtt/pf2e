import { ActorSourcePF2e } from "@actor/data";
import { ConsumableSource, EquipmentSource, ItemSourcePF2e } from "@item/data";
import { KitEntryData } from "@item/kit/data";
import { ErrorPF2e } from "@util";
import { MigrationBase } from "../base";

/** Convert rations to a consumable with seven uses */
export class Migration684RationsToConsumable extends MigrationBase {
    static override version = 0.684;

    private rationsSourceId = "Compendium.pf2e.equipment-srd.L9ZV076913otGtiB";

    private rationsPromise = fromUuid(this.rationsSourceId);

    private isConsumable(obj: { type?: unknown; data?: unknown } | null): obj is ConsumableSource {
        return !!obj && obj.type === "consumable" && obj.data instanceof Object;
    }

    private isOldRations(itemSource: ItemSourcePF2e | null): itemSource is EquipmentSource {
        return itemSource?.type === "equipment" && itemSource.flags.core?.sourceId === this.rationsSourceId;
    }

    /** Get all references to the Rations item in a kit */
    private getRationRefs(itemRefs: Record<string, KitEntryData>): RationEntryData[] {
        return Object.values(itemRefs).reduce((rationRefs: RationEntryData[], itemRef: KitEntryData) => {
            if (itemRef.isContainer && itemRef.items) {
                rationRefs.push(...this.getRationRefs(itemRef.items));
            } else if (itemRef.pack === "pf2e.equipment-srd" && itemRef.id === "L9ZV076913otGtiB") {
                rationRefs.push(itemRef as RationEntryData);
            }
            return rationRefs;
        }, []);
    }

    /** Swap "equipment" rations for new consumable */
    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        const oldRations = actorSource.items.filter((item): item is EquipmentSource => this.isOldRations(item));
        const rations = (await this.rationsPromise)?.toObject();
        if (!(rations && this.isConsumable(rations))) {
            throw ErrorPF2e("Unexpected error acquiring compendium item");
        }

        for (const oldRation of oldRations) {
            const newRation = deepClone(rations);
            newRation.folder = oldRation.folder;
            newRation.sort = oldRation.sort;
            newRation.data.containerId.value = oldRation.data.containerId.value;
            newRation.data.quantity.value = Math.ceil(oldRation.data.quantity.value / 7);
            actorSource.items.findSplice((item) => item === oldRation, newRation);
        }
    }

    /** Lower the quantity of rations contained in kits */
    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type !== "kit") return;

        const rationRefs = this.getRationRefs(itemSource.data.items);
        for (const rationRef of rationRefs) {
            rationRef.quantity = Math.ceil(rationRef.quantity / 7);
        }
    }
}

interface RationEntryData extends KitEntryData {
    id: "L9ZV076913otGtiB";
    pack: "pf2e.equipment-srd";
}
