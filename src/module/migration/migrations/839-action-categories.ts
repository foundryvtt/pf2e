import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ActionItemSource, ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** actionCategory changed from a value object to just a string */
export class Migration839ActionCategories extends MigrationBase {
    static override version = 0.839;

    override async updateItem(source: ItemSourcePF2e, actorSource?: ActorSourcePF2e): Promise<void> {
        if (source.type !== "action") return;

        // Move from actionCategory to category, but also make it null it has a non-npc actor
        const system: ActionItemSystemMaybeOld = source.system;
        if (system.actionCategory) {
            const npcCategories = ["offensive", "defensive", "interaction"];
            const oldValue = (system.actionCategory.value || null) as ActionItemSource["system"]["category"];
            const mustBeNull =
                oldValue && npcCategories.includes(oldValue) && actorSource && actorSource.type !== "npc";
            system.category = mustBeNull ? null : oldValue;
            delete system.actionCategory;
            system["-=actionCategory"] = null;
        }
    }
}

type ActionItemSystemMaybeOld = ActionItemSource["system"] & {
    actionCategory?: { value: string };
    "-=actionCategory"?: null;
};
