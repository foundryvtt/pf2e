import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Set very low priority orders on AE-likes setting inventor innovation ID. */
export class Migration875SetInnovationIdEarly extends MigrationBase {
    static override version = 0.875;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat" || !["armor-innovation", "weapon-innovation"].includes(source.system.slug ?? "")) {
            return;
        }

        type MaybeAELike = { key?: unknown; path?: unknown };
        const aeLike = source.system.rules.find(
            (r: MaybeAELike) => r.key === "ActiveEffectLike" && r.path === "flags.pf2e.innovationId",
        );
        if (aeLike) aeLike.priority = 5;
    }
}
