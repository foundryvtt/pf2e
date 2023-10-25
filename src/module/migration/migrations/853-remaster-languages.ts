import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";
import { recursiveReplaceString } from "@util";

/** Change languages renamed in Rage of Elements  */
export class Migration853RemasterLanguages extends MigrationBase {
    static override version = 0.853;

    #OLD_TO_NEW_LANGUAGES = new Map([
        ["aquan", "thalassic"],
        ["auran", "sussuran"],
        ["ignan", "pyric"],
        ["sylvan", "fey"],
        ["terran", "petran"],
    ]);

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        const languages: { value?: string[] } = source.system.traits?.languages ?? {};
        if (languages?.value) {
            languages.value = languages.value.map((l) => this.#OLD_TO_NEW_LANGUAGES.get(l) ?? l).sort();
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (s) => this.#OLD_TO_NEW_LANGUAGES.get(s) ?? s);

        if (source.type === "ancestry" && Array.isArray(source.system.additionalLanguages?.value)) {
            source.system.additionalLanguages.value.sort();
        }
    }
}
