import { CreatureTrait } from "@actor/creature/index.ts";
import { Language } from "@actor/creature/types.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import * as R from "remeda";
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
        "half-elf": "aiuvarin",
        "half-orc": "dromaar",
        gnoll: "gnoll", // Keep this one for now despite the language change
        ifrit: "naari",
        tiefling: "nephilim",
    };

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "character" || source.type === "npc") {
            const traits: unknown = source.system.traits;
            if (R.isObject(traits)) {
                if (Array.isArray(traits.value)) {
                    traits.value = traits.value.map((t) => this.#TRAITS_RENAMES[t] ?? t).sort();
                }
                const languages = traits.languages;
                if (R.isObject(languages) && Array.isArray(languages.value)) {
                    languages.value = languages.value.map((l) => this.#LANGUAGE_RENAMES[l] ?? l).sort();
                }
            }
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.system.slug === "bloodline-genie") return;

        source.system = recursiveReplaceString(
            source.system,
            (s) => this.#TRAITS_RENAMES[s] ?? this.#LANGUAGE_RENAMES[s] ?? s,
        );

        const traits: { value?: string[] } = source.system.traits ?? { value: [] };
        traits.value = traits.value?.map((t) => (t === "kholo" ? "gnoll" : t));

        if (source.type === "ancestry") {
            const languages: { value: string[] } = source.system.languages;
            const additionalLanguages: { value: string[] } = source.system.languages;
            languages.value = languages.value.map((l) => (l === "gnoll" ? "kholo" : l));
            languages.value.sort();
            additionalLanguages.value = additionalLanguages.value.map((l) => (l === "gnoll" ? "kholo" : l));
            additionalLanguages.value.sort();
        }
    }
}
