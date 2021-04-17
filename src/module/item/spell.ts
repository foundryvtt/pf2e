import { ItemPF2e } from './base';
import { SpellData } from './data-definitions';
import { SpellcastingEntryPF2e } from '@item/spellcasting-entry';
import { SpellFacade } from './spell-facade';
import { DicePF2e } from '@scripts/dice';
import { ModifierPF2e } from '@module/modifiers';

export class SpellPF2e extends ItemPF2e {
    // todo: does this still have a point? If not, remove it
    getSpellInfo() {
        return this.getChatData();
    }

    get spellcasting(): SpellcastingEntryPF2e | undefined {
        const spellcastingId = this.data.data.location.value;
        return this.actor?.itemTypes.spellcastingEntry.find((entry) => entry.id === spellcastingId);
    }

    /**
     * Roll Spell Damage
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollSpellAttack(event: JQuery.ClickEvent, multiAttackPenalty = 1) {
        const item = this.data;
        if (!this.actor) throw new Error('Attempted to cast a spell without an actor');

        // Prepare roll data
        const trickMagicItemData = item.data.trickMagicItemData;
        const rollData = duplicate(this.actor.data.data);
        const spellcastingEntry = this.spellcasting;
        let useTrickData = false;
        if (spellcastingEntry?.type !== 'spellcastingEntry') useTrickData = true;

        if (useTrickData && !trickMagicItemData)
            throw new Error('Spell points to location that is not a spellcasting type');

        // calculate multiple attack penalty
        const map = this.calculateMap();

        if (spellcastingEntry?.attack?.roll) {
            const options = this.actor.getRollOptions(['all', 'attack-roll', 'spell-attack-roll']);
            const modifiers: ModifierPF2e[] = [];
            if (multiAttackPenalty > 1) {
                const mapValue = multiAttackPenalty === 2 ? map.map2 : map.map3;
                modifiers.push(new ModifierPF2e(map.label, mapValue, 'untyped'));
            }
            spellcastingEntry.attack.roll({ event, options, modifiers });
        } else {
            const spellAttack = useTrickData
                ? trickMagicItemData?.data.spelldc.value
                : spellcastingEntry?.data.data.spelldc.value;
            const parts = [Number(spellAttack) || 0];
            const title = `${this.name} - Spell Attack Roll`;

            const traits = this.actor.data.data.traits.traits.value;
            if (traits.some((trait) => trait === 'elite')) {
                parts.push(2);
            } else if (traits.some((trait) => trait === 'weak')) {
                parts.push(-2);
            }

            if (multiAttackPenalty > 1) {
                const mapValue = multiAttackPenalty === 2 ? map.map2 : map.map3;
                parts.push(mapValue);
            }

            // Call the roll helper utility
            DicePF2e.d20Roll({
                event,
                parts,
                data: rollData,
                rollType: 'attack-roll',
                title,
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                dialogOptions: {
                    width: 400,
                    top: event.clientY - 80,
                    left: window.innerWidth - 710,
                },
            });
        }
    }

    /**
     * Roll Spell Damage
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollSpellDamage(event: JQuery.ClickEvent) {
        const item = this.data;
        if (!this.actor) throw new Error('Attempted to cast a spell without an actor');

        // Get data
        const itemData = item.data;
        const rollData = duplicate(this.actor.data.data) as any;
        const isHeal = itemData.spellType.value === 'heal';
        const damageType = game.i18n.localize(CONFIG.PF2E.damageTypes[itemData.damageType.value]);

        const spellLvl = ItemPF2e.findSpellLevel(event);
        const spell = new SpellFacade(item, { castingActor: this.actor, castLevel: spellLvl });
        const parts = spell.damageParts;

        // Append damage type to title
        const damageLabel = game.i18n.localize(isHeal ? 'PF2E.SpellTypeHeal' : 'PF2E.DamageLabel');
        let title = `${this.name} - ${damageLabel}`;
        if (damageType && !isHeal) title += ` (${damageType})`;

        // Add item to roll data
        if (!spell.spellcastingEntry?.data && spell.data.data.trickMagicItemData) {
            rollData.mod = rollData.abilities[spell.data.data.trickMagicItemData.ability].mod;
        } else {
            rollData.mod = rollData.abilities[spell.spellcastingEntry?.ability ?? 'int'].mod;
        }
        rollData.item = itemData;

        if (this.isOwned) {
            const traits = this.actor.data.data.traits.traits.value;
            if (traits.some((trait) => trait === 'elite')) {
                parts.push(4);
            } else if (traits.some((trait) => trait === 'weak')) {
                parts.push(-4);
            }
        }

        // Call the roll helper utility
        DicePF2e.damageRoll({
            event,
            parts,
            data: rollData,
            actor: this.actor,
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event.clientY - 80,
                left: window.innerWidth - 710,
            },
        });
    }

    getChatData(htmlOptions?: Record<string, boolean>, rollOptions: { spellLvl?: number } = {}) {
        if (!this.actor) {
            return {};
        }

        const localize: Localization['localize'] = game.i18n.localize.bind(game.i18n);
        const data = this.data.data;

        const spellcastingEntryData = this.spellcasting?.data;
        if (!spellcastingEntryData) return {};

        let spellDC = spellcastingEntryData.data.dc?.value ?? spellcastingEntryData.data.spelldc.dc;
        let spellAttack = spellcastingEntryData.data.attack?.value ?? spellcastingEntryData.data.spelldc.value;

        // Adjust spell dcs and attacks for elite/weak
        /** @todo: handle elsewhere */
        const actorTraits = this.actor.data.data.traits.traits.value;
        if (actorTraits.some((trait) => trait === 'elite')) {
            spellDC = Number(spellDC) + 2;
            spellAttack = Number(spellAttack) + 2;
        } else if (actorTraits.some((trait) => trait === 'weak')) {
            spellDC = Number(spellDC) - 2;
            spellAttack = Number(spellAttack) - 2;
        }

