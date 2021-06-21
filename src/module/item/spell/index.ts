import { ItemPF2e } from '@item/index';
import { SpellcastingEntryPF2e } from '@item/spellcasting-entry';
import { ordinal, toNumber } from '@module/utils';
import { SpellData } from './data';

export class SpellPF2e extends ItemPF2e {
    static override get schema(): typeof SpellData {
        return SpellData;
    }

    get spellcasting(): SpellcastingEntryPF2e | undefined {
        const spellcastingId = this.data.data.location.value;
        return this.actor?.itemTypes.spellcastingEntry.find((entry) => entry.id === spellcastingId);
    }

    get level() {
        return this.data.data.level.value;
    }

    get isCantrip(): boolean {
        return this.data.isCantrip;
    }

    get isFocusSpell() {
        return this.data.isFocusSpell;
    }

    get isRitual(): boolean {
        return this.data.isRitual;
    }

    get components() {
        const components = this.data.data.components;
        const results: string[] = [];
        if (components.material) results.push(game.i18n.localize('PF2E.SpellComponentShortM'));
        if (components.somatic) results.push(game.i18n.localize('PF2E.SpellComponentShortS'));
        if (components.verbal) results.push(game.i18n.localize('PF2E.SpellComponentShortV'));
        return {
            ...components,
            value: results.join(''),
        };
    }

    override prepareBaseData() {
        super.prepareBaseData();
        this.data.isCantrip = this.data.data.level.value === 0;
        this.data.isFocusSpell = this.data.data.category.value === 'focus';
        this.data.isRitual = this.data.data.category.value === 'ritual';
    }

    override getChatData(
        this: Embedded<SpellPF2e>,
        htmlOptions: EnrichHTMLOptions = {},
        rollOptions: { spellLvl?: number } = {},
    ) {
        const localize: Localization['localize'] = game.i18n.localize.bind(game.i18n);
        const systemData = this.data.data;

        const spellcastingData = this.data.data.trickMagicItemData ?? this.spellcasting?.data;
        if (!spellcastingData) {
            console.warn(
                `PF2e System | Oprhaned spell ${this.name} (${this.id}) on actor ${this.actor.name} (${this.actor.id})`,
            );
            return systemData;
        }

        const spellDC =
            'dc' in spellcastingData.data
                ? spellcastingData.data.dc?.value ?? spellcastingData.data.spelldc.dc
                : spellcastingData.data.spelldc.dc;
        const spellAttack =
            'attack' in spellcastingData.data
                ? spellcastingData.data.attack?.value ?? spellcastingData.data.spelldc.value
                : spellcastingData.data.spelldc.value;

        const isAttack = systemData.spellType.value === 'attack';
        const isSave = systemData.spellType.value === 'save' || systemData.save.value !== '';

        // Spell saving throw text and DC
        const save = duplicate(this.data.data.save);
        save.dc = isSave ? spellDC : spellAttack;
        save.str = systemData.save.value ? game.i18n.localize(CONFIG.PF2E.saves[systemData.save.value]) : '';

        // Spell attack labels
        const damageLabel =
            systemData.spellType.value === 'heal' ? localize('PF2E.SpellTypeHeal') : localize('PF2E.DamageLabel');

        const area = (() => {
            if (systemData.area.value) {
                const areaSize = game.i18n.localize(CONFIG.PF2E.areaSizes[systemData.area.value] ?? '');
                const areaType = game.i18n.localize(CONFIG.PF2E.areaTypes[systemData.area.areaType] ?? '');
                return `${localize('PF2E.SpellAreaLabel')}: ${areaSize} ${areaType}`.trim();
            }

            return null;
        })();

        const baseLevel = Math.max(1, systemData.level.value);
        const level = Math.max(1, toNumber((rollOptions || {}).spellLvl ?? systemData.heightenedLevel?.value) ?? 1);
        const heightened = (level ?? baseLevel) - baseLevel;
        const levelLabel = (() => {
            const category = this.isCantrip
                ? localize('PF2E.TraitCantrip')
                : localize(CONFIG.PF2E.spellCategories[this.data.data.category.value]);
            return game.i18n.format('PF2E.SpellLevel', { category, level });
        })();

        // Combine properties
        const properties: string[] = [
            heightened ? game.i18n.format('PF2E.SpellLevelBase', { level: ordinal(baseLevel) }) : null,
            heightened ? game.i18n.format('PF2E.SpellLevelHeightened', { heightened }) : null,
            `${localize('PF2E.SpellComponentsLabel')}: ${this.components.value}`,
            systemData.range.value ? `${localize('PF2E.SpellRangeLabel')}: ${systemData.range.value}` : null,
            systemData.target.value ? `${localize('PF2E.SpellTargetLabel')}: ${systemData.target.value}` : null,
            area,
            systemData.time.value ? `${localize('PF2E.SpellTimeLabel')}: ${systemData.time.value}` : null,
            systemData.duration.value ? `${localize('PF2E.SpellDurationLabel')}: ${systemData.duration.value}` : null,
        ].filter((p): p is string => p !== null);

        const traits = this.traitChatData(CONFIG.PF2E.spellTraits);

        return this.processChatData(htmlOptions, {
            ...systemData,
            save,
            isAttack,
            isSave,
            spellLvl: level,
            levelLabel,
            damageLabel,
            properties,
            traits,
        });
    }
}

export interface SpellPF2e {
    readonly data: SpellData;
}
