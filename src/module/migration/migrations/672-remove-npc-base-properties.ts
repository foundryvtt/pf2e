import { ActorSourcePF2e, SAVE_TYPES } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Remove the extra `base` subproperty of labeled values on NPCs */
export class Migration672RemoveNPCBaseProperties extends MigrationBase {
    static override version = 0.672;

    private removeBase(property: PropertyWithBase, replace: "value" | "max" = "value"): void {
        property[replace] = Number(property[replace]) || 0;
        if (typeof property.base === "number") {
            property[replace] = property.base;
            "game" in globalThis ? (property["-=base?"] = null) : delete property.base;
        }
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type !== "npc") return;

        const { ac, hp, perception } = actorSource.data.attributes;
        this.removeBase(ac);
        this.removeBase(hp, "max");
        this.removeBase(perception);

        const { saves } = actorSource.data;
        for (const saveType of SAVE_TYPES) {
            this.removeBase(saves[saveType]);
        }
    }

    override async updateItem(itemSource: ItemSourcePF2e, actorSource?: ActorSourcePF2e): Promise<void> {
        if (!(actorSource?.type === "npc" && itemSource.type === "lore")) return;
        this.removeBase(itemSource.data.mod);
    }
}

interface PropertyWithBase {
    value: number;
    max?: number;
    base?: number;
    "-=base?"?: null;
}
