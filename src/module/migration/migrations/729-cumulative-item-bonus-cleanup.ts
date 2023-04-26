import { ArmorSource, ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Clean up after bug overhauling cumulative item bonuses */
export class Migration729CumulativeItemBonusCleanup extends MigrationBase {
    static override version = 0.729;

    #explorersClothingVariants = new Set([
        "clothing-explorers",
        "robe-of-the-arch-magi",
        "robe-of-the-arch-magi-greater",
        "sarkorian-god-caller-garb",
    ]);

    private isExplorersClothing(source: ItemSourcePF2e): source is ArmorSource {
        return source.type === "armor" && this.#explorersClothingVariants.has(source.system.slug ?? "");
    }

    private isStanceEffectOrAnimalSkinFeat(source: ItemSourcePF2e): boolean {
        return (
            (source.type === "effect" && source.system.slug === "stance-mountain-stance") ||
            (source.type === "feat" && source.system.slug === "animal-skin")
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (this.isExplorersClothing(source)) {
            // Early versions of explorer's clothing lacked group, base, and possibly the comfort trait
            source.system.category = "unarmored";
            source.system.group = "cloth";
            source.system.baseItem = "explorers-clothing";
            if (!source.system.traits.value.includes("comfort")) {
                source.system.traits.value.push("comfort");
            }
        } else if (this.isStanceEffectOrAnimalSkinFeat(source)) {
            // Fix slug on AdjustModifier RE
            const rule = source.system.rules.find((r) => r.key === "AdjustModifier" && r.slug === "clothing-explorers");
            if (rule) rule.slug = "explorers-clothing";
        } else if (source.type === "equipment") {
            // Fix every equipment FlatModifier RE getting a "bracers-of-armor" slug
            const isBracers = !!source.system.slug?.startsWith("bracers-of-armor-");
            for (const rule of source.system.rules) {
                if (rule.key === "FlatModifier" && rule.slug === "bracers-of-armor" && !isBracers) {
                    if (source.system.slug === "metuaks-pendant") {
                        rule.slug = "metuaks-pendant";
                    } else {
                        delete rule.slug;
                    }
                }
            }
        }
    }
}
