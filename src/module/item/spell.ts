import { ItemPF2e } from './base';
import { SpellData } from './data-definitions';

export class SpellPF2e extends ItemPF2e {
    // todo: does this still have a point? If not, remove it
    getSpellInfo() {
        return this.getChatData();
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

        return this.processChatData(data, htmlOptions);
    }
}

export interface SpellPF2e {
    data: SpellData;
    _data: SpellData;
}
