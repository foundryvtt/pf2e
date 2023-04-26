import { ItemSourcePF2e } from "@item/data/index.ts";
import { KitEntryData } from "@item/kit/data.ts";
import { MigrationBase } from "../base.ts";

/** Convert kit and ABC item pack/id references to UUIDs */
export class Migration785ABCKitItemUUIDs extends MigrationBase {
    static override version = 0.785;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        switch (source.type) {
            case "ancestry":
            case "background":
            case "class":
            case "kit": {
                this.#convertToUUIDs(Object.values(source.system.items));
            }
        }
    }

    #convertToUUIDs(references: ItemReferenceData[]): void {
        for (const reference of references) {
            if (reference.id && reference.pack) {
                reference.uuid = `Compendium.${reference.pack}.${reference.id}`;
            } else if (reference.id) {
                reference.uuid = `Item.${reference.id}`;
            }

            delete reference.id;
            delete reference.pack;
            reference["-=id"] = null;
            reference["-=pack"] = null;

            if (reference.items) {
                this.#convertToUUIDs(Object.values(reference.items));
            }
        }
    }
}

interface ItemReferenceData {
    uuid?: string;
    pack?: string;
    "-=pack"?: null;
    id?: string;
    "-=id"?: null;
    // Applicable to kits
    items?: Record<string, KitEntryData & ItemReferenceData>;
}
