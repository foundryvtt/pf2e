import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove AE-likes that increase the size of a PC's focus pool. */
export class Migration889RemoveFocusMaxIncreases extends MigrationBase {
    static override version = 0.889;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (
            source.type === "feat" &&
            ["clarity-of-focus", "psi-cantrips-and-amps", "psychic-dedication", "psi-development"].includes(
                source.system.slug ?? "",
            )
        ) {
            return;
        }

        source.system.rules = source.system.rules.filter(
            (r) => !("path" in r && r.path === "system.resources.focus.max"),
        );
    }
}
