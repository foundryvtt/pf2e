import { LocalizePF2e } from '@module/system/localize';
import { addSign } from '@module/utils';
import { TRADITION_TRAITS } from '../data/values';
import { PhysicalItemPF2e } from '../physical';
import { getArmorBonus } from '../runes';
import { ArmorCategory, ArmorData, ArmorGroup, BaseArmorType } from './data';

export class ArmorPF2e extends PhysicalItemPF2e {
    static override get schema(): typeof ArmorData {
        return ArmorData;
    }

    override isStackableWith(item: PhysicalItemPF2e): boolean {
        if (this.isEquipped || item.isEquipped) return false;
        return super.isStackableWith(item);
    }

    get isShield(): boolean {
        return this.data.data.armorType.value === 'shield';
    }

    get isArmor(): boolean {
        return !this.isShield;
    }

    get isSpecific(): boolean {
        return this.data.data.specific?.value ?? false;
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
        return this.isShield && this.isBroken ? 0 : baseArmor + (potencyRune ?? 0);
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

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Add traits from potency rune
        const baseTraits = this.data.data.traits.value;
        const fromRunes: ('invested' | 'abjuration')[] = this.data.data.potencyRune.value
            ? ['invested', 'abjuration']
            : [];
        const hasTraditionTraits = TRADITION_TRAITS.some((trait) => baseTraits.includes(trait));
        const magicTraits: 'magical'[] = fromRunes.length > 0 && !hasTraditionTraits ? ['magical'] : [];
        this.data.data.traits.value = Array.from(new Set([...baseTraits, ...fromRunes, ...magicTraits]));
    }

    override getChatData(this: Embedded<ArmorPF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const data = this.data.data;
        const localize = game.i18n.localize.bind(game.i18n);
        const properties = [
            CONFIG.PF2E.armorTypes[this.category],
            this.group ? CONFIG.PF2E.armorGroups[this.group] : null,
            `${addSign(getArmorBonus(data))} ${localize('PF2E.ArmorArmorLabel')}`,
            `${data.dex.value || 0} ${localize('PF2E.ArmorDexLabel')}`,
            `${data.check.value || 0} ${localize('PF2E.ArmorCheckLabel')}`,
            `${data.speed.value || 0} ${localize('PF2E.ArmorSpeedLabel')}`,
            data.equipped.value ? localize('PF2E.ArmorEquippedLabel') : null,
        ].filter((property) => property);

        return this.processChatData(htmlOptions, {
            ...data,
            properties,
            traits: this.traitChatData(CONFIG.PF2E.armorTraits),
        });
    }

    override generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
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
    readonly data: ArmorData;
}
