import { MigrationBase } from "../base";
import { ItemSourcePF2e } from "@item/data";

export class Migration623NumifyPotencyRunes extends MigrationBase {
    static override version = 0.623;

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (!(itemData.type === "weapon" || itemData.type === "armor")) return;

        const potencyRune: { value: number | null } | undefined = itemData.data.potencyRune;
        if (potencyRune) {
            potencyRune.value = Number(itemData.data.potencyRune.value) || null;
        } else {
            itemData.data.potencyRune = { value: null };
        }
    }
}
