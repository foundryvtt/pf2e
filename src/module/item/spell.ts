import { ModifierPF2e } from '@module/modifiers';
import { DicePF2e } from '@scripts/dice';
import { ItemPF2e, RollAttackOptions, RollDamageOptions } from './base';
import { SpellcastingEntryData, SpellData } from './data-definitions';
import { SpellFacade } from './spell-facade';

export class SpellPF2e extends ItemPF2e {
    // todo: does this still have a point? If not, remove it
    getSpellInfo() {
        return this.getChatData();
    }

    /**
     * Roll Spell Damage
     */
    rollAttack({ event, multiAttackPenalty = 1 }: RollAttackOptions, overrideData?: SpellData) {
        const data = overrideData ?? this.data;
        if (!this.actor) throw new Error('Attempted to cast a spell without an actor');

        // Prepare roll data
        const trickMagicItemData = data.data.trickMagicItemData;
        const itemData = data.data;
        const rollData = duplicate(this.actor.data.data);
        const spellcastingEntry =
            (this.actor.data.items.find((item) => item._id === itemData.location.value) as SpellcastingEntryData) ??
            (this.actor.getOwnedItem(itemData.location.value)?.data as SpellcastingEntryData);
        let useTrickData = false;
        if (spellcastingEntry?.type !== 'spellcastingEntry') useTrickData = true;

        if (useTrickData && !trickMagicItemData)
            throw new Error('Spell points to location that is not a spellcasting type');

        // calculate multiple attack penalty
        const map = this.calculateMap();

        if (spellcastingEntry.data?.attack?.roll) {
            const options = this.actor.getRollOptions(['all', 'attack-roll', 'spell-attack-roll']);
            const modifiers: ModifierPF2e[] = [];
            if (multiAttackPenalty > 1) {
                const mapKey = multiAttackPenalty === 2 ? 'map2' : 'map3';
                modifiers.push(new ModifierPF2e(map.label, map[mapKey], 'untyped'));
            }
            spellcastingEntry.data.attack.roll({ event, options, modifiers });
        } else {
            const spellAttack = useTrickData
                ? trickMagicItemData?.data.spelldc.value
                : spellcastingEntry?.data.spelldc.value;
            const parts: number[] = [spellAttack ?? 0];
            const title = `${this.name} - Spell Attack Roll`;

            const traits = this.actor.data.data.traits.traits.value;
            if (traits.some((trait) => trait === 'elite')) {
                parts.push(2);
            } else if (traits.some((trait) => trait === 'weak')) {
                parts.push(-2);
            }

            if (multiAttackPenalty === 2) parts.push(map.map2);
            else if (multiAttackPenalty === 3) parts.push(map.map3);

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
                    top: event.clientY ? event.clientY - 80 : 400,
                    left: window.innerWidth - 710,
                },
            });
        }
    }

    rollDamage({ event }: RollDamageOptions, overrideData?: SpellData) {
        if (!this.actor) return;

        // Get data
        const data = overrideData ?? this.data;
        const itemData = data.data;
        const rollData = duplicate(this.actor.data.data) as any;
        const isHeal = itemData.spellType.value === 'heal';
        const dtype = CONFIG.PF2E.damageTypes[itemData.damageType.value];

        const spellLvl = ItemPF2e.findSpellLevel(event);
        const spell = new SpellFacade(data, { castingActor: this.actor, castLevel: spellLvl });
        const parts = spell.damageParts;

        // Append damage type to title
        const damageLabel = game.i18n.localize(isHeal ? 'PF2E.SpellTypeHeal' : 'PF2E.DamageLabel');
        let title = `${this.name} - ${damageLabel}`;
        if (dtype && !isHeal) title += ` (${dtype})`;

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
                top: event.clientY ? event.clientY - 80 : 400,
                left: window.innerWidth - 710,
            },
        });
    }

    getChatData(htmlOptions?: Record<string, boolean>, rollOptions?: any) {
        if (!this.actor) {
            return {};
        }
        const localize: Localization['localize'] = game.i18n.localize.bind(game.i18n);
        if (this.data.type != 'spell')
            throw new Error("Tried to create spell chat data from an item that wasn't a spell");
        const data = duplicate(this.data.data);

        const spellcastingEntry = this.actor.itemTypes.spellcastingEntry.find(
            (entry) => entry.id === data.location.value,
        );
        const entryData = spellcastingEntry?.data;
        if (!entryData) return {};

        let spellDC = entryData.data.dc?.value ?? entryData.data.spelldc.dc;
        let spellAttack = entryData.data.attack?.value ?? entryData.data.spelldc.value;

        const traits = this.actor.data.data.traits.traits.value;
        if (traits.some((trait) => trait === 'elite')) {
            spellDC = Number(spellDC) + 2;
            spellAttack = Number(spellAttack) + 2;
        } else if (traits.some((trait) => trait === 'weak')) {
            spellDC = Number(spellDC) - 2;
            spellAttack = Number(spellAttack) - 2;
        }

        // Spell saving throw text and DC
        data.isSave = data.spellType.value === 'save' || data.save.value !== '';
        data.save.dc = data.isSave ? spellDC : spellAttack;
        data.save.str = data.save.value ? CONFIG.PF2E.saves[data.save.value.toLowerCase()] : '';

        // Spell attack labels
        data.damageLabel =
            data.spellType.value === 'heal' ? localize('PF2E.SpellTypeHeal') : localize('PF2E.DamageLabel');
        data.isAttack = data.spellType.value === 'attack';

        // Combine properties
        const props: (number | string)[] = [
            CONFIG.PF2E.spellLevels[data.level.value],
            `${localize('PF2E.SpellComponentsLabel')}: ${data.components.value}`,
            data.range.value ? `${localize('PF2E.SpellRangeLabel')}: ${data.range.value}` : null,
            data.target.value ? `${localize('PF2E.SpellTargetLabel')}: ${data.target.value}` : null,
            data.area.value
                ? `${localize('PF2E.SpellAreaLabel')}: ${CONFIG.PF2E.areaSizes[data.area.value]} ${
                      CONFIG.PF2E.areaTypes[data.area.areaType]
                  }`
                : null,
            data.areasize?.value ? `${localize('PF2E.SpellAreaLabel')}: ${data.areasize.value}` : null,
            data.time.value ? `${localize('PF2E.SpellTimeLabel')}: ${data.time.value}` : null,
            data.duration.value ? `${localize('PF2E.SpellDurationLabel')}: ${data.duration.value}` : null,
        ];
        data.spellLvl = (rollOptions || {}).spellLvl ?? data.heightenedLevel?.value;
        const spellLvl = parseInt(data.spellLvl ?? '0', 10);
        if (data.level.value < spellLvl) {
            props.push(`Heightened: +${spellLvl - data.level.value}`);
        }
        data.properties = props.filter((p) => p !== null);
        data.traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.spellTraits) as any;

        return this.processChatData(htmlOptions, data);
    }
}

export interface SpellPF2e {
    data: SpellData;
    _data: SpellData;
}
