import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { FEAT_CATEGORIES } from "@item/feat/values.ts";
import { setHasElement } from "@util";
import { MigrationBase } from "../base.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";

/** Record the level each feat is taken by PCs. */
export class Migration876FeatLevelTaken extends MigrationBase {
    static override version = 0.876;

    override async updateItem(source: ItemSourcePF2e, actorSource?: ActorSourcePF2e): Promise<void> {
        if (source.type !== "feat" || !setHasElement(FEAT_CATEGORIES, source.system.category)) {
            return;
        }

        const location = source.system.location ?? "";
        const background = actorSource?.items.find((i) => i.type === "background");
        if (location === background?._id) {
            // Background-granted traits
            source.system.level.taken = 1;
        } else {
            // All others
            const levelString = /^.+-(\d+)$/.exec(location)?.[1] ?? "NaN";
            if (levelString) {
                source.system.level.taken = Number(levelString) || undefined;
            }
        }

        // Take the opportunity to normalize categories-traits combinations
        const { category, traits } = source.system;
        if (category === "skill" && !traits.value.includes("skill")) {
            traits.value.push("skill");
        } else if (category === "general" && !traits.value.includes("general")) {
            traits.value.push("general");
        }
        traits.value.sort();
    }
}