        const isAttack = data.spellType.value === 'attack';
        const isSave = data.spellType.value === 'save' || data.save.value !== '';

        // Spell saving throw text and DC
        const save = duplicate(this.data.data.save);
        save.dc = isSave ? spellDC : spellAttack;
        save.str = data.save.value ? CONFIG.PF2E.saves[data.save.value.toLowerCase()] : '';

        // Spell attack labels
        const damageLabel =
            data.spellType.value === 'heal' ? localize('PF2E.SpellTypeHeal') : localize('PF2E.DamageLabel');

        // Determine spell area, first using the area object and then falling back to the old areasize structure
        const area = (() => {
            if (data.area.value) {
                const areaSize = game.i18n.localize(CONFIG.PF2E.areaSizes[data.area.value] ?? '');
                const areaType = game.i18n.localize(CONFIG.PF2E.areaTypes[data.area.areaType] ?? '');
                return `${localize('PF2E.SpellAreaLabel')}: ${areaSize} ${areaType}`.trim();
            } else if (data.areasize.value) {
                // This is the fallback for old data
                return `${localize('PF2E.SpellAreaLabel')}: ${data.areasize.value}`;
            }

            return null;
        })();

        // Combine properties
        const properties: string[] = [
            localize(CONFIG.PF2E.spellLevels[data.level.value]),
            `${localize('PF2E.SpellComponentsLabel')}: ${data.components.value}`,
            data.range.value ? `${localize('PF2E.SpellRangeLabel')}: ${data.range.value}` : null,
            data.target.value ? `${localize('PF2E.SpellTargetLabel')}: ${data.target.value}` : null,
            area,
            data.time.value ? `${localize('PF2E.SpellTimeLabel')}: ${data.time.value}` : null,
            data.duration.value ? `${localize('PF2E.SpellDurationLabel')}: ${data.duration.value}` : null,
        ].filter((p): p is string => p !== null);

        const spellLvl = (rollOptions || {}).spellLvl ?? data.heightenedLevel?.value;
        const castedLevel = Number(spellLvl ?? 0);
        if (data.level.value < castedLevel) {
            properties.push(`Heightened: +${castedLevel - data.level.value}`);
        }

        const traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.spellTraits);

        return this.processChatData(htmlOptions, {
            ...data,
            save,
            isAttack,
            isSave,
            spellLvl,
            damageLabel,
            properties,
            traits,
        });
    }
}

export interface SpellPF2e {
    data: SpellData;
    _data: SpellData;
}
