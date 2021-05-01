import { PhysicalItemPF2e } from './physical';
import { BaseWeaponKey, WeaponCategoryKey, WeaponData, WeaponGroupKey } from './data-definitions';
import { ProficiencyModifier } from '@module/modifiers';
import { getAttackBonus } from './runes';
import { LocalizePF2e } from '@module/system/localize';

export class WeaponPF2e extends PhysicalItemPF2e {
    get baseType(): BaseWeaponKey | null {
        return this.data.data.baseItem ?? null;
    }

    get group(): WeaponGroupKey | null {
        return this.data.data.group.value ?? null;
    }

    get category(): WeaponCategoryKey | null {
        return this.data.data.weaponType.value ?? null;
    }

    /** @override */
    prepareData() {
        super.prepareData();

        // Add trait(s) from potency rune
        const traditionTraits = ['arcane', 'primal', 'divine', 'occult'];
        const hasPotencyRune = !!this.data.data.potencyRune.value;
        const traits = this.data.data.traits;

        traits.value = [
            ...traits.value,
            hasPotencyRune ? 'evocation' : [],
            hasPotencyRune && !traditionTraits.some((trait) => traits.value.includes(trait)) ? 'magical' : [],
        ].flat();

        traits.value = Array.from(new Set(traits.value));
    }

    getChatData(this: Owned<WeaponPF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        if (!this.actor) {
            return {};
        }

        const data = this.data.data;
        const actorData = this.actor.data;
        const twohandedRegex = '(\\btwo-hand\\b)-(d\\d+)';
        const twohandedTrait = data.traits.value.find((trait: string) => trait.match(twohandedRegex)) !== undefined;
        const traits = WeaponPF2e.traitChatData(data.traits, CONFIG.PF2E.weaponTraits);

        if (this.data.type !== 'weapon') {
            throw new Error('tried to create a weapon chat data for a non-weapon item');
        }

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

        const properties = [
            // (parseInt(data.range.value) > 0) ? `${data.range.value} feet` : null,
            // CONFIG.PF2E.weaponTypes[data.weaponType.value],
            // CONFIG.PF2E.weaponGroups[data.group.value]
        ].filter((p) => !!p);

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
            properties,
            map2,
            map3,
        });
    }

    /** @override */
    generateUnidentifiedName() {
        const translations = LocalizePF2e.translations.PF2E;
        const formatString = translations.identification.UnidentifiedItem;

        const base = this.baseType ? translations.Weapon.Base[this.baseType] : null;
        const group = this.group ? CONFIG.PF2E.weaponGroups[this.group] : null;
        const fallback = 'ITEM.TypeWeapon';

        const item = game.i18n.localize(base ?? group ?? fallback);
        return game.i18n.format(formatString, { item });
    }
}

export interface WeaponPF2e {
    data: WeaponData;
    _data: WeaponData;
}
