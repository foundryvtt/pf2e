import { ActorSourcePF2e } from "@actor/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove PC-only items from non-PCs */
export class Migration671NoPCItemsOnNonPCs extends MigrationBase {
    static override version = 0.671;

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type === "character") return;

        const pcOnlyTypes = ["ancestry", "background", "class", "feat"];
        const forbiddenItems = actorSource.items.filter((item) => pcOnlyTypes.includes(item.type));
        for (const forbiddenItem of forbiddenItems) {
            const index = actorSource.items.findIndex((item) => item === forbiddenItem);
            if (index !== -1) actorSource.items.splice(index, 1);
        }
    }
}
