import { ActorSourcePF2e } from "@actor/data/index.ts";
import { AbilityTrait } from "@item/ability/types.ts";
import { ArmorTrait } from "@item/armor/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { SpellTrait } from "@item/spell/index.ts";
import {
    actionTraits,
    armorTraits,
    classTraits,
    consumableTraits,
    creatureTraits,
    equipmentTraits,
    featTraits,
    hazardTraits,
    npcAttackTraits,
    spellTraits,
    vehicleTraits,
    weaponTraits,
} from "@scripts/config/traits.ts";
import { MigrationBase } from "../base.ts";

/** Prune traits from actors and items that are invalid for the given type */
export class Migration828PruneInvalidTraits extends MigrationBase {
    static override version = 0.828;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        const traits: { value: string[] } | undefined = source.system.traits;
        if (!traits) return;

        switch (source.type) {
            case "character":
            case "npc": {
                traits.value = traits.value.filter((t) => t in creatureTraits);
                return;
            }
            case "hazard": {
                traits.value = traits.value.filter((t) => t in hazardTraits);
                return;
            }
            case "vehicle": {
                traits.value = traits.value.filter((t) => t in vehicleTraits);
                return;
            }
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const traits: { value?: string[] } | undefined = source.system.traits;
        if (!traits?.value || !Array.isArray(traits.value)) return;
        traits.value = traits.value.filter((t) => typeof t === "string");

        switch (source.type) {
            case "action": {
                traits.value = traits.value
                    .map((t) =>
                        t
                            .replace(/^audible$/, "auditory")
                            .replace(/^concentration$/, "concentrate")
                            .replace(/^(interact|manipulation)$/i, "manipulate")
                            .replace(/^vocal$/, "verbal"),
                    )
                    .filter((t): t is AbilityTrait => t.startsWith("hb_") || t in actionTraits);
                return;
            }
            case "affliction":
            case "effect": {
                traits.value = traits.value.filter((t) => t.startsWith("hb_") || t in actionTraits || t in spellTraits);
                return;
            }
            case "ancestry": {
                traits.value = traits.value.filter(
                    (t) => t.startsWith("hb_") || t in creatureTraits || ["animal"].includes(t),
                );
                return;
            }
            case "armor": {
                traits.value = traits.value
                    .map((t) =>
                        source.system.slug?.includes("helmsmans")
                            ? t.replace(/^shield-throw$/, "shield-throw-30")
                            : source.system.slug?.includes("klar")
                              ? t.replace(/^integrated$/, "integrated-1d6-s-versatile-p")
                              : t,
                    )
                    .filter((t): t is ArmorTrait => t.startsWith("hb_") || t in armorTraits);
                return;
            }
            case "backpack":
            case "equipment": {
                traits.value = traits.value.filter((t) => t.startsWith("hb_") || t in equipmentTraits);
                return;
            }
            case "consumable": {
                traits.value = traits.value.filter((t) => t.startsWith("hb_") || t in consumableTraits);
                return;
            }
            case "class": {
                traits.value = traits.value.filter((t) => t.startsWith("hb_") || t in classTraits);
                return;
            }
            case "feat": {
                traits.value = traits.value.filter((t) => t.startsWith("hb_") || t in featTraits);
                return;
            }
            case "melee": {
                traits.value = traits.value.filter((t) => t.startsWith("hb_") || t in npcAttackTraits);
                return;
            }
            case "spell": {
                traits.value = traits.value
                    .map((t) => t.replace(/^audible$/, "auditory"))
                    .filter((t): t is SpellTrait => t.startsWith("hb_") || t in spellTraits);
                return;
            }
            case "weapon": {
                traits.value = traits.value.filter((t) => t.startsWith("hb_") || t in weaponTraits);
                return;
            }
        }
    }
}
