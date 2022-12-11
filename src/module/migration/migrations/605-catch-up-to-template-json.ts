import { MigrationBase } from "../base";
import { ItemSourcePF2e } from "@item/data";
import { ActorSourcePF2e } from "@actor/data";
import { isPhysicalData } from "@item/data/helpers";
import { ItemTraits } from "@item/data/base";

/** Catch up actors and items to the current template.json spec */
export class Migration605CatchUpToTemplateJSON extends MigrationBase {
    static override version = 0.605;

    private addEffects(entityData: ActorSourcePF2e | ItemSourcePF2e): void {
        if (!Array.isArray(entityData.effects)) {
            entityData.effects = [];
        }
    }

    override async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        this.addEffects(actorData);

        if (actorData.type === "character" || actorData.type === "npc") {
            // Numeric HP max
            if (typeof actorData.system.attributes.hp.max === "string") {
                const newMax = parseInt(actorData.system.attributes.hp.max as string, 10);
                if (Number.isInteger(newMax)) {
                    actorData.system.attributes.hp.max = newMax;
                }
            }
            // Numeric HP value
            if (typeof actorData.system.attributes.hp.value === "string") {
                const newValue = parseInt(actorData.system.attributes.hp.value as string, 10);
                if (Number.isInteger(newValue)) {
                    actorData.system.attributes.hp.value = newValue;
                }
            }
            // Numeric level
            if (typeof actorData.system.details.level.value === "string") {
                const newLevel = parseInt(actorData.system.details.level.value as string, 10);
                if (Number.isInteger(newLevel)) {
                    actorData.system.details.level.value = newLevel;
                }
            }

            // Remove unused/deprecated fields
            if ("tempmax" in actorData.system.attributes.hp) {
                delete (actorData.system.attributes.hp as { tempmax?: unknown }).tempmax;
            }
            if ("special" in actorData.system.attributes.speed) {
                delete (actorData.system.attributes.speed as { special?: unknown }).special;
            }
        }
    }

    override async updateItem(itemData: ItemSourcePF2e, actorData: ActorSourcePF2e): Promise<void> {
        this.addEffects(itemData);

        // Add slugs to owned items
        if (!(itemData.system.slug as string | null) && actorData) {
            itemData.system.slug = null;
        }

        // Add rule elements
        if (!Array.isArray(itemData.system.rules)) {
            itemData.system.rules = [];
        }

        // Add custom trait field
        if (itemData.system.traits && !itemData.system.traits.custom) {
            itemData.system.traits.custom = "";
        }
        // Add rarity trait field
        const traits: TraitsWithRarityObject = itemData.system.traits;
        if (traits && !traits.rarity) {
            traits.rarity = { value: "common" };
        }

        // Add item-identification property
        if (isPhysicalData(itemData) && !itemData.system.identification) {
            const withoutIdentifyData: { identification: { status: string } } = itemData.system;
            withoutIdentifyData.identification.status = "identified";
        }

        // Add hasCounteractCheck property
        if (itemData.type === "spell" && !itemData.system.hasCounteractCheck) {
            itemData.system.hasCounteractCheck = { value: false };
        }

        // Remove unused fields
        if (itemData.type === "lore" && "featType" in itemData.system) {
            delete itemData.system.featType;
        }
        if (itemData.type === "action" && "skill_requirements" in itemData.system) {
            delete itemData.system.skill_requirements;
        }
        if (itemData.type === "action" && "skill_requirement" in itemData.system) {
            itemData.system.skill_requirement;
        }
    }
}

type TraitsWithRarityObject =
    | (Omit<ItemTraits, "rarity"> & {
          rarity?: string | { value: string };
      })
    | undefined;
