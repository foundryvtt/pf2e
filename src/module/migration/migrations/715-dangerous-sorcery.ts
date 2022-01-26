import { ItemSourcePF2e } from "@item/data";
import { sluggify } from "@util";
import { MigrationBase } from "../base";

export class Migration715DangerousSorcery extends MigrationBase {
    static override version = 0.715;

    private dangerousSorcery = {
        key: "FlatModifier",
        phase: "afterDerived",
        predicate: {
            all: ["item:spell-slot", "item:duration:0", "damaging-effect"],
        },
        selector: "spell-damage",
        value: "@spell.level",
    };

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        const slug = source.data.slug ?? sluggify(source.name);
        if (slug === "dangerous-sorcery" && !source.data.rules.length) {
            source.data.rules = [this.dangerousSorcery];
        }
    }
}
