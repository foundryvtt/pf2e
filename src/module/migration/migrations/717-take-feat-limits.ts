import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Indicate whether a feat must be taken at level 1 or may only be taken a limited number of times */
export class Migration717TakeFeatLimits extends MigrationBase {
    static override version = 0.717;

    private levelOneOnly = new Set([
        "celestial-eyes",
        "chance-death",
        "deliberate-death",
        "elemental-eyes",
        "eyes-of-the-night",
        "fiendish-eyes",
        "gravesight",
        "willing-death",
    ]);

    private maxTakeable: Record<string, number> = {
        "additional-lore": Infinity,
        "advanced-domain": Infinity,
        "advanced-general-training": Infinity,
        "animal-senses": Infinity,
        "animal-senses-darkvision": Infinity,
        "animal-senses-low-light-vision": Infinity,
        "animal-senses-scent-imprecise": Infinity,
        "armor-proficiency": 3,
        assurance: Infinity,
        "automatic-knowledge": Infinity,
        "blessing-of-the-sun-gods": Infinity,
        "consult-the-spirits": Infinity,
        "domain-initiate": Infinity,
        "general-training": Infinity,
        "greater-animal-senses": Infinity,
        "greater-sun-blessing": Infinity,
        "hellknight-order-cross-training": Infinity,
        "living-weapon": Infinity,
        "magic-arrow": Infinity,
        "modular-dynamo": Infinity,
        multilingual: Infinity,
        "settlement-scholastics": Infinity,
        "skill-training": Infinity,
        "terrain-stalker": Infinity,
    };

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        const slug = source.system.slug ?? "";

        // Set level-one-only restriction
        const traits = source.system.traits.value;
        if (traits.includes("lineage") || this.levelOneOnly.has(slug)) {
            source.system.onlyLevel1 = true;
        } else if ("game" in globalThis) {
            source.system.onlyLevel1 = false;
        }

        if (!source.system.onlyLevel1 && slug in this.maxTakeable) {
            source.system.maxTakable = this.maxTakeable[slug];
        } else if ("game" in globalThis) {
            source.system.maxTakable = 1;
        }
    }
}
