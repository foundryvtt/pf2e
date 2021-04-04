import { ConsumableData } from './data-definitions';
import { PhysicalItemPF2e } from './physical';
import { SpellPF2e } from './spell';
import { SpellcastingEntryPF2e } from './spellcasting-entry';

export class ConsumablePF2e extends PhysicalItemPF2e {
    /**
     * Loads the associated spell for wand/scroll consumables, and returns it.
     */
    async loadSpell() {
        // Currently it looks at nested item data, in the future this might use an "item link"
        const innerSpellData = this.data.data.spell?.data;
        let spell: SpellPF2e | null = null;
        if (innerSpellData) {
            spell = await SpellPF2e.create(innerSpellData, { temporary: true });
            spell.options.actor = this.actor; // in 0.8, pass it in using the parent option above
        }

        // If there's no proficiency set, set one up
        if (spell && this.actor && !spell.data.data.location.value) {
            const allSpellcastingEntries = this.actor.items.filter(
                (i) => i instanceof SpellcastingEntryPF2e,
            ) as SpellcastingEntryPF2e[];

            const spellcastingEntries = allSpellcastingEntries
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

    async rollSpellAttack(event: JQuery.ClickEvent, multiAttackPenalty?: number) {
        const spell = await this.loadSpell();
        if (!spell) {
            throw new Error('Wrong item type!');
        }

        return spell.rollSpellAttack(event, multiAttackPenalty);
    }

    async rollSpellDamage(event: JQuery.ClickEvent) {
        const spell = await this.loadSpell();
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
