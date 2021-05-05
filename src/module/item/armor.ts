import { LocalizePF2e } from '@module/system/localize';
import { addSign } from '@module/utils';
import { ArmorCategory, ArmorData, ArmorGroup, BaseArmorType } from './data/types';
import { PhysicalItemPF2e } from './physical';
import { getArmorBonus } from './runes';

export class ArmorPF2e extends PhysicalItemPF2e {
    /** @override */
    isStackableWith(item: PhysicalItemPF2e): boolean {
        if (this.isEquipped || item.isEquipped) return false;
        return super.isStackableWith(item);
    }

    get isShield(): boolean {
        return this.data.data.armorType.value === 'shield';
    }

    get isArmor(): boolean {
        return !this.isShield;
    }

    get baseType(): BaseArmorType | null {
        return this.data.data.baseItem ?? null;
    }

    get group(): ArmorGroup | null {
        return this.data.data.group.value || null;
    }

    get category(): ArmorCategory {
        return this.data.data.armorType.value;
    }

    get dexCap(): number | null {
        return this.isShield ? null : this.data.data.dex.value;
    }

    get strength(): number | null {
        return this.isShield ? null : this.data.data.strength.value;
    }

    get checkPenalty(): number | null {
        return this.isShield ? null : this.data.data.check.value;
    }

    get speedPenalty(): number {
        return this.data.data.speed.value;
    }

    get acBonus(): number {
        const potencyRune = this.data.data.potencyRune.value;
        const baseArmor = Number(this.data.data.armor.value) || 0;
        return this.isShield && this.isBroken ? 0 : baseArmor + potencyRune;
    }

    get hitPoints(): { current: number; max: number } {
        return {
            current: this.data.data.hp.value,
            max: this.data.data.maxHp.value,
        };
    }

    get hardness(): number {
        return this.data.data.hardness.value;
    }

    get brokenThreshold(): number {
        return this.data.data.brokenThreshold.value;
    }

    get isBroken(): boolean {
        return this.hitPoints.current <= this.brokenThreshold;
    }

    /** @override */
    prepareData() {
        // Add traits from potency rune
        const traditionTraits = ['arcane', 'primal', 'divine', 'occult'];
        const hasPotencyRune = !!this.data.data.potencyRune.value;
        const traits = this.data.data.traits;
        traits.value = [
            ...traits.value,
            hasPotencyRune ? ['invested', 'abjuration'] : [],
            hasPotencyRune && !traditionTraits.some((trait) => traits.value.includes(trait)) ? 'magical' : [],
        ].flat();

        traits.value = Array.from(new Set(traits.value));

        super.prepareData();
    }

    getChatData(this: Owned<ArmorPF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        const data = this.data.data;
        const localize = game.i18n.localize.bind(game.i18n);
        const properties = [
            CONFIG.PF2E.armorTypes[this.category],
            this.group ? CONFIG.PF2E.armorGroups[this.group] : null,
            `${addSign(getArmorBonus(data))} ${localize('PF2E.ArmorArmorLabel')}`,
            `${data.dex.value || 0} ${localize('PF2E.ArmorDexLabel')}`,
            `${data.check.value || 0} ${localize('PF2E.ArmorCheckLabel')}`,
            `${data.speed.value || 0} ${localize('PF2E.ArmorSpeedLabel')}`,
            ...data.traits.value,
            data.equipped.value ? localize('PF2E.ArmorEquippedLabel') : null,
        ].filter((property) => property);

        return this.processChatData(htmlOptions, { ...data, properties, traits: null });
    }

    /** @override */
    generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const translations = LocalizePF2e.translations.PF2E;
        const base = this.baseType ? translations.Item.Armor.Base[this.baseType] : null;
        const group = this.group ? CONFIG.PF2E.armorGroups[this.group] : null;
        const fallback = this.isShield ? 'PF2E.ArmorTypeShield' : 'ITEM.TypeArmor';

        const itemType = game.i18n.localize(base ?? group ?? fallback);

        if (typeOnly) return itemType;

        const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
    }
}

export interface ArmorPF2e {
    data: ArmorData;
    _data: ArmorData;
}
