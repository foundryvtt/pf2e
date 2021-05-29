import { PhysicalItemPF2e } from '../physical';
import { TRADITION_TRAITS } from '../data/values';
import { getAttackBonus } from '../runes';
import { LocalizePF2e } from '@module/system/localize';
import { BaseWeaponType, WeaponCategory, WeaponData, WeaponGroup } from './data';

export class WeaponPF2e extends PhysicalItemPF2e {
    /** @override */
    static get schema(): typeof WeaponData {
        return WeaponData;
    }

    /** @override */
    isStackableWith(item: PhysicalItemPF2e): boolean {
        const equippedButStackable = ['bomb', 'dart'].includes(this.group ?? '');
        if ((this.isEquipped || item.isEquipped) && !equippedButStackable) return false;
        return super.isStackableWith(item);
    }

    get baseType(): BaseWeaponType | null {
        return this.data.data.baseItem ?? null;
    }

    get group(): WeaponGroup | null {
        return this.data.data.group.value || null;
    }

    get category(): WeaponCategory | null {
        return this.data.data.weaponType.value || null;
    }

    /** @override */
    prepareBaseData(): void {
        super.prepareBaseData();

        const baseTraits = this.data.data.traits.value;
        const fromRunes: 'evocation'[] = this.data.data.potencyRune.value ? ['evocation'] : [];
        const hasTraditionTraits = TRADITION_TRAITS.some((trait) => baseTraits.includes(trait));
        const magicTraits: 'magical'[] = fromRunes.length > 0 && !hasTraditionTraits ? ['magical'] : [];
        this.data.data.traits.value = Array.from(new Set([...baseTraits, ...fromRunes, ...magicTraits]));

        // Set these again in case the above would entail different values
        this.data.isMagical = this.isMagical;
        this.data.isInvested = this.isInvested;
    }

    getChatData(this: Embedded<WeaponPF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        const data = this.data.data;
        const actorData = this.actor.data;
        const twohandedRegex = '(\\btwo-hand\\b)-(d\\d+)';
        const twohandedTrait = data.traits.value.find((trait: string) => trait.match(twohandedRegex)) !== undefined;
        const traits = this.traitChatData(CONFIG.PF2E.weaponTraits);

        // calculate attackRoll modifier (for _onItemSummary)
        const isFinesse = this.traits.has('finesse');
        const abl =
            isFinesse && actorData.data.abilities.dex.mod > actorData.data.abilities.str.mod
                ? 'dex'
                : data.ability.value || 'str';

        const prof = data.weaponType.value || 'simple';
        // if a default martial proficiency then lookup the martial value, else find the martialSkill item and get the value from there.
        const proficiency = {
            type: 'default',
            value: 0,
        };
        if (Object.keys(CONFIG.PF2E.weaponTypes).includes(prof)) {
            proficiency.type = 'martial';
            proficiency.value = (actorData.data as any).martial?.[prof]?.value || 0;
        } else {
            console.warn(`PF2E | Could not find martial skill for ${prof}`);
        }

        const properties = [data.group.value ? CONFIG.PF2E.weaponGroups[data.group.value] : null].filter(
            (property) => property,
        );

        const { map2, map3 } = this.calculateMap();

        return this.processChatData(htmlOptions, {
            ...data,
            traits,
            proficiency,
            properties,
            attackRoll: getAttackBonus(data) + (actorData.data.abilities?.[abl]?.mod ?? 0) + proficiency.value,
            isTwohanded: !!twohandedTrait,
            wieldedTwoHands: !!data.hands.value,
            isFinesse,
            map2,
            map3,
        });
    }

    /** @override */
    generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const translations = LocalizePF2e.translations.PF2E;
        const base = this.baseType ? translations.Weapon.Base[this.baseType] : null;
        const group = this.group ? CONFIG.PF2E.weaponGroups[this.group] : null;
        const fallback = 'ITEM.TypeWeapon';
        const itemType = game.i18n.localize(base ?? group ?? fallback);

        if (typeOnly) return itemType;

        const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
    }
}

export interface WeaponPF2e {
    readonly data: WeaponData;
}
