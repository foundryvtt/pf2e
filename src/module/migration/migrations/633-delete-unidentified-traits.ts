import { ItemSourcePF2e } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { MeleeSystemSource } from "@item/melee/data";
import { IdentificationData, MystifiedData } from "@item/physical/data";
import { MigrationBase } from "../base";

/** OK, let's not store mystified traits. */
export class Migration633DeleteUnidentifiedTraits extends MigrationBase {
    static override version = 0.633;

    override async updateItem(itemData: ItemDataWithIdentification): Promise<void> {
        // This definitely shouldn't be here
        if (itemData.type === "melee") {
            const systemData: MeleeWithIdentification = itemData.system;
            if (systemData.identification) {
                if ("game" in globalThis) {
                    itemData["system.-=identification"] = null;
                } else {
                    delete systemData.identification;
                }
            }
        }

        if (!isPhysicalData(itemData)) return;

        const unidentifiedDataData: UnidentifiedWithTraits = itemData.system.identification?.unidentified?.data;
        if (unidentifiedDataData?.traits) {
            if ("game" in globalThis) {
                itemData["system.identification.unidentified.data.-=traits"] = null;
            } else {
                delete unidentifiedDataData.traits;
            }
        }
    }
}

type ItemDataWithIdentification = ItemSourcePF2e & {
    "system.-=identification"?: null;
    "system.identification.unidentified.data.-=traits"?: null;
};

type UnidentifiedWithTraits = MystifiedData["data"] & {
    traits?: unknown;
};

interface MeleeWithIdentification extends MeleeSystemSource {
    identification?: IdentificationData;
}
