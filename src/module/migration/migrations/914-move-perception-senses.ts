import { SenseData } from "@actor/creature/data.ts";
import { SenseAcuity } from "@actor/creature/index.ts";
import { SENSES_WITH_MANDATORY_ACUITIES, SENSES_WITH_UNLIMITED_RANGE, SENSE_TYPES } from "@actor/creature/values.ts";
import { ActorSourcePF2e, CharacterSource } from "@actor/data/index.ts";
import { NPCPerceptionSource } from "@actor/npc/data.ts";
import { CORE_SKILL_SLUGS, SAVE_TYPES } from "@actor/values.ts";
import { ARMOR_CATEGORIES } from "@item/armor/values.ts";
import { AncestrySource, FeatSource, ItemSourcePF2e } from "@item/base/data/index.ts";
import { HeritageSource } from "@item/heritage/data.ts";
import { WEAPON_CATEGORIES } from "@item/weapon/values.ts";
import { recursiveReplaceString, setHasElement, sluggify, tupleHasValue } from "@util";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Move perception and initiative to top level of PC and NPC data, and senses to within perceptive data. */
export class Migration914MovePerceptionSenses extends MigrationBase {
    static override version = 0.914;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "character" || source.type === "npc") {
            const attributes: OldAttributesSource = source.system.attributes;
            if ("initiative" in attributes) {
                attributes["-=initiative"] = null;
                if (
                    R.isPlainObject(attributes.initiative) &&
                    "statistic" in attributes.initiative &&
                    setHasElement(CORE_SKILL_SLUGS, attributes.initiative.statistic)
                ) {
                    source.system.initiative.statistic = attributes.initiative.statistic;
                }
            }
        }

        if (source.type === "character") {
            const attributes: OldAttributesSource = source.system.attributes;
            if ("perception" in attributes) attributes["-=perception"] = null;

            const traits: unknown = source.system.traits;
            if (R.isPlainObject(traits) && "senses" in traits) {
                traits["-=senses"] = null;
            }
            this.#createCustomChangesFeat(source);
        } else if (source.type === "npc") {
            const attributes: OldAttributesSource = source.system.attributes;
            if ("perception" in attributes) {
                const mod = R.isPlainObject(attributes.perception) ? Number(attributes.perception.value) || 0 : 0;
                source.system.perception.mod = mod;
                attributes["-=perception"] = null;
            }
            const traits: OldTraitsSource = source.system.traits;
            if ("senses" in traits) {
                this.#convertNPCSenses(source.system);
                traits["-=senses"] = null;
            }
        }

        // Remove some stray cruft
        if (R.isPlainObject(source.system.traits) && "attitude" in source.system.traits) {
            const traits: object & { "-=attitude"?: null } = source.system.traits;
            traits["-=attitude"] = null;
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        for (const rule of source.system.rules) {
            if (rule.key === "Sense" && "selector" in rule && typeof rule.selector === "string") {
                rule.selector = sluggify(rule.selector);
                if (rule.selector === "motionsense") rule.selector = "motion-sense";
            }
        }

        for (const fieldName of ["initiative", "perception"]) {
            const pattern = new RegExp(String.raw`\battributes\.${fieldName}\b`, "g");

            source.system.description = recursiveReplaceString(source.system.description, (s) =>
                s.replace(new RegExp(pattern), fieldName),
            );
            source.system.rules = source.system.rules.map((r) =>
                recursiveReplaceString(r, (s) => s.replace(pattern, fieldName)),
            );
            source.flags.pf2e &&= recursiveReplaceString(source.flags.pf2e, (s) => s.replace(pattern, fieldName));
        }

        if (source.type === "ancestry") {
            const vision: string = (source.system.vision ??= "normal");
            if (vision === "lowLightVision") source.system.vision = "low-light-vision";
        } else if (source.type === "feat" && source.system.slug === "multilingual") {
            const ternary =
                "ternary(eq(@actor.system.skills.soc.rank, 4), 2, ternary(eq(@actor.system.skills.soc.rank, 3), 1, 0))";
            const flagPath = "flags.pf2e.multilingualTaken";
            const rules = [
                { key: "ActiveEffectLike", mode: "add", path: "system.build.languages.max", value: ternary },
                { key: "ActiveEffectLike", mode: "override", path: flagPath, priority: 19, value: 0 },
                { key: "ActiveEffectLike", mode: "add", path: flagPath, value: 1 },
            ];
            source.system.rules = rules;
            source.system.subfeatures = {
                languages: {
                    granted: [],
                    slots: 2,
                },
            };
        }
    }

    /** Gather direct changes to several PC system-data properties and add them to a "Custom Changes" feat. */
    #createCustomChangesFeat(source: CharacterSource): void {
        if (!("game" in globalThis)) return;

        // Create a feat containing the user's custom changes to their character
        const customChangesFeat: Partial<FeatSource> = {
            _id: fu.randomID(),
            effects: [],
            flags: {},
            folder: null,
            img: "icons/sundries/books/book-red-exclamation.webp",
            name: "Custom Changes",
            sort: 0,
            type: "feat",
            system: {
                _migration: { version: null, previous: null },
                actions: { value: null },
                actionType: { value: "passive" },
                category: "bonus",
                description: { value: "", gm: "" },
                level: { value: 1 },
                location: null,
                maxTakable: null,
                onlyLevel1: false,
                prerequisites: { value: [] },
                publication: { title: "", authors: "", license: "OGL", remaster: false },
                rules: [],
                slug: "custom-changes",
                traits: { otherTags: [], rarity: "unique", value: [] },
            },
        };

        // Saves
        const saves: unknown = source.system.saves;
        if (R.isPlainObject(saves)) {
            for (const saveType of SAVE_TYPES) {
                const save = saves[saveType];
                if (R.isPlainObject(save) && typeof save.rank === "number" && save.rank > 1) {
                    customChangesFeat.system = fu.mergeObject(
                        { subfeatures: { proficiencies: { [saveType]: { rank: Math.clamp(save.rank, 2, 4) } } } },
                        customChangesFeat.system,
                    );
                }
            }
        }

        // Attacks and defense proficiencies
        const proficiencies: Record<string, Record<string, unknown> | null> = source.system.proficiencies ?? {};
        for (const key of ["attacks", "defenses"]) {
            const categories = key === "attacks" ? WEAPON_CATEGORIES : ARMOR_CATEGORIES;
            const section: Record<string, unknown> = proficiencies[key] ?? {};
            for (const category of categories) {
                const proficiency = section[category];
                if (R.isPlainObject(proficiency) && typeof proficiency.rank === "number" && proficiency.rank > 0) {
                    const rank = Math.clamp(proficiency.rank, 1, 4);
                    customChangesFeat.system = fu.mergeObject(
                        {
                            subfeatures: {
                                proficiencies: { [category]: { rank } },
                            },
                        },
                        customChangesFeat.system,
                    );
                    section[`-=${category}`] = null;
                }
            }
            if (key in proficiencies && Object.keys(proficiencies).length === 0) {
                proficiencies[`-=${key}`] = null;
            }
        }

        // Perception
        const attributes: OldAttributesSource = source.system.attributes;
        if (
            R.isPlainObject(attributes.perception) &&
            "rank" in attributes.perception &&
            typeof attributes.perception.rank === "number" &&
            attributes.perception.rank > 1
        ) {
            customChangesFeat.system = fu.mergeObject(
                { subfeatures: { proficiencies: { perception: { rank: attributes.perception.rank } } } },
                customChangesFeat.system,
            );
        }

        const traits: unknown = source.system.traits;
        if (R.isPlainObject(traits)) {
            // Traits
            if (Array.isArray(traits.value) && traits.value.length > 0) {
                const rule = {
                    key: "ActorTraits",
                    add: traits.value.filter((t) => t && typeof t === "string").map((t) => sluggify(t)),
                };
                customChangesFeat.system?.rules.push(rule);
            }

            // Senses
            if (Array.isArray(traits.senses)) {
                for (const sense of traits.senses) {
                    if (R.isPlainObject(sense) && typeof sense.type === "string") {
                        const type = sluggify(sense.type);
                        if (["lowLightVision", "darkvision"].includes(sense.type)) {
                            const ancestry = source.items.find((i): i is AncestrySource => i.type === "ancestry");
                            const heritage = source.items.find((i): i is HeritageSource => i.type === "heritage");
                            if (
                                ancestry?.system.vision === sense.type ||
                                heritage?.system.rules.some(
                                    (r) => r.key === "Sense" && "selector" in r && r.selector === "lowLightVision",
                                )
                            ) {
                                continue;
                            }
                        }
                        const acuity = String(sense.acuity);
                        const range = Number(sense.number) || null;
                        const subfeature = tupleHasValue(SENSES_WITH_UNLIMITED_RANGE, type)
                            ? {}
                            : tupleHasValue(["precise", "imprecise", "vague"], acuity) && Number.isInteger(range)
                              ? { acuity, range }
                              : null;
                        if (subfeature) {
                            customChangesFeat.system = fu.mergeObject(
                                { subfeatures: { senses: { [type]: subfeature } } },
                                customChangesFeat.system,
                            );
                        }
                    }
                }
            }
        }

        if (customChangesFeat.system?.subfeatures) {
            source.items.push(customChangesFeat as ItemSourcePF2e);
        }
    }

    #convertNPCSenses(system: { perception: NPCPerceptionSource; traits: OldTraitsSource }): void {
        if (R.isPlainObject(system.traits.senses) && typeof system.traits.senses.value === "string") {
            const senseStrings = system.traits.senses.value
                .split(",")
                .map((s) => s.toLocaleLowerCase("en").trim())
                .filter(R.isTruthy);
            // Sort such that superstrings of shorter strings are matched
            const senseTypes = R.sortBy(Array.from(SENSE_TYPES), (t) => t !== "greater-darkvision");
            const acuities = ["imprecise", "precise", "vague"] as const;

            for (const text of senseStrings) {
                if (text === "no vision") {
                    system.perception.vision = false;
                    continue;
                } else if (text.includes("blood scent")) {
                    system.perception.details = [system.perception.details, "blood scent"]
                        .filter(R.isTruthy)
                        .join(", ");
                }

                const sluggified = sluggify(
                    text
                        .replace("heatsight", "infrared vision")
                        .replace("motionsense", "motion sense")
                        .replace(/true(?: seeing|sight)/, "truesight"),
                );
                const type = senseTypes.find((t) => sluggified.includes(t));
                const acuity = ((): SenseAcuity => {
                    if (type) {
                        const match =
                            SENSES_WITH_MANDATORY_ACUITIES[type] ?? acuities.find((a) => sluggified.includes(a));
                        if (!match && type === "lifesense") return "precise";
                        return match ?? "imprecise";
                    }
                    return "imprecise";
                })();
                const range = type === "truesight" ? 60 : Number(/(\d+)/.exec(text)?.at(1) || NaN);
                const sense: SenseData | null = tupleHasValue(SENSES_WITH_UNLIMITED_RANGE, type)
                    ? { type }
                    : type && range > 0 && Number.isInteger(range)
                      ? { type, acuity, range }
                      : null;
                if (sense) {
                    system.perception.senses.push(sense);
                } else {
                    system.perception.details = [system.perception.details, text].filter(R.isTruthy).join(", ");
                }
            }
        }
    }
}

interface OldAttributesSource {
    hp?: object;
    perception?: { value?: number };
    "-=perception"?: null;
    initiative?: unknown;
    "-=initiative"?: null;
}

interface OldTraitsSource {
    value: string[];
    senses?: unknown;
    "-=senses"?: null;
}
