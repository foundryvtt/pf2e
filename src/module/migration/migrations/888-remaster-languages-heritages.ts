import { Language } from "@actor/creature/data.ts";
import { CreatureTrait } from "@actor/creature/index.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { isObject, recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Convert weapons with the "crossbow" tag to the PC1 crossbow group */
export class Migration888RemasterLanguagesHeritages extends MigrationBase {
    static override version = 0.888;

    #LANGUAGE_RENAMES: Record<string, Language | undefined> = {
        abyssal: "chthonian",
        celestial: "empyrean",
        gnoll: "kholo",
        infernal: "diabolic",
    };

    #TRAITS_RENAMES: Record<string, CreatureTrait | undefined> = {
        aasimar: "nephilim",
        ifrit: "naari",
        tiefling: "nephilim",
    };

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "character" || source.type === "npc") {
            const traits: { value: string[]; languages: { value: string[] } } = source.system.traits;
            traits.value = traits.value.map((t) => this.#TRAITS_RENAMES[t] ?? t).sort();

            const { languages } = traits;
            if (isObject(languages) && Array.isArray(languages.value)) {
                languages.value = languages.value.map((l) => this.#LANGUAGE_RENAMES[l] ?? l).sort();
            }
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(
            source.system,
            (s) => this.#LANGUAGE_RENAMES[s] ?? this.#TRAITS_RENAMES[s] ?? s,
        );

        if (source.type === "ancestry" && Array.isArray(source.system.additionalLanguages?.value)) {
            source.system.additionalLanguages.value.sort();
        }
    }
}
