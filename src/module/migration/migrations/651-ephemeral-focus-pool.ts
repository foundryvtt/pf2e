import { ActorSourcePF2e } from "@actor/data/index.ts";
import { FeatSource, ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { isObject, sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Don't store the max value of the focus pool */
export class Migration651EphemeralFocusPool extends MigrationBase {
    static override version = 0.651;

    #needsRuleElement(rules: (RuleElementSource & { path?: string })[]): boolean {
        return !rules.some((rule) => rule.key === "ActiveEffectLike" && rule.path === "system.resources.focus.max");
    }

    #increasesByOne = new Set([
        "abundant-step",
        "achaekeks-grip",
        "advanced-bloodline",
        "advanced-deitys-domain",
        "advanced-domain",
        "advanced-revelation",
        "advanced-school-spell",
        "advanced-seeker-of-truths",
        "animal-feature",
        "arcane-school-spell",
        "apex-companion",
        "basic-lesson",
        "beastmasters-trance",
        "blessed-sacrifice",
        "cackle",
        "champions-sacrifice",
        "clinging-shadows-initiate",
        "counter-perform",
        "debilitating-dichotomy",
        "domain-acumen",
        "domain-fluency",
        "empty-body",
        "enlarge-companion",
        "ephemeral-tracking",
        "familiar-form",
        "fatal-aria",
        "gaze-of-veracity",
        "greater-bloodline",
        "greater-lesson",
        "greater-revelation",
        "heal-animal",
        "healing-touch",
        "hunters-luck",
        "hunters-vision",
        "impaling-briars",
        "inspire-heroics",
        "invoke-disaster",
        "invoke-the-crimson-oath",
        "ki-blast",
        "ki-form",
        "ki-rush",
        "ki-strike",
        "leaf-order",
        "light-of-revelation",
        "lingering-composition",
        "litany-against-sloth",
        "litany-against-wrath",
        "litany-of-depravity",
        "litany-of-righteousness",
        "litany-of-self-interest",
        "loremasters-etude",
        "magic-hide",
        "major-lesson",
        "mantis-form",
        "medusas-wrath",
        "order-spell",
        "perfect-ki-adept",
        "perfect-strike",
        "quivering-palm",
        "rangers-bramble",
        "shadow-magic",
        "shadows-web",
        "shall-not-falter-shall-not-rout",
        "snare-hopping",
        "song-of-the-fallen",
        "soothing-ballad",
        "soothing-mist",
        "speaking-sky",
        "spellmasters-ward",
        "steal-the-sky",
        "storm-order",
        "sun-blade",
        "suns-fury",
        "terrain-transposition",
        "transcribe-moment",
        "universal-versatility",
        "vision-of-weakness",
        "wholeness-of-body",
        "wild-winds-initiate",
        "wind-caller",
        "wind-jump",
        "wronged-monks-wrath",
    ]);

    #isClassFeature(source: ItemSourcePF2e): source is FeatSource & { system: { featType: "classfeature" } } {
        return (
            source.type === "feat" &&
            "featType" in source.system &&
            isObject<{ value: string }>(source.system.featType) &&
            source.system.featType.value === "classfeature"
        );
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;
        const systemData: { resources: { focus?: { max?: number; "-=max"?: null } } } = source.system;
        systemData.resources ??= {};

        const resources = systemData.resources;
        if (typeof resources.focus?.max === "number" && "game" in globalThis) {
            resources.focus["-=max"] = null;
        } else {
            delete resources.focus?.max;
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        const systemData = source.system;

        const rule = ((): (RuleElementSource & { [key: string]: unknown }) | null => {
            const slug = systemData.slug ?? sluggify(source.name);

            if (slug === "revelation-spells") {
                return {
                    key: "ActiveEffectLike",
                    path: "system.resources.focus.max",
                    mode: "upgrade",
                    value: 2,
                    priority: 10, // Before any adds
                };
            }

            if (slug === "major-curse") {
                return {
                    key: "ActiveEffectLike",
                    path: "system.resources.focus.max",
                    mode: "upgrade",
                    value: 3,
                };
            }

            if (
                ["composition-spells", "devotion-spells", "druidic-order", "hexes"].includes(slug) ||
                (/^(?:arcane-school|bloodline)-/.test(slug) && this.#isClassFeature(source))
            ) {
                return {
                    key: "ActiveEffectLike",
                    path: "system.resources.focus.max",
                    mode: "upgrade",
                    value: 1,
                    priority: 10, // Before any adds
                };
            }

            if (this.#increasesByOne.has(slug) || slug.startsWith("first-revelation-")) {
                return {
                    key: "ActiveEffectLike",
                    path: "system.resources.focus.max",
                    mode: "add",
                    value: 1,
                };
            }

            return null;
        })();

        if (rule && this.#needsRuleElement(source.system.rules)) {
            systemData.rules.push(rule);
        }
    }
}
