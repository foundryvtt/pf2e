import { MigrationBase } from "../base";
import { ItemSourcePF2e } from "@item/data";

/** Change `delimiter`-delimited string traits into arrays of strings */
export class Migration597MakeTraitTraitsArrays extends MigrationBase {
    static override version = 0.597;

    override async updateItem(itemData: ItemSourcePF2e) {
        const traits: { value: unknown } = itemData.data.traits;
        const delimiter = /[;,|]+\s*/;
        const dromedarify = (text: string) => text.slice(0, 1).toLowerCase() + text.slice(1);

        traits.value = (() => {
            if (Array.isArray(traits.value)) {
                return traits.value.flatMap((trait) =>
                    typeof trait === "string" && trait.trim().length > 0 ? dromedarify(trait.trim()) : []
                );
            }
            if (typeof traits.value === "string") {
                return traits.value.split(delimiter).flatMap((trait) => (trait.length > 0 ? dromedarify(trait) : []));
            }
            // What is this???
            return traits.value;
        })();
    }
}
