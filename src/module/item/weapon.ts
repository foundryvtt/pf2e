import { PhysicalItemPF2e } from './physical';
import { BaseWeaponType, WeaponCategory, WeaponData, WeaponGroup } from './data/types';
import { ProficiencyModifier } from '@module/modifiers';
import { getAttackBonus } from './runes';
import { LocalizePF2e } from '@module/system/localize';

export class WeaponPF2e extends PhysicalItemPF2e {
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
    prepareData() {
        /** Prevent unhandled exceptions on pre-migrated data */
        this.data.data.traits.rarity ??= { value: 'common' };

        // Add trait(s) from potency rune
        const traditionTraits = ['arcane', 'primal', 'divine', 'occult'] as const;
        const hasPotencyRune = !!this.data.data.potencyRune.value;
        const traits: { value: string[] } = this.data.data.traits;

        traits.value = [
            ...traits.value,
            hasPotencyRune ? 'evocation' : [],
            hasPotencyRune && !traditionTraits.some((trait) => traits.value.includes(trait)) ? 'magical' : [],
        ].flat();

        traits.value = Array.from(new Set(traits.value));

        // Update this value now that derived traits are set
        this.data.isInvested = this.isInvested;

        super.prepareData();
    }

    getChatData(this: Owned<WeaponPF2e>, htmlOptions: EnrichHTMLOptions = {}) {
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
            try {
                const martialSkill = this.actor?.getOwnedItem(prof);
                if (martialSkill?.data.type === 'martial') {
                    proficiency.type = 'skill';
                    const rank = martialSkill.data.data.proficient?.value || 0;
                    proficiency.value = ProficiencyModifier.fromLevelAndRank(
                        this.actor.data.data.details.level.value,
                        rank,
                    ).modifier;
                }
            } catch (err) {
                console.log(`PF2E | Could not find martial skill for ${prof}`);
            }
        }

        const critSpecialization = data.group.value
            ? {
                  label: CONFIG.PF2E.weaponGroups[data.group.value],
                  description: CONFIG.PF2E.weaponDescriptions[data.group.value],
              }
            : undefined;

        const { map2, map3 } = this.calculateMap();

        return this.processChatData(htmlOptions, {
            ...data,
            traits,
            proficiency,
            attackRoll: getAttackBonus(data) + (actorData.data.abilities?.[abl]?.mod ?? 0) + proficiency.value,

            critSpecialization,
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
    data: WeaponData;
    _data: WeaponData;
}
