import { ItemPF2e } from './base';
import { SpellData } from './data/types';
import { SpellcastingEntryPF2e } from '@item/spellcasting-entry';
import { ErrorPF2e } from '@module/utils';

export class SpellPF2e extends ItemPF2e {
    get castingAbility(): SpellcastingEntryPF2e {
        if (!this.actor) throw ErrorPF2e('Only owned spells be can associated with casting abilities');

        const spellcastingId = this.data.data.location.value;
        const castingAbility = this.actor.items.find((entry) => entry.id === spellcastingId);
        if (!(castingAbility instanceof SpellcastingEntryPF2e)) {
            // This is an orphaned spell and effectively dead data on the actor.
            // No offense intended to actual orphans: please don't delete yourselves!
            this.delete();
            throw ErrorPF2e('Spell ${this.name} (${this.id}) is orphaned: deleting');
        }

        return castingAbility;
    }

    get level(): number {
        return this.data.data.level.value;
    }

    get heightenedLevel(): number {
        return this.data.data.heightenedLevel?.value ?? this.level;
    }

    get isCantrip(): boolean {
        return this.level === 0;
    }

    get isFocusSpell(): boolean {
        return this.data.data.category.value === 'focus';
    }

    get isRitual(): boolean {
        return this.data.data.category.value === 'ritual';
    }

    prepareData(): void {
        super.prepareData();

        // Avoid filling up the console with error notifications from pre-migrated data
        if (!this.data.data.category) return;

        this.data.isCantrip = this.isCantrip;
        this.data.isFocusSpell = this.isFocusSpell;
        this.data.isRitual = this.isRitual;
    }

    getChatData(this: Owned<SpellPF2e>, htmlOptions: EnrichHTMLOptions = {}, rollOptions: { spellLvl?: number } = {}) {
        const localize: Localization['localize'] = game.i18n.localize.bind(game.i18n);
        const data = this.data.data;

        const spellcastingEntryData = this.castingAbility?.data;
        let spellDC = spellcastingEntryData?.data.dc?.value ?? spellcastingEntryData?.data.spelldc.dc;
        let spellAttack = spellcastingEntryData?.data.attack?.value ?? spellcastingEntryData?.data.spelldc.value;

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
        save.str = data.save.value ? game.i18n.localize(CONFIG.PF2E.saves[data.save.value]) : '';

        // Spell attack labels
        const damageLabel =
            data.spellType.value === 'heal' ? localize('PF2E.SpellTypeHeal') : localize('PF2E.DamageLabel');

        const area = (() => {
            if (data.area.value) {
                const areaSize = game.i18n.localize(CONFIG.PF2E.areaSizes[data.area.value] ?? '');
                const areaType = game.i18n.localize(CONFIG.PF2E.areaTypes[data.area.areaType] ?? '');
                return `${localize('PF2E.SpellAreaLabel')}: ${areaSize} ${areaType}`.trim();
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

        const traits = this.traitChatData(CONFIG.PF2E.spellTraits);

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
