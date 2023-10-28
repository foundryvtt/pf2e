import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Replace all uses of and references to positive/negative to vitality/void. */
export class Migration865VitalityVoid extends MigrationBase {
    static override version = 0.865;

    #replaceStrings<TObject extends object>(data: TObject): TObject {
        return recursiveReplaceString(data, (s) =>
            s
                // Traits and damage types
                .replace(/^positive$/, "vitality")
                .replace(/^negative$/, "void")
                .replace(/^versatile-positive$/, "versatile-vitality")
                .replace(/^versatile-negative$/, "versatile-void")
                // Inline damage types
                .replace(/\bpositive\]/g, "vitality]")
                .replace(/\bnegative\]/g, "void]")
                .replace(/\[positive\b/g, "[vitality")
                .replace(/\[negative\b/g, "[void")
                // Localization keys
                .replace(/\bRollFlavor\.positive\b/g, "RollFlavor.vitality")
                .replace(/\bRollFlavor\.negative\b/g, "RollFlavor.void")
                .replace(/\bTraitPositive\b/g, "TraitVitality")
                .replace(/\bTraitNegative\b/g, "TraitVoid")
                .replace(/\bTraitVersatilePositive\b/g, "TraitVersatileVitality")
                .replace(/\bTraitVersatileNegative\b/g, "TraitVersatileVoid")
                // ???
                .replace(/\bnegative negative damage\b/, "void damage"),
        );
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
        source.flags = this.#replaceStrings(source.flags);
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
        source.flags = this.#replaceStrings(source.flags);
    }
}
