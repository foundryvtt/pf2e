import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { RuleElementSource } from "@module/rules/rules-data-definitions";
import { sluggify } from "@module/utils";
import { MigrationBase } from "../base";

/** Don't store the max value of the focus pool */
export class Migration651EphemeralFocusPool extends MigrationBase {
    static override version = 0.651;

    private needsRuleElement(rules: Array<RuleElementSource & { path?: string }>): boolean {
        return !rules.some((rule) => rule.key === "ActiveEffectLike" && rule.path === "data.resources.focus.max");
    }

    private increasesByOne = new Set([
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

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type !== "character") return;
        const resources: { focus?: { max?: number; "-=max"?: null } } = actorSource.data.resources;
        if (typeof resources.focus?.max === "number" && "game" in globalThis) {
            resources.focus["-=max"] = null;
        } else {
            delete resources.focus?.max;
        }
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type !== "feat") return;

        const systemData = itemSource.data;

        const rule = ((): (RuleElementSource & { [key: string]: unknown }) | null => {
            const slug = systemData.slug ?? sluggify(itemSource.name);

            if (slug === "revelation-spells") {
                return {
                    key: "ActiveEffectLike",
                    path: "data.resources.focus.max",
                    mode: "upgrade",
                    value: 2,
                    priority: 10, // Before any adds
                };
            }

            if (slug === "major-curse") {
                return {
                    key: "ActiveEffectLike",
                    path: "data.resources.focus.max",
                    mode: "upgrade",
                    value: 3,
                };
            }

            if (
                ["composition-spells", "devotion-spells", "hexes"].includes(slug) ||
                /^(?:arcane-school|bloodline)-/.test(slug)
            ) {
                return {
                    key: "ActiveEffectLike",
                    path: "data.resources.focus.max",
                    mode: "upgrade",
                    value: 1,
                    priority: 10, // Before any adds
                };
            }

            if (this.increasesByOne.has(slug) || slug.startsWith("first-revelation-")) {
                return {
                    key: "ActiveEffectLike",
                    path: "data.resources.focus.max",
                    mode: "add",
                    value: 1,
                };
            }

            return null;
        })();

        if (rule && this.needsRuleElement(itemSource.data.rules)) systemData.rules.push(rule);
    }
}
