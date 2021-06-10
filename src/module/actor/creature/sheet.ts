import { ProficiencyModifier } from '@module/modifiers';
import { ActorSheetPF2e } from '../sheet/base';
import { ItemPF2e } from '@item/base';
import { LocalizePF2e } from '@module/system/localize';
import { ConsumablePF2e } from '@item/consumable';
import { CreaturePF2e } from '@actor/creature';
import { ErrorPF2e, objectHasKey } from '@module/utils';
import { BaseWeaponType, WeaponGroup } from '@item/weapon/data';
import { ZeroToFour } from '@module/data';
import { SkillData } from './data';

/**
 * Base class for NPC and character sheets
 * @category Actor
 */
export abstract class CreatureSheetPF2e<ActorType extends CreaturePF2e> extends ActorSheetPF2e<ActorType> {
    protected override async renderItemSummary(div: JQuery, item: Embedded<ItemPF2e>, chatData: any) {
        chatData.isCreature = true;
        await super.renderItemSummary(div, item, chatData);

        div.find('button').on('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            // which function gets called depends on the type of button stored in the dataset attribute action
            switch (event.target.dataset.action) {
                case 'toggleHands':
                    if (item.data.type === 'weapon') {
                        item.update({ 'data.hands.value': !item.data.data.hands.value });
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
                    if (item instanceof ConsumablePF2e) item.consume();
                    break;
            }
        });
    }

    override getData() {
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
                        const weaponGroup = groupMatch[1] as WeaponGroup;
                        return CONFIG.PF2E.weaponGroups[weaponGroup];
                    }
                    if (Array.isArray(baseWeaponMatch)) {
                        const baseWeapon = baseWeaponMatch[1] as BaseWeaponType;
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

    override activateListeners(html: JQuery): void {
        super.activateListeners(html);

        // Roll Recovery Flat Check when Dying
        html.find('.recoveryCheck.rollable').on('click', () => {
            this.actor.rollRecovery();
        });

        // strikes
        html.find('.strikes-list [data-action-index]').on('click', '.action-name', (event) => {
            $(event.currentTarget).parents('.expandable').toggleClass('expanded');
        });

        // the click listener registered on all buttons breaks the event delegation here...
        // html.find('.strikes-list [data-action-index]').on('click', '.damage-strike', (event) => {
        html.find('.strikes-list .damage-strike, [data-action="npcDamage"]').on('click', (event) => {
            if (!['character', 'npc'].includes(this.actor.data.type))
                throw Error('This sheet only works for characters and NPCs');
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const actionIndex = $(event.currentTarget).parents('[data-action-index]').attr('data-action-index');
            this.actor.data.data.actions[Number(actionIndex)].damage({ event });
        });

        // the click listener registered on all buttons breaks the event delegation here...
        // html.find('.strikes-list [data-action-index]').on('click', '.critical-strike', (event) => {
        html.find('.strikes-list .critical-strike, [data-action="npcCritical"]').on('click', (event) => {
            if (!['character', 'npc'].includes(this.actor.data.type))
                throw Error('This sheet only works for characters and NPCs');
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const actionIndex = $(event.currentTarget).parents('[data-action-index]').attr('data-action-index');
            this.actor.data.data.actions[Number(actionIndex)].critical({ event });
        });

        html.find('.spell-attack').on('click', (event) => {
            if (!['character'].includes(this.actor.data.type)) {
                throw ErrorPF2e('This sheet only works for characters');
            }
            const index = $(event.currentTarget).closest('[data-container-id]').data('containerId');
            const entryData = this.actor.itemTypes.spellcastingEntry.find((item) => item.id === index)?.data;
            if (entryData && entryData.data.attack?.roll) {
                entryData.data.attack.roll({ event });
            }
        });

        // for spellcasting checks
        html.find('.spellcasting.rollable').on('click', (event) => {
            event.preventDefault();
            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id') ?? '';
            const item = this.actor.items.get(itemId);
            if (item) {
                item.rollSpellcastingEntryCheck(event);
            }
        });

        // Action Rolling (strikes)
        html.find('[data-action-index].item .item-image.action-strike').on('click', (event) => {
            if (!('actions' in this.actor.data.data)) throw Error('Strikes are not supported on this actor');

            const actionIndex = $(event.currentTarget).parents('.item').attr('data-action-index');
            this.actor.data.data.actions[Number(actionIndex)].roll({ event });
        });

        html.find('[data-variant-index].variant-strike, [data-action="npcAttack"]').on('click', (event) => {
            if (!('actions' in this.actor.data.data)) throw Error('Strikes are not supported on this actor');
            event.stopImmediatePropagation();
            const actionIndex = $(event.currentTarget).parents('.item').attr('data-action-index');
            const variantIndex = $(event.currentTarget).attr('data-variant-index');
            const action = this.actor.data.data.actions[Number(actionIndex)];
            if (!action) return;

            if (action.selectedAmmoId) {
                const ammo = this.actor.items.get(action.selectedAmmoId);
                if (ammo instanceof ConsumablePF2e) {
                    if (ammo.quantity < 1) {
                        ui.notifications.error(game.i18n.localize('PF2E.ErrorMessage.NotEnoughAmmo'));
                        return;
                    }
                    ammo.consume();
                }
            }

            action.variants[Number(variantIndex)]?.roll({ event });
        });
    }
}
