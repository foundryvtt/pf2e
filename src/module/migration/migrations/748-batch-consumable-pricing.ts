import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

export class Migration748BatchConsumablePricing extends MigrationBase {
    static override version = 0.748;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!itemIsOfType(source, "physical")) return;

        const slug = source.system.slug ?? sluggify(source.name);
        if (batched_5.has(slug)) {
            source.system.price.per = 5;
        }
        if (batched_10.has(slug)) {
            source.system.price.per = 10;
        }
    }
}

const batched_5 = new Set([
    "rounds-harmona-gun",
    "rounds-dwarven-scattergun",
    "rounds-flingflenser",
    "rounds-explosive-dogslicer",
]);

const batched_10 = new Set([
    "rounds-three-peaked-tree",
    "rounds-dragon-mouth-pistol",
    "rounds-pepperbox",
    "rounds-fire-lance",
    "rounds-flintlock-pistol",
    "rounds-clan-pistol",
    "bolts",
    "rounds-hand-cannon",
    "sun-shot",
    "rounds-dagger-pistol",
    "rounds-dueling-pistol",
    "rounds-flintlock-musket",
    "rounds-hammer-gun",
    "rounds-black-powder-knuckle-dusters",
    "rounds-slide-pistol",
    "sling-bullets",
    "rounds-double-barreled-musket",
    "rounds-mace-multipistol",
    "rounds-gnome-amalgam-musket",
    "cutlery",
    "rounds-axe-musket",
    "rounds-mithral-tree",
    "wooden-taws",
    "rounds-gun-sword",
    "rounds-blunderbuss",
    "rounds-jezail",
    "rounds-double-barreled-pistol",
    "rounds-arquebus",
    "rounds-cane-pistol",
    "rounds-rapier-pistol",
    "rounds-coat-pistol",
    "rounds-piercing-wind",
    "blowgun-darts",
    "arrows",

    // non-ammo
    "light-writer-plates",
    "practice-target",
]);
