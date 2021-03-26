import { PhysicalItemPF2e } from './physical';
import { WeaponData } from './data-definitions';
import { ItemPF2e } from './base';
import { ProficiencyModifier } from '@module/modifiers';
import { getAttackBonus } from './runes';

export class WeaponPF2e extends PhysicalItemPF2e {
    get traits(): Set<string> {
        const traits = super.traits;
        const traditionTraits = ['arcane', 'primal', 'divine', 'occult'];
        const fundamentalRunes = [this.data.data.potencyRune, this.data.data.strikingRune];
        if (fundamentalRunes.some((rune) => rune.value)) {
            traits.add('evocation');
            if (!traditionTraits.some((trait) => traits.has(trait))) {
                traits.add('magical');
            }
        }

        return traits;
    }

    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = super.getChatData(htmlOptions);
        const actorData = this.actor.data;
        const twohandedRegex = '(\\btwo-hand\\b)-(d\\d+)';
        const twohandedTrait = data.traits.value.find((trait: string) => trait.match(twohandedRegex)) !== undefined;
        const traits = ItemPF2e.traitChatData(data.traits, CONFIG.PF2E.weaponTraits);

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
                const martialSkill = this.actor.getOwnedItem(prof);
                if (martialSkill.data.type === 'martial') {
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

        return {
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
        };
    }
}

export interface WeaponPF2e {
    data: WeaponData;
    _data: WeaponData;
}
