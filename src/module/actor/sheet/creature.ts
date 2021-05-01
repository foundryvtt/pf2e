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
import { SkillData, ZeroToFour } from '@actor/data-definitions';
import { CreaturePF2e } from '@actor/creature';
import { ConditionPF2e } from '@item/others';
import { PF2CheckDC } from '@module/system/check-degree-of-success';
import { objectHasKey } from '@module/utils';

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

            // which function gets called depends on the type of button stored in the dataset attribute action
            switch (event.target.dataset.action) {
                case 'toggleHands':
                    if (item.data.type === 'weapon') {
                        item.data.data.hands.value = !item.data.data.hands.value;
                        // this.actor.updateOwnedItem(item.data, true);
                        this.actor.updateEmbeddedEntity('OwnedItem', item.data);
                        this._render();
                    }

                    break;
                case 'weaponAttack':
                    item.rollWeaponAttack(event);
                    break;
                case 'weaponAttack2':
                    item.rollWeaponAttack(event, 2);
                    break;
                case 'weaponAttack3':
                    item.rollWeaponAttack(event, 3);
                    break;
                case 'weaponDamage':
                    item.rollWeaponDamage(event);
                    break;
                case 'weaponDamageCritical':
                    item.rollWeaponDamage(event, true);
                    break;
                case 'spellAttack':
                    item.rollSpellAttack(event);
                    break;
                case 'spellDamage':
                    item.rollSpellDamage(event);
                    break;
                case 'consume':
                    item.rollConsumable(event);
                    break;
                default:
            }
        });
    }

    getData() {
        const sheetData: any = super.getData();
        // Update martial-proficiency labels
        if (sheetData.data.martial) {
            const proficiencies = Object.entries(sheetData.data.martial as Record<string, SkillData>);
            for (const [key, proficiency] of proficiencies) {
                const groupMatch = /weapon-group-([-a-z0-9]+)$/.exec(key);
                const baseWeaponMatch = /weapon-base-([-a-z0-9]+)$/.exec(key);
                const label = ((): string => {
                    if (objectHasKey(CONFIG.PF2E.martialSkills, key)) {
                        return CONFIG.PF2E.martialSkills[key];
                    }
                    if (objectHasKey(CONFIG.PF2E.weaponCategories, key)) {
                        return CONFIG.PF2E.weaponCategories[key];
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
        if (sheetData.data.saves) {
            for (const key of ['fortitude', 'reflex', 'will'] as const) {
                const save = sheetData.data.saves[key];
                save.icon = this.getProficiencyIcon(save.rank);
                save.hover = CONFIG.PF2E.proficiencyLevels[save.rank];
                save.label = CONFIG.PF2E.saves[key];
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
        super.activateListeners(html);

        // Roll Recovery Flat Check when Dying
        html.find('.recoveryCheck.rollable').on('click', () => {
            this.actor.rollRecovery();
        });

        // strikes
        html.find('.strikes-list [data-action-index]').on('click', '.action-name', (event) => {
            $(event.currentTarget).parents('.expandable').toggleClass('expanded');
        });

        const createStrikeRollContext = (rollNames: string[]) => {
            const targets = Array.from(game.user.targets)
                .map((token) => token.actor)
                .filter((actor) => !!actor);
            const target =
                targets.length === 1 && targets[0] instanceof CreaturePF2e ? (targets[0] as CreaturePF2e) : undefined;
            const options = this.actor.getRollOptions(rollNames);
            {
                const conditions = this.actor.items
                    .filter((item) => item instanceof ConditionPF2e)
                    .filter((item) => item.getFlag('pf2e', 'condition')) as ConditionPF2e[];
                options.push(...conditions.map((item) => `self:${item.data.data.hud.statusName}`));
            }
            if (target) {
                const conditions = target.items
                    .filter((item) => item instanceof ConditionPF2e)
                    .filter((item) => item.getFlag('pf2e', 'condition')) as ConditionPF2e[];
                options.push(...conditions.map((item) => `target:${item.data.data.hud.statusName}`));

                const traits = (target.data.data.traits.traits.custom ?? '')
                    .split(/[;,\\|]/)
                    .map((value) => value.trim())
                    .concat(target.data.data.traits.traits.value ?? [])
                    .filter((value) => !!value)
                    .map((trait) => `target:${trait}`);
                options.push(...traits);
            }
            return {
                options,
                targets: new Set(targets),
                target,
            };
        };
        const createAttackRollContext = (event: JQuery.TriggeredEvent, rollNames: string[]) => {
            const ctx = createStrikeRollContext(rollNames);
            let dc: PF2CheckDC | undefined;
            if (ctx.target) {
                dc = {
                    label: game.i18n.format('PF2E.CreatureArmorClass', { creature: ctx.target.name }),
                    scope: 'AttackOutcome',
                    value: ctx.target.data.data.attributes.ac.value,
                    visibility: 'gm',
                };
            }
            return {
                event,
                options: Array.from(new Set(ctx.options)), // de-duplication
                targets: ctx.targets,
                dc,
            };
        };
        const createDamageRollContext = (event: JQuery.TriggeredEvent) => {
            const ctx = createStrikeRollContext(['all', 'damage-roll']);
            return {
                event,
                options: Array.from(new Set(ctx.options)), // de-duplication
                targets: ctx.targets,
            };
        };

        // the click listener registered on all buttons breaks the event delegation here...
        // html.find('.strikes-list [data-action-index]').on('click', '.damage-strike', (event) => {
        html.find('.strikes-list .damage-strike').on('click', (event) => {
            if (!['character', 'npc'].includes(this.actor.data.type))
                throw Error('This sheet only works for characters and NPCs');
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const actionIndex = $(event.currentTarget).parents('[data-action-index]').attr('data-action-index');
            const rollContext = createDamageRollContext(event);
            this.actor.data.data.actions[Number(actionIndex)].damage(rollContext);
        });

        // the click listener registered on all buttons breaks the event delegation here...
        // html.find('.strikes-list [data-action-index]').on('click', '.critical-strike', (event) => {
        html.find('.strikes-list .critical-strike').on('click', (event) => {
            if (!['character', 'npc'].includes(this.actor.data.type))
                throw Error('This sheet only works for characters and NPCs');
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const actionIndex = $(event.currentTarget).parents('[data-action-index]').attr('data-action-index');
            const rollContext = createDamageRollContext(event);
            this.actor.data.data.actions[Number(actionIndex)].critical(rollContext);
        });

        html.find('.spell-attack').on('click', (event) => {
            if (!['character'].includes(this.actor.data.type)) {
                throw Error('This sheet only works for characters');
            }
            const index = $(event.currentTarget).closest('[data-container-id]').data('containerId');
            const entryData = this.actor.itemTypes.spellcastingEntry.find((item) => item._id === index)?.data;
            if (entryData && entryData.data.attack?.roll) {
                const rollContext = createAttackRollContext(event, ['all', 'attack-roll', 'spell-attack-roll']);
                entryData.data.attack.roll(rollContext);
            }
        });

        // for spellcasting checks
        html.find('.spellcasting.rollable').on('click', (event) => {
            event.preventDefault();
            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id') ?? '';
            const item = this.actor.getOwnedItem(itemId);
            if (item) {
                item.rollSpellcastingEntryCheck(event);
            }
        });

        // Action Rolling (strikes)
        html.find('[data-action-index].item .item-image.action-strike').on('click', (event) => {
            if (!('actions' in this.actor.data.data)) throw Error('Strikes are not supported on this actor');

            const actionIndex = $(event.currentTarget).parents('.item').attr('data-action-index');
            const rollContext = createAttackRollContext(event, ['all', 'attack-roll']);
            this.actor.data.data.actions[Number(actionIndex)].roll(rollContext);
        });

        html.find('[data-variant-index].variant-strike').on('click', (event) => {
            if (!('actions' in this.actor.data.data)) throw Error('Strikes are not supported on this actor');
            event.stopImmediatePropagation();
            const actionIndex = $(event.currentTarget).parents('.item').attr('data-action-index');
            const variantIndex = $(event.currentTarget).attr('data-variant-index');
            const action = this.actor.data.data.actions[Number(actionIndex)];

            if (action.selectedAmmoId) {
                const ammo = this.actor.getOwnedItem(action.selectedAmmoId);
                if (ammo instanceof PhysicalItemPF2e) {
                    if (ammo.quantity < 1) {
                        ui.notifications.error(game.i18n.localize('PF2E.ErrorMessage.NotEnoughAmmo'));
                        return;
                    }
                    ammo.consume();
                }
            }

            const rollContext = createAttackRollContext(event, ['all', 'attack-roll']);
            action.variants[Number(variantIndex)].roll(rollContext);
        });
    }
}
