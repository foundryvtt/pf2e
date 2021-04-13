import { ItemPF2e } from './base';
import { EffectArea, SpellData } from './data-definitions';
import { SpellcastingEntryPF2e } from '@item/spellcasting-entry';
import { AreaEffectTemplate } from '@module/canvas/area-effect/template';

export class SpellPF2e extends ItemPF2e {
    get spellcasting(): SpellcastingEntryPF2e | undefined {
        const spellcastingId = this.data.data.location.value;
        return this.actor?.itemTypes.spellcastingEntry.find((entry) => entry.id === spellcastingId);
    }

    get effectArea(): EffectArea {
        return this.data.data.area;
    }

    /** @override */
    async roll(event?: JQuery.TriggeredEvent): Promise<ChatMessage | null> {
        if (this.effectArea) {
            const areaTemplate = AreaEffectTemplate.fromItem(this);
            if (areaTemplate) {
                await areaTemplate.drawPreview();
            }
        }
        return super.roll(event);
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

        // Combine properties
        const properties: (number | string)[] = [
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
        ].filter((p) => p !== null);

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
