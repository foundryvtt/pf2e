import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Set appropriate usage and mark certain containers as being for stowing */
export class Migration666UsageAndStowingContainers extends MigrationBase {
    static override version = 0.666;

    #backpacks = new Set([
        "backpack",
        "knapsack-of-halflingkind",
        "knapsack-of-halflingkind-greater",
        "sturdy-satchel",
        "vaultbreaker-harness",
        "voyagers-pack",
    ]);

    #wornGarment = new Set(["sleeves-of-storage", "sleeves-of-storage-greater"]);

    #wornGloves = new Set(["gloves-of-storing"]);

    #heldInTwoHands = new Set([
        "bag-of-devouring-type-i",
        "bag-of-devouring-type-ii",
        "bag-of-devouring-type-iii",
        "bag-of-holding-type-i",
        "bag-of-holding-type-ii",
        "bag-of-holding-type-iii",
        "bag-of-holding-type-iv",
        "bag-of-weasels",
        "chest",
        "sealing-chest-greater",
        "sealing-chest-lesser",
        "sealing-chest-moderate",
    ]);

    #stowingContainers = new Set([
        ...this.#backpacks,
        ...this.#heldInTwoHands,
        ...this.#wornGarment,
        ...this.#wornGloves,
        "extradimensional-stash",
    ]);

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!source.system.traits) return;

        const traits: TraitsWithUsage = source.system.traits;
        // Delete old usage "traits":
        if (typeof traits.usage?.value === "string") {
            const traitUsage = traits.usage.value;
            const isPhysical = itemIsOfType(source, "physical");
            const keepUsage = isPhysical && (traitUsage !== "held-in-one-hand" || source.system.usage?.value === "");
            if (isPhysical && keepUsage && source.system.usage) {
                source.system.usage.value = traits.usage.value;
            }
            traits["-=usage"] = null;
        }

        // Set usage on containers and whether they're for stowing
        if (source.type !== "backpack") return;

        const slug = source.system.slug ?? sluggify(source.name);

        if (this.#backpacks.has(slug)) {
            source.system.usage.value = "wornbackpack";
        } else if (this.#heldInTwoHands.has(slug)) {
            source.system.usage.value = "held-in-two-hands";
        } else if (this.#wornGarment.has(slug)) {
            source.system.usage.value = "worngarment";
        } else if (this.#wornGloves.has(slug)) {
            source.system.usage.value = "worngloves";
        } else {
            source.system.usage.value = "worn";
        }

        source.system.stowing = this.#stowingContainers.has(slug);
    }
}

interface TraitsWithUsage {
    value?: string[];
    usage?: { value?: unknown };
    "-=usage"?: null;
}
