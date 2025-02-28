import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { EquippedData } from "@item/physical/data.ts";
import { MigrationBase } from "../base.ts";

/** Update physical item usage and equipped to reflect carry types (held, worn, stowed) */
export class Migration936TalismanUsages extends MigrationBase {
    static override version = 0.936;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!itemIsOfType(source, "physical")) return;

        const system: SimplifiedSystemSource = source.system;

        if (system.usage) {
            if (system.usage.value === "affixed-to-metal-weapon") {
                system.usage.value = "affixed-to-a-metal-weapon";
            }

            if (system.usage.value === "affixed-to-melee-weapon") {
                system.usage.value = "affixed-to-a-melee-weapon";
            }
        }
    }
}

type OldEquippedData = EquippedData & {
    value?: boolean;
    "-=value"?: null;
};

type SimplifiedSystemSource = { slug?: string | null; equipped?: OldEquippedData; usage?: { value?: unknown } };
