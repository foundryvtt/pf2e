import { LANGUAGES } from "@actor/creature/values.ts";
import { ActorSourcePF2e, CharacterSource } from "@actor/data/index.ts";
import { FeatSource, ItemSourcePF2e } from "@item/base/data/index.ts";
import { AELikeSchema, AELikeSource } from "@module/rules/rule-element/ae-like.ts";
import * as R from "remeda";
import { Migration914MovePerceptionSenses } from "./914-move-perception-senses.ts";

/** Move languages from traits to details. */
export class Migration915MoveLanguages extends Migration914MovePerceptionSenses {
    static override version = 0.915;

    #allLanguages: Set<string> = new Set("game" in globalThis ? Object.keys(CONFIG.PF2E.languages) : LANGUAGES);

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "character" || source.type === "npc") {
            const system: WithMisplacedLanguages = source.system;
            system.details.languages ??= { value: [], details: "" };
            if (
                R.isObject(system.traits) &&
                R.isObject(system.traits.languages) &&
                Array.isArray(system.traits.languages.value)
            ) {
                system.details.languages = {
                    value: system.traits.languages.value.filter((l) => this.#allLanguages.has(l)),
                };
                if (typeof system.traits.languages.custom === "string") {
                    system.details.languages.details ||= system.traits.languages.custom
                        .toLowerCase()
                        .replace("speak any languages", "speak any language");
                }
            }

            if (source.type === "character" && "traits" in system) {
                this.#deduplicateWildsong(source);
                system["-=traits"] = null;
            } else if (R.isObject(system.traits) && "languages" in system.traits) {
                system.traits["-=languages"] = null;
            }
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const languageAELikes = source.system.rules.filter(
            (r: AELikeSource): r is Partial<SourceFromSchema<AELikeSchema>> =>
                r.key === "ActiveEffectLike" &&
                r.path === "system.traits.languages.value" &&
                typeof r.value === "string",
        );
        for (const rule of languageAELikes) {
            // If this is a feat item, take the opportunity convert it to a language subfeature
            const language = String(rule.value);
            if (source.type === "feat" && !rule.predicate && this.#allLanguages.has(language)) {
                const subfeatures: { languages: { granted: string[] } } = (source.system.subfeatures = fu.mergeObject(
                    { languages: { granted: [], slots: 0 } },
                    source.system.subfeatures,
                ));
                subfeatures.languages.granted = R.uniq([...subfeatures.languages.granted, language]);
                source.system.rules.splice(source.system.rules.indexOf(rule), 1);
            } else {
                rule.path = "system.build.languages.granted";
                rule.value = { slug: rule.value, source: "{item|name}" };
            }
        }
    }

    #deduplicateWildsong(source: CharacterSource): void {
        const wildsongSlugs = ["druid-dedication", "druidic-language", "wildsong"];
        const wildsongFeature = source.items.find(
            (i): i is FeatSource => i.type === "feat" && wildsongSlugs.includes(i.system.slug ?? ""),
        );
        if (wildsongFeature) {
            wildsongFeature.system.subfeatures = { languages: { granted: ["wildsong"], slots: 0 } };
            const languages = source.system.details.languages.value;
            if (languages.includes("wildsong")) {
                languages.splice(languages.indexOf("wildsong"), 1);
            }
        }
    }
}

interface WithMisplacedLanguages {
    details: { languages: { value: string[]; details?: string } };
    traits?: { value?: unknown; languages?: unknown; "-=languages"?: null };
    "-=traits"?: null;
}
