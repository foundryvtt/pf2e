import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";
import { OneToThree } from "@module/data.ts";

export class Migration654ActionTypeAndCount extends MigrationBase {
    static override version = 0.654;

    override async updateItem(item: ItemSourcePF2e): Promise<void> {
        if (item.type !== "feat" && item.type !== "action") return;
        const systemData = item.system;
        systemData.actions.value = (Math.min(3, Math.max(Number(systemData.actions.value), 0)) ||
            null) as OneToThree | null;
    }
}
