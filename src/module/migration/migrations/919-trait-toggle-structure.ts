import { ItemSourcePF2e } from "@item/base/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Adjust weapon trait toggles to use "selected" instead of "selection" */
export class Migration919WeaponToggleStructure extends MigrationBase {
    static override version = 0.919;

    #updateToggle(toggle: Maybe<TraitToggleWithDeletion>): void {
        if (R.isPlainObject(toggle) && "selection" in toggle) {
            toggle.selected = toggle.selection ?? null;
            toggle["-=selection"] = null;
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "weapon" && source.system.traits.toggles) {
            for (const trait of ["modular", "versatile"] as const) {
                this.#updateToggle(source.system.traits.toggles[trait]);
            }
        } else if (source.type === "shield" && source.system.traits.integrated) {
            this.#updateToggle(source.system.traits.integrated?.versatile);
        }
    }
}

interface TraitToggleWithDeletion {
    selected: unknown;
    selection?: unknown;
    "-=selection"?: null;
}
