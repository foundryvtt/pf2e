import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";

export class Migration623NumifyPotencyRunes extends MigrationBase {
    static override version = 0.623;

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (!(itemData.type === "weapon" || itemData.type === "armor")) return;

        const potencyRune: { value: number | null } | undefined = itemData.system.potencyRune;
        if (potencyRune) {
            potencyRune.value = Number(itemData.system.potencyRune.value) || null;
        } else {
            itemData.system.potencyRune = { value: null };
        }
    }
}
