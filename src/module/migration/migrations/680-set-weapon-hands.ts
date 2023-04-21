import { ArmorSource, ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Set the "hands" (usage) property of weapons */
export class Migration680SetWeaponHands extends MigrationBase {
    static override version = 0.68;

    private oneHandedWeapons = new Set(["repeating-hand-crossbow"]);

    private onePlusHandedWeapons = new Set([
        "backpack-ballista",
        "backpack-catapult",
        "composite-longbow",
        "composite-shortbow",
        "hongali-hornbow",
        "longbow",
        "shortbow",
        "sun-sling",
    ]);

    private shieldAttachments = new Set(["shield-boss", "shield-spikes"]);

    private firearmAttachments = new Set(["bayonette", "reinforced-stock"]);

    private wornGloves = new Set(["handwraps-of-mighty-blows"]);

    private twoHandedWeapons = new Set([
        "adze",
        "alchemical-crossbow",
        "arquebus",
        "axe-musket",
        "bladed-diabolo",
        "bladed-scarf",
        "blunderbuss",
        "bo-staff",
        "boarding-pike",
        "butchering-axe",
        "combat-grapnel",
        "crossbow",
        "double-barreled-musket",
        "dueling-spear",
        "dwarven-scattergun",
        "elven-branched-spear",
        "elven-curve-blade",
        "explosive-dogslicer",
        "falchion",
        "fauchard",
        "fire-lance",
        "flingflenser",
        "flintlock-musket",
        "gill-hook",
        "glaive",
        "gnome-amalgam-musket",
        "greataxe",
        "greatclub",
        "greatpick",
        "greatsword",
        "guisarme",
        "gun-sword",
        "halberd",
        "halfling-sling-staff",
        "hammer-gun",
        "harmona-gun",
        "heavy-crossbow",
        "horsechopper",
        "kusarigama",
        "lance",
        "longspear",
        "maul",
        "meteor-hammer",
        "mithral-tree",
        "naginata",
        "ogre-hook",
        "ranseur",
        "repeating-crossbow",
        "repeating-heavy-crossbow",
        "scythe",
        "shauth-lash",
        "spiked-chain",
        "taw-launcher",
        "three-peaked-tree",
        "thundermace",
        "war-flail",
        "whip-claw",
    ]);

    isShield(source: ItemSourcePF2e & { system: { armorType?: { value?: unknown } } }): source is MaybeOldShieldData {
        return (
            source.type === "armor" &&
            (source.system.armorType?.value === "shield" || source.system.category === "shield")
        );
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (this.isShield(itemSource)) {
            itemSource.system.usage.value = "held-in-one-hand";
        } else if (itemSource.type === "weapon") {
            itemSource.system.usage ??= { value: "held-in-one-hand" };

            const { baseItem, slug, traits } = itemSource.system;
            const usage: { value: string } = itemSource.system.usage;

            if (this.twoHandedWeapons.has(baseItem || slug || "")) {
                usage.value = "held-in-two-hands";
            } else if (this.onePlusHandedWeapons.has(baseItem || slug || "")) {
                usage.value = "held-in-one-plus-hands";
            } else if (this.oneHandedWeapons.has(baseItem || slug || "")) {
                usage.value = "held-in-one-hand";
            } else if (this.shieldAttachments.has(baseItem || slug || "")) {
                usage.value = "held-in-one-hand";
                const attachedIndex = traits.value.findIndex((trait: string) => trait === "attached");
                if (attachedIndex !== -1) traits.value.splice(attachedIndex, 1, "attached-to-shield");
            } else if (this.firearmAttachments.has(baseItem || slug || "")) {
                usage.value = "held-in-one-hand";
                const attachedIndex = traits.value.findIndex((trait: string) => trait === "attached");
                if (attachedIndex !== -1) traits.value.splice(attachedIndex, 1, "attached-to-crossbow-or-firearm");
            } else if (this.wornGloves.has(baseItem || slug || "")) {
                usage.value = "worn-gloves";
            }
        }
    }
}

interface MaybeOldShieldData extends ArmorSource {
    armorType?: { value?: unknown };
}
