import { ItemPF2e } from '@item/base';
import { SpellcastingEntryPF2e } from '@item/spellcasting-entry';
import { ordinal, toNumber } from '@module/utils';
import { SpellData, SpellTrait } from './data';

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

    private computeCastLevel(castLevel?: number) {
        const isAutoScaling = this.isCantrip || this.isFocusSpell;
        if (isAutoScaling && this.actor) {
            return (
                this.data.data.autoHeightenLevel.value ||
                this.spellcasting?.data.data.autoHeightenLevel.value ||
                Math.ceil(this.actor.level / 2)
            );
        }

        // Spells cannot go lower than base level
        return Math.max(this.level, castLevel ?? this.level);
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

    get damage() {
        return this.data.data.damage;
    }

    get damageValue() {
        if (this.damage.value && this.damage.value !== '' && this.damage.value !== '0') {
            return this.damage.value;
        }
        return null;
    }

    computeDamageParts(castLevel?: number) {
        castLevel = this.computeCastLevel(castLevel);
        const parts: (string | number)[] = [];
        if (this.damageValue) parts.push(this.damage.value);
        if (this.damage.applyMod && this.actor) {
            const entry = this.spellcasting;
            if (!entry && this.data.data.trickMagicItemData) {
                parts.push(this.actor.getAbilityMod(this.data.data.trickMagicItemData.ability));
            } else if (entry) {
                parts.push(this.actor.getAbilityMod(entry.ability));
            }
        }
        if (this.data.data.duration.value === '' && this.actor) {
            const hasDangerousSorcery = this.actor.itemTypes.feat.some((feat) => feat.slug === 'dangerous-sorcery');
            if (hasDangerousSorcery && !this.isFocusSpell && !this.isCantrip) {
                console.debug(`PF2e System | Adding Dangerous Sorcery spell damage for ${this.data.name}`);
                parts.push(castLevel);
            }
        }
        return parts.concat(this.computeHeightenedParts(castLevel));
    }

    get scaling() {
        return this.data.data?.scaling || { formula: '', mode: '' };
    }

    private computeHeightenedParts(castLevel: number) {
        const heighteningModes: Record<string, number> = {
            level1: 1,
            level2: 2,
            level3: 3,
            level4: 4,
        };

        let parts: string[] = [];
        if (this.scaling.formula !== '') {
            const heighteningDivisor: number = heighteningModes[this.scaling.mode];
            if (heighteningDivisor) {
                let effectiveSpellLevel = 1;
                if (this.level > 0 && this.level < 11) {
                    effectiveSpellLevel = this.level;
                }
                let partCount = castLevel - effectiveSpellLevel;
                partCount = Math.floor(partCount / heighteningDivisor);
                parts = Array(partCount).fill(this.scaling.formula);
            }
        }
        return parts;
    }

    override prepareBaseData() {
        super.prepareBaseData();
        this.data.isFocusSpell = this.data.data.category.value === 'focus';
        this.data.isRitual = this.data.data.category.value === 'ritual';
        this.data.isCantrip = this.traits.has('cantrip') && !this.data.isRitual;
    }

    override getChatData(
        this: Embedded<SpellPF2e>,
        htmlOptions: EnrichHTMLOptions = {},
        rollOptions: { spellLvl?: number | string } = {},
    ): Record<string, unknown> {
        const localize: Localization['localize'] = game.i18n.localize.bind(game.i18n);
        const systemData = this.data.data;

        const spellcastingData = this.data.data.trickMagicItemData ?? this.spellcasting?.data;
        if (!spellcastingData) {
            console.warn(
                `PF2e System | Oprhaned spell ${this.name} (${this.id}) on actor ${this.actor.name} (${this.actor.id})`,
            );
            return { ...systemData };
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

        const baseLevel = systemData.level.value;
        const level = this.computeCastLevel(toNumber(rollOptions?.spellLvl) ?? systemData.heightenedLevel?.value);
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

    get traits(): Set<SpellTrait>;
}
