import { ItemSourcePF2e } from "@item/data";
import { ItemTraits } from "@item/data/base";
import { isPhysicalData } from "@item/data/helpers";
import { sluggify } from "@util";
import { MigrationBase } from "../base";

/** Set appropriate usage and mark certain containers as being for stowing */
export class Migration666UsageAndStowingContainers extends MigrationBase {
    static override version = 0.666;

    backpacks = new Set([
        "backpack",
        "knapsack-of-halflingkind",
        "knapsack-of-halflingkind-greater",
        "sturdy-satchel",
        "vaultbreaker-harness",
        "voyagers-pack",
    ]);

    wornGarment = new Set(["sleeves-of-storage", "sleeves-of-storage-greater"]);

    wornGloves = new Set(["gloves-of-storing"]);

    heldInTwoHands = new Set([
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

    stowingContainers = new Set([
        ...this.backpacks,
        ...this.heldInTwoHands,
        ...this.wornGarment,
        ...this.wornGloves,
        "extradimensional-stash",
    ]);

    override async updateItem(itemSource: ItemSourcePF2e) {
        if (!itemSource.data.traits) return;

        const traits: TraitsWithUsage = itemSource.data.traits;
        // Delete old usage "traits":
        if (typeof traits.usage?.value === "string") {
            const traitUsage = traits.usage.value;
            const isPhysical = isPhysicalData(itemSource);
            const keepUsage = isPhysical && (traitUsage !== "held-in-one-hand" || itemSource.data.usage.value === "");
            if (isPhysical && keepUsage) {
                itemSource.data.usage.value = traits.usage.value;
            }
            "game" in globalThis ? (traits["-=usage"] = null) : delete traits.usage;
        }

        // Set usage on containers and whether they're for stowing
        if (itemSource.type !== "backpack") return;

        const slug = itemSource.data.slug ?? sluggify(itemSource.name);

        if (this.backpacks.has(slug)) {
            itemSource.data.usage.value = "wornbackpack";
        } else if (this.heldInTwoHands.has(slug)) {
            itemSource.data.usage.value = "held-in-two-hands";
        } else if (this.wornGarment.has(slug)) {
            itemSource.data.usage.value = "worngarment";
        } else if (this.wornGloves.has(slug)) {
            itemSource.data.usage.value = "worngloves";
        } else {
            itemSource.data.usage.value = "worn";
        }

        itemSource.data.stowing = this.stowingContainers.has(slug);
    }
}

interface TraitsWithUsage extends ItemTraits {
    usage?: { value?: unknown };
    "-=usage"?: null;
}
