import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { isPhysicalData } from "@item/base/data/helpers.ts";

/** Catch up actors and items to the current template.json spec */
export class Migration605CatchUpToTemplateJSON extends MigrationBase {
    static override version = 0.605;

    private addEffects(entityData: ActorSourcePF2e | ItemSourcePF2e): void {
        if (!Array.isArray(entityData.effects)) {
            entityData.effects = [];
        }
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        this.addEffects(source);

        if (source.type === "character" || source.type === "npc") {
            // Numeric HP max
            if ("max" in source.system.attributes.hp && typeof source.system.attributes.hp.max === "string") {
                const newMax = parseInt(source.system.attributes.hp.max as string, 10);
                if (Number.isInteger(newMax)) {
                    source.system.attributes.hp.max = newMax;
                }
            }
            // Numeric HP value
            if (typeof source.system.attributes.hp.value === "string") {
                const newValue = parseInt(source.system.attributes.hp.value as string, 10);
                if (Number.isInteger(newValue)) {
                    source.system.attributes.hp.value = newValue;
                }
            }
            // Numeric level
            if (typeof source.system.details.level.value === "string") {
                const newLevel = parseInt(source.system.details.level.value as string, 10);
                if (Number.isInteger(newLevel)) {
                    source.system.details.level.value = newLevel;
                }
            }

            // Remove unused/deprecated fields
            if ("tempmax" in source.system.attributes.hp) {
                delete (source.system.attributes.hp as { tempmax?: unknown }).tempmax;
            }
            if ("special" in source.system.attributes.speed) {
                delete (source.system.attributes.speed as { special?: unknown }).special;
            }
        }
    }

    override async updateItem(source: MaybeWithCounteractCheckObject, actorSource: ActorSourcePF2e): Promise<void> {
        this.addEffects(source);

        // Add slugs to owned items
        if (!(source.system.slug as string | null) && actorSource) {
            source.system.slug = null;
        }

        // Add rule elements
        if (!Array.isArray(source.system.rules)) {
            source.system.rules = [];
        }

        // Add custom trait field
        const traits: TraitsWithRarityObject | undefined = source.system.traits;
        if (traits && !traits.custom) {
            traits.custom = "";
        }
        // Add rarity trait field
        if (traits && !traits.rarity) {
            traits.rarity = { value: "common" };
        }

        // Add item-identification property
        if (isPhysicalData(source) && !source.system.identification) {
            const withoutIdentifyData: { identification: { status: string } } = source.system;
            withoutIdentifyData.identification.status = "identified";
        }

        // Add hasCounteractCheck property
        if (source.type === "spell" && !source.system.hasCounteractCheck) {
            source.system.hasCounteractCheck = { value: false };
        }

        // Remove unused fields
        if (source.type === "lore" && "featType" in source.system) {
            delete source.system.featType;
        }
        if (source.type === "action" && "skill_requirements" in source.system) {
            delete source.system.skill_requirements;
        }
        if (source.type === "action" && "skill_requirement" in source.system) {
            source.system.skill_requirement;
        }
    }
}

type MaybeWithCounteractCheckObject = ItemSourcePF2e & {
    system: { hasCounteractCheck?: object };
};

interface TraitsWithRarityObject {
    value?: string[];
    rarity?: string | { value: string };
    custom?: string;
}
