import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { setHasElement } from "@util";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

const AMMO_STACK_GROUPS = new Set([
    "arrows",
    "blowgunDarts",
    "bolts",
    "rounds5",
    "rounds10",
    "slingBullets",
    "sprayPellets",
    "woodenTaws",
] as const);

/** Limit `stackGroup` property to consumables and treasure */
export class Migration906LimitStackGroup extends MigrationBase {
    static override version = 0.906;

    override async updateItem(source: MaybeWithToBeDeletedStackGroup): Promise<void> {
        const toDelete = !itemIsOfType(source, "physical") || !itemIsOfType(source, "consumable", "treasure");
        if (toDelete && "stackGroup" in source.system) {
            source.system["-=stackGroup"] = null;
        } else if (source.type === "consumable") {
            const category =
                "consumableType" in source.system && R.isPlainObject(source.system.consumableType)
                    ? String(source.system.consumableType.value)
                    : source.system.category;
            source.system.stackGroup =
                category === "ammo" && setHasElement(AMMO_STACK_GROUPS, source.system.stackGroup)
                    ? source.system.stackGroup
                    : null;
        } else if (source.type === "treasure") {
            source.system.stackGroup = ["coins", "gems"].includes(source.system.stackGroup ?? "")
                ? source.system.stackGroup
                : null;
        }
        if (!("game" in globalThis) && "stackGroup" in source.system && !source.system.stackGroup) {
            source.system["-=stackGroup"] = null;
        }
    }
}

type MaybeWithToBeDeletedStackGroup = ItemSourcePF2e & {
    system: {
        stackGroup?: SetElement<typeof AMMO_STACK_GROUPS> | "coins" | "gems" | null;
        "-=stackGroup"?: null;
    };
};
