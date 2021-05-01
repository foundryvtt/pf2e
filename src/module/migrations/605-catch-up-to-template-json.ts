import { MigrationBase } from './base';
import { isPhysicalItem, ItemDataPF2e } from '@item/data-definitions';
import { ActorDataPF2e } from '@actor/data-definitions';

/** Catch up actors and items to the current template.json spec */
export class Migration605CatchUpToTemplateJSON extends MigrationBase {
    static version = 0.605;

    private addEffects(entityData: ActorDataPF2e | ItemDataPF2e) {
        if (!Array.isArray(entityData.effects)) {
            entityData.effects = [];
        }
    }

    async updateActor(actorData: ActorDataPF2e) {
        this.addEffects(actorData);

        // Add custom trait property
        if (!(typeof actorData.data.traits.traits.custom === 'string')) {
            actorData.data.traits.traits.custom = '';
        }

        if (actorData.type === 'character' || actorData.type === 'npc') {
            // Numeric HP max
            if (typeof actorData.data.attributes.hp.max === 'string') {
                const newMax = parseInt(actorData.data.attributes.hp.max as string, 10);
                if (Number.isInteger(newMax)) {
                    actorData.data.attributes.hp.max = newMax;
                }
            }
            // Numeric HP value
            if (typeof actorData.data.attributes.hp.value === 'string') {
                const newValue = parseInt(actorData.data.attributes.hp.value as string, 10);
                if (Number.isInteger(newValue)) {
                    actorData.data.attributes.hp.value = newValue;
                }
            }
            // Numeric level
            if (typeof actorData.data.details.level.value === 'string') {
                const newLevel = parseInt(actorData.data.details.level.value as string, 10);
                if (Number.isInteger(newLevel)) {
                    actorData.data.details.level.value = newLevel;
                }
            }

            // Remove unused/deprecated fields
            if ('tempmax' in actorData.data.attributes.hp) {
                delete (actorData.data.attributes.hp as { tempmax?: unknown }).tempmax;
            }
            if ('special' in actorData.data.attributes.speed) {
                delete (actorData.data.attributes.speed as { special?: unknown }).special;
            }
        }
    }

    async updateItem(itemData: ItemDataPF2e, actorData: ActorDataPF2e) {
        this.addEffects(itemData);

        // Add slugs to owned items
        if (!(itemData.data.slug as string | null) && actorData) {
            itemData.data.slug = null;
        }

        // Add rule elements
        if (!Array.isArray(itemData.data.rules)) {
            itemData.data.rules = [];
        }

        // Add custom trait field
        if (!itemData.data.traits.custom) {
            itemData.data.traits.custom = '';
        }
        // Add rarity trait field
        if (!itemData.data.traits.rarity) {
            itemData.data.traits.rarity = { value: 'common' };
        }

        // Add item-identification property
        if (isPhysicalItem(itemData) && !itemData.data.identification) {
            const withoutIdentifyData: { identification: { status: string } } = itemData.data;
            withoutIdentifyData.identification.status = 'identified';
        }

        // Add hasCounteractCheck property
        if (itemData.type === 'spell' && !itemData.data.hasCounteractCheck) {
            itemData.data.hasCounteractCheck = { value: false };
        }

        // Remove unused fields
        if (itemData.type === 'lore' && (('featType' in itemData.data) as { featType?: string })) {
            delete (itemData.data as { featType?: string }).featType;
        }
        if (itemData.type === 'action') {
            if (('skill_requirements' in itemData.data) as { skill_requirements?: unknown }) {
                delete (itemData.data as { skill_requirements?: unknown }).skill_requirements;
            }
        }
        if (itemData.type === 'action') {
            if (('skill_requirement' in itemData.data) as { skill_requirement?: unknown }) {
                delete (itemData.data as { skill_requirement?: unknown }).skill_requirement;
            }
        }
    }
}
