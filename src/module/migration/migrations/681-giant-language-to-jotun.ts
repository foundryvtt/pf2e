import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Replace the "Giant" language with "Jotun" */
export class Migration681GiantLanguageToJotun extends MigrationBase {
    static override version = 0.681;

    #replaceGiant(languages: string[]): void {
        const giantIndex = languages.indexOf("giant");
        if (giantIndex !== -1) languages.splice(giantIndex, 1, "jotun");
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (!(source.type === "character" || source.type === "npc")) return;
        const traits: unknown = source.system.traits;
        if (R.isObject(traits) && R.isObject(traits.languages) && Array.isArray(traits.languages.value)) {
            this.#replaceGiant(traits.languages.value);
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "ancestry") {
            this.#replaceGiant(source.system.additionalLanguages.value);
        }
    }
}
