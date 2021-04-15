import { ErrorPF2e } from '@module/utils';
import { ConsumableData } from './data-definitions';
import { PhysicalItemPF2e } from './physical';
import { SpellPF2e } from './spell';
import { SpellcastingEntryPF2e } from './spellcasting-entry';

export class ConsumablePF2e extends PhysicalItemPF2e {
    /**
     * Loads the associated spell for wand/scroll consumables, and returns it.
     */
    loadStoredSpell() {
        if (!this.actor) {
            throw ErrorPF2e('Only spells from owned consumables can be cast.');
        }

        // Currently it looks at nested item data, in the future this might use an "item link"
        const innerSpellData = this.data.data.spell?.data;
        if (innerSpellData) {
            const spell = SpellPF2e.createOwned(innerSpellData, this.actor);

            // If there's no proficiency set, set one up
            if (this.actor && !spell.data.data.location.value) {
                const spellcastingEntries = this.actor.itemTypes.spellcastingEntry
                    .filter((i) => ['prepared', 'spontaneous'].includes(i.data.data.prepared.value))
                    .filter((i) => spell?.data.data.traditions.value.includes(i.data.data.tradition.value));

                let maxEntry: SpellcastingEntryPF2e = spellcastingEntries[0];
                for (const entry of spellcastingEntries) {
                    if (entry.data.data.spelldc?.value > maxEntry.data.data.spelldc?.value) {
                        maxEntry = entry;
                    }
                }

                spell.data.data.location.value = maxEntry?.id;
            }

            return spell;
        }

        return null;
    }

    rollSpellAttack(event: JQuery.ClickEvent, multiAttackPenalty?: number) {
        const spell = this.loadStoredSpell();
        if (!spell) {
            throw new Error('Wrong item type!');
        }

        return spell.rollSpellAttack(event, multiAttackPenalty);
    }

    rollSpellDamage(event: JQuery.ClickEvent) {
        const spell = this.loadStoredSpell();
        if (!spell) {
            throw new Error('Wrong item type!');
        }

        return spell.rollSpellDamage(event);
    }

    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = this.data.data;
        const localize = game.i18n.localize.bind(game.i18n);
        const consumableType = CONFIG.PF2E.consumableTypes[data.consumableType.value];
        return this.processChatData(htmlOptions, {
            ...data,
            consumableType: {
                ...data.consumableType,
                str: consumableType,
            },
            properties: [
                consumableType,
                `${data.charges.value}/${data.charges.max} ${localize('PF2E.ConsumableChargesLabel')}`,
            ],
            hasCharges: data.charges.value >= 0,
        });
    }
}

export interface ConsumablePF2e {
    data: ConsumableData;
    _data: ConsumableData;
}
