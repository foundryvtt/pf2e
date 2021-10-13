import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Set the "hands" (usage) property of weapons */
export class Migration680SetWeaponHands extends MigrationBase {
    static override version = 0.68;

    private onePlusHandedWeapons = new Set(["composite-longbow", "composite-shortbow", "longbow", "shortbow"]);

    private twoHandedWeapons = new Set([
        "longspear",
        "adze",
        "bladed-scarf",
        "bo-staff",
        "boarding-pike",
        "combat-grapnel",
        "elven-curve-blade",
        "falchion",
        "fauchard",
        "gill-hook",
        "glaive",
        "greataxe",
        "greatclub",
        "greatpick",
        "greatsword",
        "guisarme",
        "halberd",
        "horsechopper",
        "kusarigama",
        "lance",
        "maul",
        "meteor-hammer",
        "naginata",
        "ogre-hook",
        "ranseur",
        "scythe",
        "spiked-chain",
        "war-flail",
        "bladed-diabolo",
        "shauth-lash",
        "whip-claw",
        "alchemical-crossbow",
        "crossbow",
        "heavy-crossbow",
        "halfling-sling-staff",
        "taw-launcher",
    ]);

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type === "armor" && itemSource.data.armorType.value === "shield") {
            itemSource.data.usage.value = "held-in-one-hand";
        } else if (itemSource.type === "weapon") {
            itemSource.data.usage ??= { value: "held-in-one-hand" };
            const { baseItem, slug, usage } = itemSource.data;
            if (this.twoHandedWeapons.has(baseItem || slug || "")) {
                usage.value = "held-in-two-hands";
            } else if (this.onePlusHandedWeapons.has(baseItem || slug || "")) {
                usage.value = "held-in-one-plus-hands";
            } else {
                usage.value = "held-in-one-hand";
            }
        }
    }
}
