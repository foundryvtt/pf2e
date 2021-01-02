/* global game, CONFIG */
import { Coins, calculateWealth, calculateTotalWealth } from '../../item/treasure';
import { ProficiencyModifier } from '../../modifiers';
import { ActorSheetPF2e } from './base';

/**
 * Base class for NPC and character sheets
 * @category Actor
 */
export abstract class ActorSheetPF2eCreature extends ActorSheetPF2e {
    _renderItemSummary(li, item, chatData) {
        super._renderItemSummary(li, item, chatData);
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
                if (chatData.isTwohanded) {
                    if (chatData.wieldedTwoHands)
                        buttons.append(
                            '<span class="tag"><button data-action="toggleHands"><i class="far fa-hand-paper"></i><i class="far fa-hand-paper"></i></button></span>',
                        );
                    else
                        buttons.append(
                            '<span class="tag"><button data-action="toggleHands"><i class="far fa-hand-paper"></i></button></span>',
                        );
                }
                buttons.append(
                    `<button class="weapon_attack tag" data-action="weaponAttack">${game.i18n.localize(
                        'PF2E.WeaponStrikeLabel',
                    )} (+${chatData.attackRoll})</button>`,
                );
                buttons.append(
                    `<button class="tag weapon_attack2" data-action="weaponAttack2">${chatData.map2}</button>`,
                );
                buttons.append(
                    `<button class="tag weapon_attack3" data-action="weaponAttack3">${chatData.map3}</button>`,
                );
                buttons.append(
                    `<button class="tag weapon_damage" data-action="weaponDamage">${game.i18n.localize(
                        'PF2E.DamageLabel',
                    )}</button>`,
                );
                buttons.append(
                    `<button class="tag weapon_critical" data-action="weaponDamageCritical">${game.i18n.localize(
                        'PF2E.CriticalDamageLabel',
                    )}</button>`,
                );
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
                if (chatData.hasCharges)
                    buttons.append(
                        `<span class="tag"><button class="consume" data-action="consume">${game.i18n.localize(
                            'PF2E.ConsumableUseLabel',
                        )} ${item.name}</button></span>`,
                    );
                break;
            default:
        }

        div.append(buttons);

        buttons.find('button').click((ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            // which function gets called depends on the type of button stored in the dataset attribute action
            switch (ev.target.dataset.action) {
                case 'toggleHands':
                    if (item.data.type === 'weapon') {
                        item.data.data.hands.value = !item.data.data.hands.value;
                        // this.actor.updateOwnedItem(item.data, true);
                        this.actor.updateEmbeddedEntity('OwnedItem', item.data);
                        this._render();
                    }

                    break;
                case 'weaponAttack':
                    item.rollWeaponAttack(ev);
                    break;
                case 'weaponAttack2':
                    item.rollWeaponAttack(ev, 2);
                    break;
                case 'weaponAttack3':
                    item.rollWeaponAttack(ev, 3);
                    break;
                case 'weaponDamage':
                    item.rollWeaponDamage(ev);
                    break;
                case 'weaponDamageCritical':
                    item.rollWeaponDamage(ev, true);
                    break;
                case 'spellAttack':
                    item.rollSpellAttack(ev);
                    break;
                case 'spellDamage':
                    item.rollSpellDamage(ev);
                    break;
                case 'consume':
                    item.rollConsumable(ev);
                    break;
                default:
            }
        });
    }

    getData() {
        const sheetData: any = super.getData();
        // Update martial skill labels
        if (sheetData.data.martial !== undefined) {
            for (const [s, skl] of Object.entries(sheetData.data.martial as Record<any, any>)) {
                skl.icon = this._getProficiencyIcon(skl.rank);
                skl.hover = CONFIG.PF2E.proficiencyLevels[skl.rank];
                skl.label = CONFIG.PF2E.martialSkills[s];
                skl.value = ProficiencyModifier.fromLevelAndRank(
                    sheetData.data.details.level.value,
                    skl.rank || 0,
                ).modifier;
            }
        }

        // Update save labels
        if (sheetData.data.saves !== undefined) {
            for (const [s, save] of Object.entries(sheetData.data.saves as Record<any, any>)) {
                save.icon = this._getProficiencyIcon(save.rank);
                save.hover = CONFIG.PF2E.proficiencyLevels[save.rank];
                save.label = CONFIG.PF2E.saves[s];
            }
        }

        // Update proficiency label
        if (sheetData.data.attributes !== undefined) {
            sheetData.data.attributes.perception.icon = this._getProficiencyIcon(
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
                skl.icon = this._getProficiencyIcon(skl.rank);
                skl.hover = CONFIG.PF2E.proficiencyLevels[skl.rank];
                skl.label = skl.label ?? CONFIG.PF2E.skills[s];
            }
        }

        // update currency based on items
        if (sheetData.actor.items !== undefined) {
            const treasure = calculateWealth(sheetData.actor.items);
            sheetData.totalTreasure = ActorSheetPF2eCreature.parseCoinsToActorSheetData(treasure);

            const totalWealth = calculateTotalWealth(sheetData.actor.items);
            sheetData.totalWealth = ActorSheetPF2eCreature.parseCoinsToActorSheetData(totalWealth);
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
}
