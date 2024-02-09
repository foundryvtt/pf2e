import { ActorSourcePF2e } from "@actor/data/index.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove the extra `base` subproperty of labeled values on NPCs */
export class Migration672RemoveNPCBaseProperties extends MigrationBase {
    static override version = 0.672;

    #removeBase(property: PropertyWithBase, replace: "value" | "max" = "value"): void {
        property[replace] = Number(property[replace]) || 0;
        if (typeof property.base === "number") {
            property[replace] = property.base;
            property["-=base"] = null;
        }
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "npc") return;

        const attributes: OldNPCAttributes = source.system.attributes;
        const { ac, hp, perception } = attributes;
        if (ac) this.#removeBase(ac);
        if (hp) this.#removeBase(hp, "max");
        if (perception) this.#removeBase(perception);

        const { saves } = source.system;
        for (const saveType of SAVE_TYPES) {
            this.#removeBase(saves[saveType]);
        }
    }

    override async updateItem(source: ItemSourcePF2e, actorSource?: ActorSourcePF2e): Promise<void> {
        if (actorSource?.type === "npc" && source.type === "lore") {
            this.#removeBase(source.system.mod);
        }
    }
}

interface PropertyWithBase {
    value: number;
    max?: number;
    base?: number;
    "-=base"?: null;
}

interface OldNPCAttributes {
    ac?: PropertyWithBase;
    hp?: PropertyWithBase;
    perception?: PropertyWithBase;
}
