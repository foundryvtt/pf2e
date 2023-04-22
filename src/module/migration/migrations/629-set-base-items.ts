import { MigrationBase } from "../base.ts";
import { sluggify } from "@util";
import { BaseArmorType } from "@item/armor/types.ts";
import { isPhysicalData } from "@item/data/helpers.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";

/** Set the `baseItem` property of base armor and weapons for the benefit of better unidentified names */
export class Migration629SetBaseItems extends MigrationBase {
    static override version = 0.629;

    #BASE_ARMORS = [
        "explorers-clothing",
        "padded-armor",
        "leather-armor",
        "studded-leather-armor",
        "chain-shirt",
        "hide-armor",
        "scale-mail",
        "chain-mail",
        "breastplate",
        "splint-mail",
        "half-plate",
        "full-plate",
        "hellknight-plate",
    ];

    #MAGIC_ARMOR_TO_BASE: Record<string, BaseArmorType> = {
        "breastplate-of-command-greater": "breastplate",
        "breastplate-of-command": "breastplate",
        "celestial-armor": "chain-mail",
        "demon-armor": "full-plate",
        dragonplate: "full-plate",
        "electric-eelskin": "leather-armor",
        "forgotten-shell": "full-plate",
        "ghoul-hide": "hide-armor",
        "glorious-plate": "full-plate",
        "impenetrable-scale": "scale-mail",
        "jerkin-of-liberation": "studded-leather-armor",
        "mail-of-luck": "splint-mail",
        "moonlit-chain": "chain-shirt",
        "noxious-jerkin": "padded-armor",
        "numerian-steel-breastplate": "breastplate",
        "plate-armor-of-the-deep": "full-plate",
        "rhino-hide": "hide-armor",
        "spangled-riders-suit": "studded-leather-armor",
        "victory-plate": "full-plate",
    };

    #BASE_WEAPONS = [
        "adze",
        "aklys",
        "alchemical-bomb",
        "alchemical-crossbow",
        "aldori-dueling-sword",
        "arrows",
        "bastard-sword",
        "battle-axe",
        "battle-lute",
        "bladed-diabolo",
        "bladed-hoop",
        "bladed-scarf",
        "blowgun-darts",
        "blowgun",
        "bo-staff",
        "boarding-axe",
        "boarding-pike",
        "bola",
        "bolts",
        "buugeng",
        "clan-dagger",
        "claw",
        "claw-blade",
        "club",
        "combat-grapnel",
        "composite-longbow",
        "composite-shortbow",
        "crossbow",
        "dagger",
        "daikyu",
        "dart",
        "dogslicer",
        "dwarven-war-axe",
        "elven-curve-blade",
        "exquisite-sword-cane-sheath",
        "exquisite-sword-cane",
        "falchion",
        "fangwire",
        "fauchard",
        "fighting-fan",
        "filchers-fork",
        "fire-poi",
        "fist",
        "flail",
        "gaff",
        "gauntlet",
        "gill-hook",
        "glaive",
        "gnome-flickmace",
        "gnome-hooked-hammer",
        "greataxe",
        "greatclub",
        "greatpick",
        "greatsword",
        "guisarme",
        "halberd",
        "halfling-sling-staff",
        "hand-adze",
        "hand-crossbow",
        "hatchet",
        "heavy-crossbow",
        "horsechopper",
        "javelin",
        "jaws",
        "juggling-club",
        "kama",
        "katana",
        "katar",
        "khakkhara",
        "khopesh",
        "kukri",
        "lance",
        "light-hammer",
        "light-mace",
        "light-pick",
        "longbow",
        "longspear",
        "longsword",
        "mace",
        "machete",
        "main-gauche",
        "mambele",
        "maul",
        "meteor-hammer",
        "monkeys-fist",
        "morningstar",
        "naginata",
        "nightstick",
        "nine-ring-sword",
        "nunchaku",
        "ogre-hook",
        "orc-knuckle-dagger",
        "orc-necksplitter",
        "pick",
        "poi",
        "polytool",
        "ranseur",
        "rapier",
        "rhoka-sword",
        "rungu",
        "sai",
        "sap",
        "sawtooth-saber",
        "scimitar",
        "scorpion-whip",
        "scourge",
        "scythe",
        "shears",
        "shield-bash",
        "shield-boss",
        "shield-spikes",
        "shortbow",
        "shortsword",
        "shuriken",
        "sickle",
        "sling-bullets",
        "sling",
        "spear",
        "spiked-chain",
        "spiked-gauntlet",
        "staff",
        "starknife",
        "stiletto-pen",
        "sword-cane",
        "tamchal-chakram",
        "taw-launcher",
        "tekko-kagi",
        "temple-sword",
        "tengu-gale-blade",
        "throwing-knife",
        "thunder-sling",
        "tricky-pick",
        "trident",
        "urumi",
        "wakizashi",
        "war-flail",
        "war-razor",
        "warhammer",
        "whip-claw",
        "whip",
        "wish-blade",
        "wish-knife",
        "wooden-taws",
    ];

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (!isPhysicalData(itemData)) return;

        const systemData: { slug: string | null; baseItem: string | null } = itemData.system;

        if (!systemData.slug || (itemData.type !== "armor" && itemData.type !== "weapon")) return;

        if (itemData.type === "armor") {
            if (systemData.slug === "hide" || sluggify(itemData.name) === "hide") {
                systemData.slug = "hide-armor";
            }

            if (this.#BASE_ARMORS.includes(systemData.slug ?? "")) {
                systemData.baseItem = systemData.slug;
            } else if (systemData.slug in this.#MAGIC_ARMOR_TO_BASE) {
                systemData.baseItem = this.#MAGIC_ARMOR_TO_BASE[systemData.slug];
            }
        } else if (itemData.type === "weapon") {
            if (this.#BASE_WEAPONS.includes(systemData.slug)) {
                systemData.baseItem = systemData.slug;
            }

            // + one magic weapon!
            if (systemData.slug === "cinderclaw-gauntlet") {
                systemData.baseItem = "spiked-gauntlet";
            }
        }
    }
}
