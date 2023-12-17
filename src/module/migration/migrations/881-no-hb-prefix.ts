import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Remove "hb_" prefixes from homebrew element slugs. */
export class Migration881NoHBPrefix extends MigrationBase {
    static override version = 0.881;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        const traits: { value: string[] } | undefined = source.system.traits;
        if (traits?.value && Array.isArray(traits.value)) {
            traits.value = traits.value.filter((t) => typeof t === "string").map((t) => t.replace(/^hb_/, ""));
        }

        if (source.type === "character" && source.system.proficiencies?.attacks) {
            const attacks: Record<string, Maybe<object>> = source.system.proficiencies.attacks;
            for (const [key, value] of Object.entries(attacks)) {
                if (key.includes("hb_")) {
                    attacks[key.replace("hb_", "")] = value;
                    attacks[`-=${key}`] = null;
                }
            }
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (t) => t.replace(/^hb_/, ""));
    }
}
