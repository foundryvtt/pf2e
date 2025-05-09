import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

export class Migration936WeaponExpend extends MigrationBase {
    static override version = 0.936;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "weapon") return;

        const expendTrait = source.system.traits.value.find((t) => t.match(/^expend-\d$/));
        const expendFromTrait = expendTrait ? Number(expendTrait.replace("expend-", "")) : null;

        // Set expend to a valid value for the range
        const isThrown = source.system.traits.value.includes("thrown");
        const isRanged = !!source.system.range;
        const expend = expendFromTrait ?? source.system.expend;
        source.system.expend = isRanged && !isThrown ? Math.max(1, expend ?? 1) : 0;

        // If there were expend traits, remove them
        if (expendTrait) {
            source.system.traits.value = source.system.traits.value.filter((t) => !t.match(/^expend-\d$/));
        }
    }
}
