import { PhysicalItemPF2e } from './physical';
import { WeaponData } from './data-definitions';
import { ProficiencyModifier, StatisticModifier } from '@module/modifiers';
import { getAttackBonus, getStrikingDice } from './runes';
import { DicePF2e } from '@scripts/dice';
import { RollAttackOptions, RollDamageOptions } from './base';

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

    get strike(): StatisticModifier {
        const actorData = this.actor?.data.data;
        return actorData?.actions?.find((a: StatisticModifier) => a.item === this.id);
    }

    /**
     * Roll a Weapon Attack
     */
    rollAttack({ event, multiAttackPenalty = 1, options = [] }: RollAttackOptions) {
        const strike = this.strike;
        if (strike && options) {
            strike.variants[multiAttackPenalty - 1].roll({ event, options });
            return;
        }

        if (!this.actor) return;
        if (this.type !== 'weapon' && this.type !== 'melee') throw new Error('Wrong item type!');

        // Prepare roll data
        const itemData: any = this.getChatData();
        const rollData = duplicate(this.actor.data.data) as any;
        const isFinesse = itemData.isFinesse;
        const abl =
            isFinesse && rollData.abilities.dex.mod > rollData.abilities.str.mod
                ? 'dex'
                : itemData.ability.value || 'str';
        const prof = itemData.weaponType.value || 'simple';
        let parts = ['@itemBonus', `@abilities.${abl}.mod`];

        const title = `${this.name} - Attack Roll${multiAttackPenalty ?? 1 > 1 ? ` (MAP ${multiAttackPenalty})` : ''}`;

        if (this.actor.data.type === 'npc') {
            parts = ['@itemBonus'];
        } else if (itemData.proficiency && itemData.proficiency.type === 'skill') {
            parts.push(itemData.proficiency.value);
        } else {
            parts.push(`@martial.${prof}.value`);
        }

        rollData.item = itemData;
        rollData.itemBonus = getAttackBonus(itemData);

        if (multiAttackPenalty === 2) parts.push(itemData.map2);
        else if (multiAttackPenalty === 3) parts.push(itemData.map3);

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            actor: this.actor,
            data: rollData,
            rollType: 'attack-roll',
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event && event.clientY ? event.clientY - 80 : 400,
                left: window.innerWidth - 710,
            },
        });
    }

    rollDamage({ event, options = [], critical = false }: RollDamageOptions) {
        const strike = this.strike;
        if (strike && options) {
            if (critical) {
                strike.critical({ event, options });
            } else {
                strike.damage({ event, options });
            }
            return;
        }

        if (!this.actor) return;

        // Rely upon the DicePF2e.damageRoll logic for the core implementation
        const localize: Function = game.i18n.localize.bind(game.i18n);
        const itemData = this.data.data;

        // Get item and actor data and format it for the damage roll
        const rollData = duplicate(this.actor.data.data) as any;
        let rollDie = itemData.damage.die;
        const abl = 'str';
        let abilityMod: number = rollData.abilities[abl].mod;
        let parts: (string | number)[] = [];
        const partsCritOnly: string[] = [];
        const dtype: string = CONFIG.PF2E.damageTypes[itemData.damage.damageType];

        // Get detailed trait information from item
        const traits = itemData.traits.value;
        let critTrait = '';
        let critDie = '';
        let bonusDamage = 0;
        let twohandedTrait = false;
        let twohandedDie = '';
        let thrownTrait = false;
        const critRegex = /\b(deadly|fatal)-(d\d+)/;
        const twohandedRegex = /\b(two-hand)-(d\d+)/;
        const thrownRegex = /\b(thrown)-(\d+)/;
        const hasThiefRacket = this.actor.itemTypes.feat.some((feat) => feat.slug === 'thief-racket');
        const strikingDice = getStrikingDice(itemData);

        if (hasThiefRacket && rollData.abilities.dex.mod > abilityMod) abilityMod = rollData.abilities.dex.mod;

        // Find detailed trait information
        for (const trait of traits) {
            const critMatch = critRegex.exec(trait);
            const twoHandedMatch = twohandedRegex.exec(trait);
            const thrownMatch = thrownRegex.exec(trait);
            if (Array.isArray(critMatch) && typeof critMatch[1] === 'string' && typeof critMatch[2] === 'string') {
                critTrait = critMatch[1];
                critDie = critMatch[2];
            } else if (Array.isArray(twoHandedMatch) && typeof twoHandedMatch[2] === 'string') {
                twohandedTrait = true;
                twohandedDie = twoHandedMatch[2];
            } else if (Array.isArray(thrownMatch)) {
                thrownTrait = true;
            }
        }

        // If weapon has two-hand trait and wielded in two hands, apply the appropriate damage die
        if (twohandedTrait && itemData.hands.value) {
            rollDie = twohandedDie;
        }

        // Add bonus damage
        if (itemData.bonusDamage && itemData.bonusDamage.value) bonusDamage = parseInt(itemData.bonusDamage.value, 10);

        // Join the damage die into the parts to make a roll (this will be overwriten below if the damage is critical)
        const damageDice = itemData.damage.dice ?? 1;
        let weaponDamage = damageDice + strikingDice + rollDie;
        parts = [weaponDamage, '@itemBonus'];
        rollData.itemBonus = bonusDamage;

        // Apply critical damage and effects
        if (critTrait === 'deadly') {
            // Deadly adds 3 dice with major Striking, 2 dice with greater Striking
            // and 1 die otherwise
            const deadlyDice = strikingDice > 0 ? strikingDice : 1;
            const deadlyDamage = deadlyDice + critDie;
            partsCritOnly.push(deadlyDamage);
        } else if (critTrait === 'fatal') {
            if (critical === true) {
                weaponDamage = damageDice + strikingDice + critDie;
                parts = [weaponDamage, '@itemBonus'];
            }
            partsCritOnly.push(1 + critDie);
        }

        // Add abilityMod to the damage roll.
        if (itemData.range.value === 'melee' || itemData.range.value === 'reach' || itemData.range.value === '') {
            // if a melee attack
            parts.push(abilityMod);
        } else if (itemData.traits.value.includes('propulsive')) {
            if (Math.sign(this.actor.data.data.abilities.str.mod) === 1) {
                const halfStr = Math.floor(this.actor.data.data.abilities.str.mod / 2);
                parts.push(halfStr);
            }
        } else if (thrownTrait) {
            parts.push(abilityMod);
        }

        // Add property rune damage

        // add strike damage
        if (itemData.property1.dice && itemData.property1.die && itemData.property1.damageType) {
            const propertyDamage = Number(itemData.property1.dice) + itemData.property1.die;
            parts.push(propertyDamage);
        }
        // add critical damage
        if (itemData.property1.critDice && itemData.property1.critDie && itemData.property1.critDamageType) {
            const propertyDamage = Number(itemData.property1.critDice) + itemData.property1.critDie;
            partsCritOnly.push(propertyDamage);
        }

        // Set the title of the roll
        const critTitle = critTrait ? critTrait.toUpperCase() : '';
        let title = critical
            ? `${localize('PF2E.CriticalDamageLabel')} ${critTitle} ${localize('PF2E.DamageLabel')}: ${this.name}`
            : `${localize('PF2E.DamageLabel')}: ${this.name}`;
        if (dtype) title += ` (${dtype})`;

        // Call the roll helper utility
        rollData.item = itemData;
        DicePF2e.damageRoll({
            event,
            parts,
            partsCritOnly,
            critical,
            actor: this.actor ? this.actor : undefined,
            data: rollData,
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor ? this.actor : undefined }),
            dialogOptions: {
                width: 400,
                top: event.clientY ? event.clientY - 80 : 400,
                left: window.innerWidth - 710,
            },
        });
    }

    getChatData(htmlOptions?: Record<string, boolean>) {
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
}

export interface WeaponPF2e {
    data: WeaponData;
    _data: WeaponData;
}
