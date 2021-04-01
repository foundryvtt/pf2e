import {
    Coins,
    calculateWealth,
    calculateTotalWealth,
    calculateValueOfCurrency,
    coinValueInCopper,
} from '@item/treasure';
import { ProficiencyModifier } from '@module/modifiers';
import { ActorSheetPF2e } from './base';
import { ItemPF2e } from '@item/base';
import { BaseWeaponKey, WeaponGroupKey } from '@item/data-definitions';
import { LocalizePF2e } from '@module/system/localize';
import { PhysicalItemPF2e } from '@item/physical';
import { CategoryProficiencies, SkillData, ZeroToFour } from '@actor/data-definitions';
import { CreaturePF2e } from '@actor/creature';

/**
 * Base class for NPC and character sheets
 * @category Actor
 */
export abstract class CreatureSheetPF2e<ActorType extends CreaturePF2e> extends ActorSheetPF2e<ActorType> {
    protected renderItemSummary(li: JQuery, item: Owned<ItemPF2e>, chatData: any) {
        super.renderItemSummary(li, item, chatData);
        const div = li.find('.item-summary');

        const buttons = $('<div class="item-buttons"></div>');
        switch (item.data.type) {
            case 'action':
                if (chatData.weapon.value) {
                    if (chatData.weapon.value) {
                        buttons.append(
                            `<button class="weapon_attack tag" data-action="weaponAttack">${game.i18n.localize(
                                'PF2E.WeaponStrikeLabel',
                            )}</button>`,
                        );
                        buttons.append('<button class="tag weapon_attack2" data-action="weaponAttack2">2</button>');
                        buttons.append('<button class="tag weapon_attack3" data-action="weaponAttack3">3</button>');
                        buttons.append(
                            `<button class="tag weapon_damage" data-action="weaponDamage">${game.i18n.localize(
                                'PF2E.DamageLabel',
                            )}</button>`,
                        );
                    }
                }
                break;
            case 'weapon':
                // The two handed trait is working differently now and is toggled from the action tab (for players).
                // It is currently only used in the old npc sheet.
                // If this gets deprecated sometime, maybe the two handed support should be moved somewhere else.
                if (chatData.isTwohanded && this.actor.type !== 'character') {
                    if (chatData.wieldedTwoHands)
                        buttons.append(
                            '<span class="tag"><button data-action="toggleHands"><i class="far fa-hand-paper"></i><i class="far fa-hand-paper"></i></button></span>',
                        );
                    else
                        buttons.append(
                            '<span class="tag"><button data-action="toggleHands"><i class="far fa-hand-paper"></i></button></span>',
                        );
                }
                break;
            case 'spell':
                if (chatData.isSave)
                    buttons.append(
                        `<span class="tag">${game.i18n.localize('PF2E.SaveDCLabel')} ${chatData.save.dc} ${
                            chatData.save.basic
                        } ${chatData.save.str}</span>`,
                    );
                if (chatData.isAttack)
                    buttons.append(
                        `<span class="tag"><button class="spell_attack" data-action="spellAttack">${game.i18n.localize(
                            'PF2E.AttackLabel',
                        )}</button></span>`,
                    );
                if (item.data.data.damage.value)
                    buttons.append(
                        `<span class="tag"><button class="spell_damage" data-action="spellDamage">${chatData.damageLabel}: ${item.data.data.damage.value}</button></span>`,
                    );
                break;
            case 'consumable':
                if (chatData.hasCharges && PhysicalItemPF2e.isIdentified(item.data))
                    buttons.append(
                        `<span class="tag"><button class="consume" data-action="consume">${game.i18n.localize(
                            'PF2E.ConsumableUseLabel',
                        )} ${item.name}</button></span>`,
                    );
                break;
            default:
        }

        div.append(buttons);

        buttons.find('button').on('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (event.target.dataset.action === 'toggleHands') {
                if (item.data.type === 'weapon') {
                    item.data.data.hands.value = !item.data.data.hands.value;
                    // this.actor.updateOwnedItem(item.data, true);
                    this.actor.updateEmbeddedEntity('OwnedItem', item.data);
                    this._render();
                }
            } else {
                item.handleButtonAction(event, event.target.dataset.action);
            }
        });
    }

    getData() {
        const sheetData: any = super.getData();
        // Update martial-proficiency labels
        if (sheetData.data.martial) {
            const proficiencies = Object.entries(sheetData.data.martial as Record<string, SkillData>);
            for (const [key, proficiency] of proficiencies) {
                const groupMatch = /weapon-group-([a-z]+)$/.exec(key);
                const baseWeaponMatch = /weapon-base-([-a-z]+)$/.exec(key);
                const label = ((): string => {
                    if (key in CONFIG.PF2E.martialSkills) {
                        return CONFIG.PF2E.martialSkills[key as keyof CategoryProficiencies];
                    }
                    if (Array.isArray(groupMatch)) {
                        const weaponGroup = groupMatch[1] as WeaponGroupKey;
                        return CONFIG.PF2E.weaponGroups[weaponGroup];
                    }
                    if (Array.isArray(baseWeaponMatch)) {
                        const baseWeapon = baseWeaponMatch[1] as BaseWeaponKey;
                        return LocalizePF2e.translations.PF2E.Weapon.Base[baseWeapon];
                    }
                    return key;
                })();

                proficiency.icon = this.getProficiencyIcon(proficiency.rank);
                proficiency.hover = CONFIG.PF2E.proficiencyLevels[proficiency.rank];
                proficiency.label = label;
                proficiency.value = ProficiencyModifier.fromLevelAndRank(
                    sheetData.data.details.level.value,
                    proficiency.rank || 0,
                ).modifier;
            }
        }

        // Update save labels
        if (sheetData.data.saves !== undefined) {
            for (const [s, save] of Object.entries(sheetData.data.saves as Record<any, any>)) {
                save.icon = this.getProficiencyIcon(save.rank);
                save.hover = CONFIG.PF2E.proficiencyLevels[save.rank];
                save.label = CONFIG.PF2E.saves[s];
            }
        }

        // Update proficiency label
        if (sheetData.data.attributes !== undefined) {
            sheetData.data.attributes.perception.icon = this.getProficiencyIcon(
                sheetData.data.attributes.perception.rank,
            );
            sheetData.data.attributes.perception.hover =
                CONFIG.PF2E.proficiencyLevels[sheetData.data.attributes.perception.rank];
        }

        // Ability Scores
        if (sheetData.data.abilities !== undefined) {
            for (const [a, abl] of Object.entries(sheetData.data.abilities as Record<any, any>)) {
                abl.label = CONFIG.PF2E.abilities[a];
            }
        }

        // Update skill labels
        if (sheetData.data.skills !== undefined) {
            for (const [s, skl] of Object.entries(sheetData.data.skills as Record<any, any>)) {
                skl.icon = this.getProficiencyIcon(skl.rank);
                skl.hover = CONFIG.PF2E.proficiencyLevels[skl.rank];
                skl.label = skl.label ?? CONFIG.PF2E.skills[s];
            }
        }

        // update currency based on items
        if (sheetData.actor.items !== undefined) {
            const currency = calculateValueOfCurrency(sheetData.actor.items);
            sheetData.totalCurrency = CreatureSheetPF2e.parseCoinsToActorSheetData(currency);

            const treasure = calculateWealth(sheetData.actor.items);
            sheetData.totalTreasureGold = (coinValueInCopper(treasure) / 100).toFixed(2);

            const totalWealth = calculateTotalWealth(sheetData.actor.items);
            sheetData.totalWealthGold = (coinValueInCopper(totalWealth) / 100).toFixed(2);
        }

        // Update traits
        sheetData.abilities = CONFIG.PF2E.abilities;
        sheetData.skills = CONFIG.PF2E.skills;
        sheetData.actorSizes = CONFIG.PF2E.actorSizes;
        sheetData.alignment = CONFIG.PF2E.alignment;
        sheetData.rarity = CONFIG.PF2E.rarityTraits;
        sheetData.attitude = CONFIG.PF2E.attitude;
        sheetData.pfsFactions = CONFIG.PF2E.pfsFactions;

        return sheetData;
    }

    /**
     * Get the font-awesome icon used to display a certain level of skill proficiency
     */
    protected getProficiencyIcon(level: ZeroToFour): string {
        const icons = {
            0: '',
            1: '<i class="fas fa-check-circle"></i>',
            2: '<i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i>',
            3: '<i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i>',
            4: '<i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i>',
        };
        return icons[level];
    }

    private static parseCoinsToActorSheetData(treasure: Coins) {
        const coins = {};
        for (const [denomination, value] of Object.entries(treasure)) {
            coins[denomination] = {
                value,
                label: CONFIG.PF2E.currencies[denomination],
            };
        }

        return coins;
    }

    /** @override */
    activateListeners(html: JQuery): void {
        // Roll Recovery Flat Check when Dying
        html.find('.recoveryCheck.rollable').on('click', () => {
            this.actor.rollRecovery();
        });
        super.activateListeners(html);
    }
}
