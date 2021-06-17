import { ItemPF2e } from '@item/index';
import { SpellcastingEntryPF2e } from '@item/spellcasting-entry';
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

        let spellDC =
            'dc' in spellcastingData.data
                ? spellcastingData.data.dc?.value ?? spellcastingData.data.spelldc.dc
                : spellcastingData.data.spelldc.dc;
        let spellAttack =
            'attack' in spellcastingData.data
                ? spellcastingData.data.attack?.value ?? spellcastingData.data.spelldc.value
                : spellcastingData.data.spelldc.value;

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

        const components: string[] = [];
        if (systemData.components.material) components.push('M');
        if (systemData.components.somatic) components.push('S');
        if (systemData.components.verbal) components.push('V');

        // Combine properties
        const properties: string[] = [
            localize(CONFIG.PF2E.spellLevels[systemData.level.value]),
            `${localize('PF2E.SpellComponentsLabel')}: ${components.join('')}`,
            systemData.range.value ? `${localize('PF2E.SpellRangeLabel')}: ${systemData.range.value}` : null,
            systemData.target.value ? `${localize('PF2E.SpellTargetLabel')}: ${systemData.target.value}` : null,
            area,
            systemData.time.value ? `${localize('PF2E.SpellTimeLabel')}: ${systemData.time.value}` : null,
            systemData.duration.value ? `${localize('PF2E.SpellDurationLabel')}: ${systemData.duration.value}` : null,
        ].filter((p): p is string => p !== null);

        const spellLvl = (rollOptions || {}).spellLvl ?? systemData.heightenedLevel?.value;
        const castedLevel = Number(spellLvl ?? 0);
        if (systemData.level.value < castedLevel) {
            properties.push(`Heightened: +${castedLevel - systemData.level.value}`);
        }

        const traits = this.traitChatData(CONFIG.PF2E.spellTraits);

        return this.processChatData(htmlOptions, {
            ...systemData,
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
    readonly data: SpellData;
}
