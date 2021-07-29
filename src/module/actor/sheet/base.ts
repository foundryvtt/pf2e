import { CharacterPF2e } from '@actor/character';
import { NPCPF2e } from '@actor/npc';
import { ItemPF2e } from '@item/base';
import { ConditionPF2e } from '@item/condition';
import { ItemDataPF2e, ItemSourcePF2e } from '@item/data';
import { isPhysicalData } from '@item/data/helpers';
import { KitPF2e } from '@item/kit';
import { PhysicalItemPF2e } from '@item/physical';
import { SpellPF2e } from '@item/spell';
import { createConsumableFromSpell, SpellConsumableTypes } from '@item/consumable/spell-consumables';
import { SpellSource } from '@item/spell/data';
import { SpellcastingEntryPF2e } from '@item/spellcasting-entry';
import {
    calculateTotalWealth,
    calculateValueOfCurrency,
    Coins,
    coinValueInCopper,
    sellAllTreasure,
    sellTreasure,
} from '@item/treasure/helpers';
import {
    TagSelectorBasic,
    TraitSelectorResistances,
    TraitSelectorSenses,
    TraitSelectorSpeeds,
    TraitSelectorWeaknesses,
} from '@module/system/trait-selector';
import { ErrorPF2e, objectHasKey, tupleHasValue } from '@module/utils';
import { LocalizePF2e } from '@system/localize';
import {
    BasicSelectorOptions,
    SelectableTagField,
    SELECTABLE_TAG_FIELDS,
    TagSelectorType,
    TAG_SELECTOR_TYPES,
} from '@system/trait-selector';
import type { ActorPF2e } from '../base';
import { SKILL_DICTIONARY } from '@actor/data/values';
import { ActorSheetDataPF2e, CoinageSummary, InventoryItem } from './data-types';
import { MoveLootPopup } from './loot/move-loot-popup';
import { AddCoinsPopup } from './popups/add-coins-popup';
import { IdentifyItemPopup } from './popups/identify-popup';
import { RemoveCoinsPopup } from './popups/remove-coins-popup';
import { ScrollWandPopup } from './popups/scroll-wand-popup';
import { ContainerPF2e } from '@item/container';
import { ActorDataPF2e, SaveType } from '@actor/data';
import { SkillAbbreviation } from '@actor/creature/data';
import { AbilityString } from '@actor/data/base';
import { DropCanvasItemDataPF2e } from '@module/canvas/drop-canvas-data';
import { FolderPF2e } from '@module/folder';
import { MagicTradition } from '@item/spellcasting-entry/data';

/**
 * Extend the basic ActorSheet class to do all the PF2e things!
 * This sheet is an Abstract layer which is not used.
 * @category Actor
 */
export abstract class ActorSheetPF2e<TActor extends ActorPF2e> extends ActorSheet<TActor, ItemPF2e> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        return mergeObject(options, {
            classes: options.classes.concat(['pf2e', 'actor']),
            submitOnClose: false,
            scrollY: [
                '.sheet-sidebar',
                '.spellcastingEntry-list',
                '.actions-list',
                '.skills-pane',
                '.feats-pane',
                '.inventory-pane',
                '.actions-pane',
                '.spellbook-pane',
                '.skillstab-pane',
                '.pfs-pane',
                '.tab.active',
            ],
        });
    }

    override get isEditable(): boolean {
        return this.actor.canUserModify(game.user, 'update');
    }

    /** Can non-owning users loot items from this sheet? */
    get isLootSheet(): boolean {
        return false;
    }

    override getData(): ActorSheetDataPF2e<TActor> {
        // The Actor and its Items
        const actorData = this.actor.toObject(false);
        const items = deepClone(
            this.actor.items.map((item) => item.data).sort((a, b) => (a.sort || 0) - (b.sort || 0)),
        );
        (actorData as any).items = items;

        const inventoryItems = items.filter((itemData): itemData is InventoryItem => itemData.isPhysical);
        for (const itemData of inventoryItems) {
            itemData.isContainer = itemData.type === 'backpack';
        }

        // Calculate financial and total wealth
        const coins = calculateValueOfCurrency(inventoryItems);
        const totalCoinage = ActorSheetPF2e.coinsToSheetData(coins);
        const totalCoinageGold = (coinValueInCopper(coins) / 100).toFixed(2);

        const totalWealth = calculateTotalWealth(inventoryItems);
        const totalWealthGold = (coinValueInCopper(totalWealth) / 100).toFixed(2);

        const sheetData: ActorSheetDataPF2e<TActor> = {
            cssClass: this.actor.isOwner ? 'editable' : 'locked',
            editable: this.isEditable,
            document: this.actor,
            limited: this.actor.limited,
            options: this.options,
            owner: this.actor.isOwner,
            title: this.title,
            actor: actorData,
            data: actorData.data,
            effects: actorData.effects,
            items: items,
            user: { isGM: game.user.isGM },
            isTargetFlatFooted: this.actor.getFlag(game.system.id, 'rollOptions.all.target:flatFooted'),
            isProficiencyLocked: this.actor.getFlag(game.system.id, 'proficiencyLock'),
            totalCoinage,
            totalCoinageGold,
            totalWealth,
            totalWealthGold,
        };

        this.prepareTraits(sheetData.data.traits);
        this.prepareItems(sheetData);

        return sheetData;
    }

    protected abstract prepareItems(sheetData: { actor: ActorDataPF2e }): void;

    protected findActiveList() {
        return (this.element as JQuery).find('.tab.active .directory-list');
    }

    protected static coinsToSheetData(coins: Coins): CoinageSummary {
        const denominations = ['cp', 'sp', 'gp', 'pp'] as const;
        return denominations.reduce(
            (accumulated, denomination) => ({
                ...accumulated,
                [denomination]: {
                    value: coins[denomination],
                    label: CONFIG.PF2E.currencies[denomination],
                },
            }),
            {} as CoinageSummary,
        );
    }

    protected prepareTraits(traits: any): void {
        if (traits === undefined) return;

        const map = {
            languages: CONFIG.PF2E.languages,
            dr: CONFIG.PF2E.resistanceTypes,
            di: CONFIG.PF2E.immunityTypes,
            dv: CONFIG.PF2E.weaknessTypes,
            ci: CONFIG.PF2E.immunityTypes,
            traits: CONFIG.PF2E.creatureTraits,
        };

        for (const [t, choices] of Object.entries(map)) {
            const trait = traits[t] || { value: [], selected: [] };

            if (Array.isArray(trait)) {
                // todo this is so wrong...
                (trait as any).selected = {};
                for (const entry of trait) {
                    if (typeof entry === 'object') {
                        const entryType = game.i18n.localize(choices[entry.type]);
                        if ('exceptions' in entry && entry.exceptions !== '') {
                            const exceptions = entry.exceptions;
                            (trait as any).selected[entry.type] = `${entryType} (${entry.value}) [${exceptions}]`;
                        } else {
                            let text = entryType;
                            if (entry.value !== '') text = `${text} (${entry.value})`;
                            (trait as any).selected[entry.type] = text;
                        }
                    } else {
                        (trait as any).selected[entry] = choices[entry] || String(entry);
                    }
                }
            } else if (trait.value) {
                trait.selected = Object.fromEntries(
                    (trait.value as string[])
                        .filter((key): key is keyof typeof choices => objectHasKey(choices, key))
                        .map((key) => [key, choices[key]]),
                );
            }

            // Add custom entry
            if (trait.custom) trait.selected.custom = trait.custom;
        }
    }

    /** Save any open tinyMCE editor before closing */
    override async close(options: { force?: boolean } = {}): Promise<void> {
        const editors = Object.values(this.editors).filter((editor) => editor.active);
        for (const editor of editors) {
            editor.options.save_onsavecallback();
        }
        await super.close(options);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners(html: JQuery): void {
        super.activateListeners(html);

        // Pad field width
        html.find('[data-wpad]').each((_i, e) => {
            const text = e.tagName === 'INPUT' ? (e as HTMLInputElement).value : e.innerText;
            const w = (text.length * Number(e?.getAttribute('data-wpad'))) / 2;
            e.setAttribute('style', `flex: 0 0 ${w}px`);
        });

        // Item summaries
        html.find('.item .item-name h4').on('click', (event) => {
            this.onItemSummary(event);
        });

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        /* -------------------------------------------- */
        /*  Attributes, Skills, Saves and Traits
        /* -------------------------------------------- */

        // Roll Save Checks
        html.find('.save-name').on('click', (event) => {
            event.preventDefault();
            const save = $(event.currentTarget).parents('[data-save]')[0].getAttribute('data-save') as SaveType;
            if (this.actor.data.data.saves[save]?.roll) {
                const options = this.actor.getRollOptions(['all', 'saving-throw', save]);
                this.actor.data.data.saves[save].roll({ event, options });
            } else {
                this.actor.rollSave(event, save);
            }
        });

        // Roll Attribute Checks
        html.find('.roll-init').on('click', (event) => {
            event.preventDefault();
            if (
                'initiative' in this.actor.data.data.attributes &&
                'roll' in this.actor.data.data.attributes.initiative
            ) {
                const checkType = this.actor.data.data.attributes.initiative.ability as unknown as SkillAbbreviation;
                const options = this.actor.getRollOptions(
                    ['all', 'initiative'].concat(SKILL_DICTIONARY[checkType] ?? checkType),
                );
                this.actor.data.data.attributes.initiative.roll({ event, options });
            }
        });

        html.find('.attribute-name').on('click', (event) => {
            event.preventDefault();
            const attribute = event.currentTarget.parentElement?.getAttribute('data-attribute') || '';
            const isSecret = event.currentTarget.getAttribute('data-secret');
            if (this.actor.data.data.attributes[attribute]?.roll) {
                const options = this.actor.getRollOptions(['all', attribute]);
                if (isSecret) {
                    options.push('secret');
                }
                this.actor.data.data.attributes[attribute].roll({ event, options });
            } else {
                this.actor.rollAttribute(event, attribute);
            }
        });

        // Roll Ability Checks
        html.find('.ability-name').on('click', (event) => {
            event.preventDefault();
            const ability = event.currentTarget.parentElement?.getAttribute('data-ability') as AbilityString;
            if (ability) {
                this.actor.rollAbility(event, ability);
            }
        });

        // Roll Skill Checks
        html.find('.skill-name.rollable, .skill-score.rollable').on('click', (event) => {
            const skill = event.currentTarget.parentElement?.getAttribute('data-skill') as
                | SkillAbbreviation
                | undefined;
            if (!skill) {
                return;
            }
            if (this.actor.data.data.skills[skill]?.roll) {
                const options = this.actor.getRollOptions(['all', 'skill-check', SKILL_DICTIONARY[skill] ?? skill]);
                this.actor.data.data.skills[skill].roll({ event, options });
            } else {
                this.actor.rollSkill(event, skill);
            }
        });

        // Remove Spell Slot
        html.find('.item-unprepare').on('click', (event) => {
            const spellLvl = Number($(event.currentTarget).parents('.item').attr('data-spell-lvl') ?? 0);
            const slotId = Number($(event.currentTarget).parents('.item').attr('data-slot-id') ?? 0);
            const entryId = $(event.currentTarget).parents('.item').attr('data-entry-id') ?? '';
            const entry = this.actor.items.get(entryId);
            if (entry instanceof SpellcastingEntryPF2e) {
                entry.unprepareSpell(spellLvl, slotId);
            } else {
                console.warn('PF2E System | Failed to load spellcasting entry');
            }
        });

        // Set Expended Status of Spell Slot
        html.find('.item-toggle-prepare').on('click', (event) => {
            const slotId = Number($(event.currentTarget).parents('.item').attr('data-slot-id') ?? 0);
            const spellLvl = Number($(event.currentTarget).parents('.item').attr('data-spell-lvl') ?? 0);
            const entryId = $(event.currentTarget).parents('.item').attr('data-entry-id') ?? '';
            const expendedState = ((): boolean => {
                const expendedString = $(event.currentTarget).parents('.item').attr('data-expended-state') ?? '';
                return expendedString !== 'true';
            })();
            const entry = this.actor.items.get(entryId);
            if (entry instanceof SpellcastingEntryPF2e) {
                entry.setSlotExpendedState(spellLvl, slotId, expendedState);
            } else {
                console.warn('PF2E System | Failed to load spellcasting entry');
            }
        });

        // Toggle equip
        html.find('.item-toggle-equip').on('click', (event) => {
            const f = $(event.currentTarget);
            const itemId = f.parents('.item').attr('data-item-id') ?? '';
            const active = f.hasClass('active');
            this.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, 'data.equipped.value': !active }]);
        });

        // Trait Selector
        html.find('.trait-selector').on('click', (event) => this.onTraitSelector(event));

        html.find('.add-coins-popup button').on('click', (event) => this.onAddCoinsPopup(event));

        html.find('.remove-coins-popup button').on('click', (event) => this.onRemoveCoinsPopup(event));

        html.find('.sell-all-treasure button').on('click', (event) => this.onSellAllTreasure(event));

        // Feat Browser
        html.find('.feat-browse').on('click', () => game.pf2e.compendiumBrowser.openTab('feat'));

        // Action Browser
        html.find('.action-browse').on('click', () => game.pf2e.compendiumBrowser.openTab('action'));

        // Spell Browser
        html.find('.spell-browse').on('click', () => game.pf2e.compendiumBrowser.openTab('spell'));

        // Inventory Browser
        html.find('.inventory-browse').on('click', (event) => this.onClickBrowseCompendia(event));

        // Spell Create
        html.find('.spell-create').on('click', (event) => this.onClickCreateItem(event));

        // Add Spellcasting Entry
        html.find('.spellcasting-create').on('click', (event) => this.createSpellcastingEntry(event));

        // Remove Spellcasting Entry
        html.find('.spellcasting-remove').on('click', (event) => this.removeSpellcastingEntry(event));

        // toggle visibility of filter containers
        html.find('.hide-container-toggle').on('click', (event) => {
            $(event.target)
                .parent()
                .siblings()
                .toggle(100, () => {});
        });

        /* -------------------------------------------- */
        /*  Inventory                                   */
        /* -------------------------------------------- */

        // Create New Item
        html.find('.item-create').on('click', (event) => this.onClickCreateItem(event));

        html.find('.item-toggle-container').on('click', (event) => this.toggleContainer(event));

        // Sell treasure item
        html.find('.item-sell-treasure').on('click', (event) => {
            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id') ?? '';
            sellTreasure(this.actor, itemId);
        });

        // Update Inventory Item
        html.find('.item-edit').on('click', (event) => {
            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            const item = this.actor.items.get(itemId ?? '');
            if (item) {
                item.sheet.render(true);
            }
        });

        // Toggle identified
        html.find('.item-toggle-identified').on('click', (event) => {
            const f = $(event.currentTarget);
            const itemId = f.parents('.item').attr('data-item-id') ?? '';
            const identified = f.hasClass('identified');
            if (identified) {
                const item = this.actor.items.get(itemId);
                if (!(item instanceof PhysicalItemPF2e)) {
                    throw ErrorPF2e(`${itemId} is not a physical item.`);
                }
                item.setIdentificationStatus('unidentified');
            } else {
                const item = this.actor.items.get(itemId);
                if (item instanceof PhysicalItemPF2e) {
                    new IdentifyItemPopup(item).render(true);
                }
            }
        });

        // Delete Inventory Item
        html.find('.item-delete').on('click', (event) => this.onClickDeleteItem(event));

        // Increase Item Quantity
        html.find('.item-increase-quantity').on('click', (event) => {
            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id') ?? '';
            const item = this.actor.items.get(itemId);
            if (!(item instanceof PhysicalItemPF2e)) {
                throw new Error('PF2e System | Tried to update quantity on item that does not have quantity');
            }
            this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: itemId,
                    'data.quantity.value': Number(item.data.data.quantity.value) + 1,
                },
            ]);
        });

        // Decrease Item Quantity
        html.find('.item-decrease-quantity').on('click', (event) => {
            const li = $(event.currentTarget).parents('.item');
            const itemId = li.attr('data-item-id') ?? '';
            const item = this.actor.items.get(itemId);
            if (!(item instanceof PhysicalItemPF2e)) {
                throw new Error('Tried to update quantity on item that does not have quantity');
            }
            if (Number(item.data.data.quantity.value) > 0) {
                this.actor.updateEmbeddedDocuments('Item', [
                    {
                        _id: itemId,
                        'data.quantity.value': Number(item.data.data.quantity.value) - 1,
                    },
                ]);
            }
        });

        // Toggle Spell prepared value
        html.find('.item-prepare').on('click', (event) => {
            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            const item = this.actor.items.get(itemId ?? '');
            if (!(item instanceof SpellPF2e)) {
                throw new Error('Tried to update prepared on item that does not have prepared');
            }
            item.update({ 'data.prepared.value': !item.data.data.prepared.value });
        });

        // Item Rolling
        html.find('[data-item-id].item .item-image').on('click', (event) => this.onItemRoll(event));

        // Update Item Bonus on an actor.item input
        html.find<HTMLInputElement>('.item-value-input').on('change', async (event) => {
            event.preventDefault();

            let itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            if (!itemId) {
                itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
            }

            await this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: itemId ?? '',
                    'data.item.value': Number(event.target.value),
                },
            ]);
        });

        // Update Item Name
        html.find<HTMLInputElement>('.item-name-input').on('change', async (event) => {
            const itemId = event.target.attributes['data-item-id']?.value ?? '';
            await this.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, name: event.target.value }]);
        });

        // Update used slots for Spell Items
        html.find<HTMLInputElement>('.spell-slots-input').on('change', async (event) => {
            event.preventDefault();

            const $input = $(event.target);
            const itemId = $input.closest('.item, .section').attr('data-item-id') ?? '';
            const spellcastingEntry = this.actor.items.get(itemId);
            if (!(spellcastingEntry instanceof SpellcastingEntryPF2e)) throw ErrorPF2e('Spellcasting entry not found');

            const slotLevel = Number($input.closest('.item, .section').attr('data-level') ?? 0);
            const slots = spellcastingEntry.data.data.slots;
            const slot = slots[`slot${slotLevel}` as keyof typeof slots];
            const newValue = Math.clamped(Number($input.val()), 0, slot.max);

            await spellcastingEntry.update({ [`data.slots.slot${slotLevel}.value`]: newValue });
        });

        // Update max slots for Spell Items
        html.find<HTMLInputElement>('.spell-max-input').on('change', async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item, .section').attr('data-item-id') ?? '';
            const slotLvl = Number($(event.currentTarget).parents('.item, .section').attr('data-level')) || 0;
            await this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: itemId,
                    [`data.slots.slot${slotLvl}.max`]: Number(event.target.value),
                },
            ]);
        });

        // Modify select element
        html.find<HTMLSelectElement>('.ability-select').on('change', async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id') ?? '';
            await this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: itemId,
                    'data.ability.value': event.target.value,
                },
            ]);
        });

        // Update max slots for Spell Items
        html.find('.prepared-toggle').on('click', async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id') ?? '';
            const itemToEdit = this.actor.items.get(itemId)?.data;
            if (itemToEdit?.type !== 'spellcastingEntry')
                throw new Error('Tried to toggle prepared spells on a non-spellcasting entry');
            const bool = !(itemToEdit.data.showUnpreparedSpells || {}).value;

            await this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: itemId ?? '',
                    'data.showUnpreparedSpells.value': bool,
                },
            ]);
        });

        html.find('.level-prepared-toggle').on('click', async (event) => {
            event.preventDefault();

            const parentNode = $(event.currentTarget).parents('.spellbook-header');
            const itemId = parentNode.attr('data-item-id') ?? '';
            const lvl = Number(parentNode.attr('data-level') ?? '');
            if (!Number.isInteger(lvl)) {
                return;
            }

            const itemToEdit = this.actor.items.get(itemId)?.data;
            if (itemToEdit?.type !== 'spellcastingEntry')
                throw new Error('Tried to toggle prepared spells on a non-spellcasting entry');
            const currentDisplayLevels = itemToEdit.data.displayLevels || {};
            currentDisplayLevels[lvl] = currentDisplayLevels[lvl] === undefined ? false : !currentDisplayLevels[lvl];
            await this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: itemId,
                    'data.displayLevels': currentDisplayLevels,
                },
            ]);
            this.render();
        });

        // Select all text in an input field on focus
        html.find<HTMLInputElement>('input[type=text], input[type=number]').on('focus', (event) => {
            event.currentTarget.select();
        });
    }

    async onClickDeleteItem(event: JQuery.ClickEvent | JQuery.ContextMenuEvent): Promise<void> {
        const li = $(event.currentTarget).closest('.item');
        const itemId = li.attr('data-item-id') ?? '';
        const item = this.actor.items.get(itemId);

        if (item instanceof ConditionPF2e && item.fromSystem) {
            const references = li.find('.condition-references');

            const deleteCondition = async (): Promise<void> => {
                this.actor.decreaseCondition(item, { forceRemove: true });
            };

            if (event.ctrlKey) {
                deleteCondition();
                return;
            }

            const content = await renderTemplate('systems/pf2e/templates/actors/delete-condition-dialog.html', {
                question: game.i18n.format('PF2E.DeleteConditionQuestion', { condition: item.name }),
                ref: references.html(),
            });
            new Dialog({
                title: game.i18n.localize('PF2E.DeleteConditionTitle'),
                content,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: 'Yes',
                        callback: deleteCondition,
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                    },
                },
                default: 'Yes',
            }).render(true);
        } else if (item instanceof ItemPF2e) {
            const deleteItem = async (): Promise<void> => {
                await item.delete();
                if (item.type === 'lore') {
                    // normalize skill name to lower-case and dash-separated words
                    const skill = item.name.toLowerCase().replace(/\s+/g, '-');
                    // remove derived skill data
                    await this.actor.update({ [`data.skills.-=${skill}`]: null });
                } else {
                    // clean up any individually targeted modifiers to attack and damage
                    await this.actor.update({
                        [`data.customModifiers.-=${itemId}-attack`]: null,
                        [`data.customModifiers.-=${itemId}-damage`]: null,
                    });
                }
                li.slideUp(200, () => this.render(false));
            };
            if (event.ctrlKey) {
                deleteItem();
                return;
            }

            const content = await renderTemplate('systems/pf2e/templates/actors/delete-item-dialog.html', {
                name: item.name,
            });
            new Dialog({
                title: 'Delete Confirmation',
                content,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: 'Yes',
                        callback: deleteItem,
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                    },
                },
                default: 'Yes',
            }).render(true);
        } else {
            throw ErrorPF2e('Item not found');
        }
    }

    private onClickBrowseCompendia(event: JQuery.ClickEvent<HTMLElement>) {
        const filter = $(event.currentTarget).attr('data-filter') ?? null;
        console.debug(`Filtering on: ${filter}`);
        game.pf2e.compendiumBrowser.openTab('equipment', filter);
    }

    protected override _canDragStart(selector: string): boolean {
        if (this.isLootSheet) return true;
        return super._canDragStart(selector);
    }

    protected override _canDragDrop(selector: string): boolean {
        if (this.isLootSheet) return true;
        return super._canDragDrop(selector);
    }

    /** Add support for dropping actions and toggles */
    protected override _onDragStart(event: ElementDragEvent): void {
        const $li = $(event.currentTarget);

        const baseDragData = {
            actorId: this.actor.id,
            sceneId: canvas.scene?.id ?? null,
            tokenId: this.actor.token?.id ?? null,
        };

        // Dragging ...
        const supplementalData = (() => {
            const actionIndex = $li.attr('data-action-index');
            const toggleProperty = $li.attr('data-toggle-property');
            const toggleLabel = $li.attr('data-toggle-label');

            // ... an action?
            if (actionIndex) {
                return {
                    type: 'Action',
                    index: Number(actionIndex),
                };
            }
            // ... a toggle?
            if (toggleProperty) {
                return {
                    type: 'Toggle',
                    property: toggleProperty,
                    label: toggleLabel,
                };
            }

            // ... something else?
            return null;
        })();

        return supplementalData
            ? event.dataTransfer.setData(
                  'text/plain',
                  JSON.stringify({
                      ...baseDragData,
                      ...supplementalData,
                  }),
              )
            : super._onDragStart(event);
    }

    /** Handle a drop event for an existing Owned Item to sort that item */
    protected override async _onSortItem(event: ElementDragEvent, itemData: ItemSourcePF2e): Promise<ItemPF2e[]> {
        const dropSlotType = $(event.target).closest('.item').attr('data-item-type');
        const dropContainerType = $(event.target).parents('.item-container').attr('data-container-type');
        const item = this.actor.items.get(itemData._id);
        if (!item) return [];

        // if they are dragging onto another spell, it's just sorting the spells
        // or moving it from one spellcastingEntry to another
        if (item instanceof SpellPF2e && itemData.type === 'spell') {
            if (dropSlotType === 'spellLevel') {
                const { itemId, level } = $(event.target).closest('.item').data();

                if (typeof itemId === 'string' && typeof level === 'number') {
                    if (this.moveSpell(itemData, itemId, level)) {
                        return this.actor.updateEmbeddedDocuments('Item', [itemData]);
                    }
                }
            } else if (dropSlotType === 'spell') {
                const dropId = $(event.target).parents('.item').attr('data-item-id') ?? '';
                const target = this.actor.items.get(dropId);
                if (target instanceof SpellPF2e && item.id !== dropId) {
                    const sourceLevel = item.heightenedLevel;
                    const sourceLocation = item.data.data.location.value;
                    const targetLevel = target.heightenedLevel;
                    const targetLocation = target.data.data.location.value;
                    if (sourceLevel === targetLevel && sourceLocation === targetLocation) {
                        const entry = this.actor.items.get(sourceLocation);
                        if (entry instanceof SpellcastingEntryPF2e) {
                            const siblings = entry.spells.filter((i) => i.heightenedLevel === sourceLevel);
                            const sortBefore = item.data.sort >= target.data.sort;
                            await item.sortRelative({ target, siblings, sortBefore });
                            return [target];
                        } else {
                            console.warn('PF2E System | Failed to load spellcasting entry');
                        }
                    } else {
                        if (this.moveSpell(itemData, targetLocation, targetLevel)) {
                            return this.actor.updateEmbeddedDocuments('Item', [itemData]);
                        }
                    }
                }
            } else if (dropSlotType === 'spellSlot') {
                if (CONFIG.debug.hooks) console.debug('PF2e System | ***** spell dropped on a spellSlot *****');
                const dropId = Number($(event.target).closest('.item').attr('data-item-id'));
                const spellLvl = Number($(event.target).closest('.item').attr('data-spell-lvl'));
                const entryId = $(event.target).closest('.item').attr('data-entry-id') ?? '';

                if (Number.isInteger(dropId) && Number.isInteger(spellLvl) && entryId) {
                    const entry = this.actor.items.get(entryId);
                    if (entry instanceof SpellcastingEntryPF2e) {
                        const allocated = await entry.prepareSpell(item, spellLvl, dropId);
                        if (allocated) return [allocated];
                    } else {
                        console.warn('PF2E System | Failed to load spellcasting entry');
                    }
                }
            } else if (dropContainerType === 'spellcastingEntry') {
                // if the drop container target is a spellcastingEntry then check if the item is a spell and if so update its location.
                // if the dragged item is a spell and is from the same actor
                if (CONFIG.debug.hooks)
                    console.debug('PF2e System | ***** spell from same actor dropped on a spellcasting entry *****');

                const dropId = $(event.target).parents('.item-container').attr('data-container-id');
                return dropId ? [await item.update({ 'data.location.value': dropId })] : [];
            }
        } else if (itemData.type === 'spellcastingEntry') {
            // target and source are spellcastingEntries and need to be sorted
            if (dropContainerType === 'spellcastingEntry') {
                const sourceId = itemData._id;
                const dropId = $(event.target).parents('.item-container').attr('data-container-id') ?? '';
                const source = this.actor.items.get(sourceId);
                const target = this.actor.items.get(dropId);

                if (source && target && source.id !== target.id) {
                    const siblings = this.actor.itemTypes.spellcastingEntry;
                    const sortBefore = source.data.sort >= target.data.sort;
                    source.sortRelative({ target, siblings, sortBefore });
                    return [target];
                }
            }
        }

        const $container = $(event.target).closest('[data-item-is-container="true"]');
        const containerId = $container.attr('data-item-id') ?? '';
        const container = this.actor.physicalItems.get(containerId);
        if (
            item instanceof PhysicalItemPF2e &&
            (!container || container instanceof ContainerPF2e) &&
            item.container?.id !== container?.id
        ) {
            await this.actor.stowOrUnstow(item, container);
            return [item];
        }

        return super._onSortItem(event, itemData);
    }

    protected override async _onDropItemCreate(itemData: ItemSourcePF2e | ItemSourcePF2e[]): Promise<ItemPF2e[]> {
        const itemsData = Array.isArray(itemData) ? itemData : [itemData];
        const includesABCItems = itemsData.some((datum) => ['ancestry', 'background', 'class'].includes(datum.type));
        if (this.actor.type !== 'character' && includesABCItems) {
            // ignore these. they should get handled in the derived class
            ui.notifications.error(game.i18n.localize('PF2E.ItemNotSupportedOnActor'));
            return [];
        }
        return super._onDropItemCreate(itemData);
    }

    async onDropItem(data: DropCanvasItemDataPF2e) {
        return await this._onDropItem({ preventDefault(): void {} } as ElementDragEvent, data);
    }

    /** Extend the base _onDropItem method to handle dragging spells onto spell slots. */
    protected override async _onDropItem(event: ElementDragEvent, data: DropCanvasItemDataPF2e): Promise<ItemPF2e[]> {
        event.preventDefault();

        const item = await ItemPF2e.fromDropData(data);
        if (!item) return [];
        const itemData = item.toObject();

        const actor = this.actor;
        const isSameActor = data.actorId === actor.id || (actor.isToken && data.tokenId === actor.token?.id);
        if (isSameActor) return this._onSortItem(event, itemData);

        const sourceItemId = data.data?._id;
        if (data.actorId && isPhysicalData(itemData) && typeof sourceItemId === 'string') {
            await this.moveItemBetweenActors(
                event,
                data.actorId,
                data.tokenId ?? '',
                actor.id,
                actor.token?.id ?? '',
                sourceItemId,
            );
            return [item];
        }

        // get the item type of the drop target
        const $itemEl = $(event.target).closest('.item');
        const $containerEl = $(event.target).closest('.item-container');
        const dropSlotType = $itemEl.attr('data-item-type');
        const containerAttribute = $containerEl.attr('data-container-type');
        const unspecificInventory = this._tabs[0]?.active === 'inventory' && !containerAttribute;
        const dropContainerType = unspecificInventory ? 'actorInventory' : containerAttribute;

        // otherwise they are dragging a new spell onto their sheet.
        // we still need to put it in the correct spellcastingEntry
        if (item instanceof SpellPF2e && itemData.type === 'spell') {
            if (dropSlotType === 'spellSlot' || dropContainerType === 'spellcastingEntry') {
                const dropId = $containerEl.attr('data-item-id') ?? '';
                const level = Math.max(Number($itemEl.attr('data-level')) || 0, item.level);
                if (this.moveSpell(itemData, dropId, level)) {
                    this.actor._setShowUnpreparedSpells(dropId, itemData.data.level?.value);
                    return this.actor.createEmbeddedDocuments('Item', [itemData]);
                }
            } else if (dropSlotType === 'spellLevel') {
                const { itemId, level } = $itemEl.data();

                if (typeof itemId === 'string' && typeof level === 'number') {
                    this.moveSpell(itemData, itemId, level);
                    return this.actor.createEmbeddedDocuments('Item', [itemData]);
                }
            } else if (dropSlotType === 'spell') {
                const { containerId } = $containerEl.data();
                const { spellLvl } = $itemEl.data();

                if (typeof containerId === 'string' && typeof spellLvl === 'number') {
                    this.moveSpell(itemData, containerId, spellLvl);
                    return this.actor.createEmbeddedDocuments('Item', [itemData]);
                }
            } else if (dropContainerType === 'actorInventory' && itemData.data.level.value > 0) {
                const popup = new ScrollWandPopup(
                    this.actor,
                    {},
                    async (heightenedLevel, itemType, spellData) => {
                        const consumableType =
                            itemType == 'wand' ? SpellConsumableTypes.Wand : SpellConsumableTypes.Scroll;

                        const item = await createConsumableFromSpell(consumableType, spellData, heightenedLevel);
                        return this._onDropItemCreate(item);
                    },
                    itemData,
                );
                popup.render(true);
                return [item];
            } else {
                return [];
            }
        } else if (itemData.type === 'spellcastingEntry') {
            // spellcastingEntry can only be created. drag & drop between actors not allowed
            return [];
        } else if (item instanceof KitPF2e) {
            item.dumpContents(this.actor);
            return [item];
        } else if (itemData.type === 'condition') {
            const value = data.value;
            if (typeof value === 'number' && itemData.data.value.isValued) {
                itemData.data.value.value = value;
            }
            const token = actor.token?.object
                ? actor.token.object
                : canvas.tokens.controlled.find((canvasToken) => canvasToken.actor?.id === actor.id);

            if (!actor.canUserModify(game.user, 'update')) {
                const translations = LocalizePF2e.translations.PF2E;
                ui.notifications.error(translations.ErrorMessage.NoUpdatePermission);
                return [];
            } else if (token) {
                const condition = await game.pf2e.ConditionManager.addConditionToToken(itemData, token);
                return condition ? [condition] : [];
            } else {
                await actor.increaseCondition(itemData.data.slug, { min: itemData.data.value.value });
                return [item];
            }
        } else if (itemData.type === 'effect' && data && 'level' in data) {
            const level = data.level;
            if (typeof level === 'number' && level >= 0) {
                itemData.data.level.value = level;
            }
        }

        if (isPhysicalData(itemData)) {
            const containerId =
                $(event.target).closest('[data-item-is-container="true"]').attr('data-item-id')?.trim() || null;
            const container = this.actor.itemTypes.backpack.find((container) => container.id === containerId);
            if (container) {
                itemData.data.containerId.value = containerId;
            }
        }
        return this._onDropItemCreate(itemData);
    }

    protected override async _onDropFolder(
        _event: ElementDragEvent,
        data: DropCanvasData<'Folder', FolderPF2e>,
    ): Promise<ItemPF2e[]> {
        if (!(this.actor.isOwner && data.documentName === 'Item')) return [];
        const folder = (await FolderPF2e.fromDropData(data)) as FolderPF2e<ItemPF2e> | undefined;
        if (!folder) return [];
        const itemSources = folder.flattenedContents.map((item) => item.toObject());
        return this._onDropItemCreate(itemSources);
    }

    /**
     * Moves an item between two actors' inventories.
     * @param event         Event that fired this method.
     * @param sourceActorId ID of the actor who originally owns the item.
     * @param targetActorId ID of the actor where the item will be stored.
     * @param itemId           ID of the item to move between the two actors.
     */
    async moveItemBetweenActors(
        event: ElementDragEvent,
        sourceActorId: string,
        sourceTokenId: string,
        targetActorId: string,
        targetTokenId: string,
        itemId: string,
    ): Promise<void> {
        const sourceActor = sourceTokenId ? game.actors.tokens[sourceTokenId] : game.actors.get(sourceActorId);
        const targetActor = targetTokenId ? game.actors.tokens[targetTokenId] : game.actors.get(targetActorId);
        const item = sourceActor?.items?.get(itemId);

        if (!sourceActor || !targetActor) {
            return Promise.reject(new Error('PF2e System | Unexpected missing actor(s)'));
        }
        if (!(item instanceof PhysicalItemPF2e)) {
            return Promise.reject(new Error('PF2e System | Missing or invalid item'));
        }

        const container = $(event.target).parents('[data-item-is-container="true"]');
        const containerId = container[0] !== undefined ? container[0].dataset.itemId?.trim() : undefined;
        const sourceItemQuantity = Number(item.data.data.quantity.value);
        // If more than one item can be moved, show a popup to ask how many to move
        if (sourceItemQuantity > 1) {
            const popup = new MoveLootPopup(sourceActor, { maxQuantity: sourceItemQuantity }, (quantity) => {
                sourceActor.transferItemToActor(targetActor, item, quantity, containerId);
            });

            popup.render(true);
        } else {
            sourceActor.transferItemToActor(targetActor, item, 1, containerId);
        }
    }

    private moveSpell(spellData: SpellSource, targetLocation: string, targetLevel: number): boolean {
        // todo: this function should receive the spell, not the data
        const spell = new SpellPF2e(spellData, { parent: this.actor });
        const spellcastingEntryId = spellData.data.location.value;
        if (spellcastingEntryId === targetLocation && spell.heightenedLevel === targetLevel) {
            return false;
        }

        const spellcastingEntry = this.actor.items.get(targetLocation);
        if (!(spellcastingEntry instanceof SpellcastingEntryPF2e)) {
            throw ErrorPF2e(`SpellcastingEntry ${targetLocation} not found in actor ${this.actor.id}`);
        }

        spellData.data.location.value = targetLocation;

        if (!spell.isCantrip && !spell.isFocusSpell && !spell.isRitual) {
            if (spellcastingEntry.isSpontaneous || spellcastingEntry.isInnate) {
                spellData.data.heightenedLevel = { value: Math.max(spell.level, targetLevel) };
            }
        }

        return true;
    }

    /**
     * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
     */
    private onItemRoll(event: JQuery.ClickEvent) {
        event.preventDefault();
        const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
        const item = this.actor.items.get(itemId ?? '');
        item?.toChat(event);
    }

    /**
     * Handles expanding and contracting the item summary,
     * delegating the populating of the item summary to renderItemSummary()
     */
    protected onItemSummary(event: JQuery.ClickEvent) {
        event.preventDefault();

        const li = $(event.currentTarget).parent().parent();
        this.toggleItemSummary(li);
    }

    /**
     * Triggers toggling the visibility of an item summary element,
     * delegating the populating of the item summary to renderItemSummary()
     */
    toggleItemSummary(li: JQuery, options: { instant?: boolean } = {}) {
        const itemId = li.attr('data-item-id');
        const itemType = li.attr('data-item-type');

        if (itemType === 'spellSlot') return;

        const item = this.actor.items.get(itemId ?? '');
        if (!item) return;

        if (item.data.type === 'spellcastingEntry' || item.data.type === 'condition') return;

        // Toggle summary
        if (li.hasClass('expanded')) {
            const summary = li.children('.item-summary');
            if (options.instant) {
                summary.remove();
            } else {
                summary.slideUp(200, () => summary.remove());
            }
        } else {
            const div = $('<div class="item-summary"/>');
            this.renderItemSummary(div, item);
            li.append(div);
            if (!options.instant) {
                div.hide().slideDown(200);
            }
        }

        li.toggleClass('expanded');
    }

    /**
     * Called when an item summary is expanded and needs to be filled out.
     * @todo Move this to templates
     */
    protected renderItemSummary(
        div: JQuery,
        item: Embedded<ItemPF2e>,
        chatData = item.getChatData({ secrets: this.actor.isOwner }),
    ) {
        const localize = game.i18n.localize.bind(game.i18n);

        const props = $('<div class="item-properties tags"></div>');
        if (item instanceof PhysicalItemPF2e) {
            const mystifiedClass = item.isIdentified ? '' : ' mystified';
            const rarityLabel = CONFIG.PF2E.rarityTraits[item.rarity];
            props.append(`<span class="tag tag_secondary${mystifiedClass}">${localize(rarityLabel)}</span>`);
        }

        if (Array.isArray(chatData.properties)) {
            const mystifiedClass = item instanceof PhysicalItemPF2e && !item.isIdentified ? ' mystified' : '';
            chatData.properties
                .filter((property): property is string => typeof property === 'string')
                .forEach((property) => {
                    props.append(`<span class="tag tag_secondary${mystifiedClass}">${localize(property)}</span>`);
                });
        }

        // append traits (only style the tags if they contain description data)
        const traits = chatData['traits'];
        if (Array.isArray(traits)) {
            for (const trait of traits) {
                if (trait.excluded) continue;
                const label: string = game.i18n.localize(trait.label);
                const mystifiedClass = trait.mystified ? 'mystified' : [];
                if (trait.description) {
                    const classes = ['tag', mystifiedClass].flat().join(' ');
                    const description = game.i18n.localize(trait.description);
                    const $trait = $(`<span class="${classes}" title="${description}">${label}</span>`).tooltipster({
                        animation: 'fade',
                        maxWidth: 400,
                        theme: 'crb-hover',
                        contentAsHTML: true,
                    });
                    props.append($trait);
                } else {
                    const classes: string = ['tag', 'tag_alt', mystifiedClass].flat().join(' ');
                    props.append(`<span class="${classes}">${label}</span>`);
                }
            }
        }

        if (item instanceof PhysicalItemPF2e && item.data.data.stackGroup.value !== 'coins') {
            const priceLabel = game.i18n.format('PF2E.Item.Physical.PriceLabel', { price: item.price });
            div.append($(`<p>${priceLabel}</p>`));
        }

        div.append(props);
        const description = TextEditor.enrichHTML(item.description);
        div.append(`<div class="item-description">${description}</div></div>`);
    }

    /** Opens an item container */
    private toggleContainer(event: JQuery.ClickEvent) {
        const itemId = $(event.currentTarget).parents('.item').data('item-id');
        const item = this.actor.items.get(itemId);
        if (!(item instanceof ContainerPF2e)) return;

        const isCollapsed = item.data.data.collapsed.value ?? false;
        item.update({ 'data.collapsed.value': !isCollapsed });
    }

    /** Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset */
    private onClickCreateItem(event: JQuery.ClickEvent) {
        event.preventDefault();
        const header = event.currentTarget;
        const data: any = duplicate(header.dataset);
        data.img = `systems/pf2e/icons/default-icons/${data.type}.svg`;

        if (data.type === 'feat') {
            const featTypeString = game.i18n.localize(`PF2E.FeatType${data.featType.capitalize()}`);
            data.name = `${game.i18n.localize('PF2E.NewLabel')} ${featTypeString}`;
            mergeObject(data, { 'data.featType.value': data.featType });
        } else if (data.type === 'action') {
            const newLabel = game.i18n.localize('PF2E.NewLabel');
            const actionTypeLabel = game.i18n.localize(`PF2E.ActionType${data.actionType.capitalize()}`);
            data.name = `${newLabel} ${actionTypeLabel}`;
            mergeObject(data, { 'data.actionType.value': data.actionType });
        } else if (data.type === 'melee') {
            data.name = game.i18n.localize(`PF2E.NewPlaceholders.${data.type.capitalize()}`);
            mergeObject(data, { 'data.weaponType.value': data.actionType });
        } else if (data.type === 'spell') {
            data.level = Number(data.level ?? 1);
            // for prepared spellcasting entries, set showUnpreparedSpells to true to avoid the confusion of nothing appearing to happen.
            this.actor._setShowUnpreparedSpells(data.location, data.level);

            const newLabel = game.i18n.localize('PF2E.NewLabel');
            const levelLabel = game.i18n.localize(`PF2E.SpellLevel${data.level}`);
            const spellLabel = data.level > 0 ? game.i18n.localize('PF2E.SpellLabel') : '';
            data.name = `${newLabel} ${levelLabel} ${spellLabel}`;
            mergeObject(data, {
                'data.level.value': data.level,
                'data.location.value': data.location,
            });
            // Show the spellbook pages if you're adding a new spell
            const currentLvlToDisplay: Record<number, boolean> = {};
            currentLvlToDisplay[data.level] = true;
            this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: data.location,
                    'data.showUnpreparedSpells.value': true,
                    'data.displayLevels': currentLvlToDisplay,
                },
            ]);
        } else if (data.type === 'lore') {
            data.name =
                this.actor.type === 'npc'
                    ? game.i18n.localize('PF2E.SkillLabel')
                    : game.i18n.localize('PF2E.NewPlaceholders.Lore');
        } else {
            data.name = game.i18n.localize(`PF2E.NewPlaceholders.${data.type.capitalize()}`);
        }

        this.actor.createEmbeddedDocuments('Item', [data]);
    }

    /** Handle creating a new spellcasting entry for the actor */
    private createSpellcastingEntry(event: JQuery.ClickEvent) {
        event.preventDefault();

        let magicTradition = 'arcane';
        let spellcastingType = 'innate';

        // Render modal dialog
        const template = 'systems/pf2e/templates/actors/spellcasting-dialog.html';
        const title = game.i18n.localize('PF2E.SpellcastingTypeLabel');
        const dialogOptions = {
            width: 300,
            top: event.clientY - 80,
            left: window.innerWidth - 710,
        };
        const dialogData = {
            magicTradition,
            magicTraditions: CONFIG.PF2E.magicTraditions,
            spellcastingType,
            spellcastingTypes: CONFIG.PF2E.preparationType,
        };
        renderTemplate(template, dialogData).then((dlg) => {
            new Dialog(
                {
                    title,
                    content: dlg,
                    render: (html) => {
                        // Set visibility of elements based on current values
                        // Using visibility over display prevents stretching of dialog elements
                        const typeField = $(html).find('[name="spellcastingType"]');
                        typeField.on('change', () => {
                            const traditionGroup = $(html).find('.tradition-group');
                            const isRitual = typeField.val() === 'ritual';
                            traditionGroup.css('visibility', isRitual ? 'hidden' : 'visible');
                        });
                    },
                    buttons: {
                        create: {
                            label: game.i18n.localize('PF2E.CreateLabelUniversal'),
                            callback: (html: JQuery) => {
                                // if ( onClose ) onClose(html, parts, data);
                                let name = '';
                                spellcastingType = `${html.find('[name="spellcastingType"]').val()}`;
                                if (spellcastingType === 'ritual') {
                                    magicTradition = '';
                                    name = game.i18n.localize(CONFIG.PF2E.preparationType['ritual']);
                                } else {
                                    magicTradition = `${html.find('[name="magicTradition"]').val()}` as MagicTradition;
                                    const preparationType = game.i18n.localize(
                                        CONFIG.PF2E.preparationType[spellcastingType],
                                    );
                                    const tradition = game.i18n.localize(CONFIG.PF2E.magicTraditions[magicTradition]);
                                    name = game.i18n.format('PF2E.SpellCastingFormat', {
                                        preparationType,
                                        tradition,
                                    });
                                }

                                // Define new spellcasting entry
                                const actor = this.actor;
                                if (!(actor instanceof CharacterPF2e || actor instanceof NPCPF2e)) return;
                                const actorAbilities = actor.data.data.abilities;

                                const candidateAbilities = ['int', 'wis', 'cha'] as const;
                                const bestAbility = (() => {
                                    if (spellcastingType === 'innate') return 'cha';

                                    return candidateAbilities.reduce((abilityA, abilityB) =>
                                        actorAbilities[abilityA].value > actorAbilities[abilityB].value
                                            ? abilityA
                                            : abilityB,
                                    );
                                })();
                                const spellcastingEntity = {
                                    ability: { value: bestAbility },
                                    spelldc: { value: 0, dc: 0, mod: 0 },
                                    tradition: { value: magicTradition },
                                    prepared: { value: spellcastingType },
                                    showUnpreparedSpells: { value: true },
                                };

                                const data = {
                                    name,
                                    type: 'spellcastingEntry',
                                    data: spellcastingEntity,
                                };

                                this.actor.createEmbeddedDocuments('Item', [data] as unknown as ItemDataPF2e[]);
                            },
                        },
                    },
                    default: 'create',
                },
                dialogOptions,
            ).render(true);
        });
    }

    /**
     * Handle removing an existing spellcasting entry for the actor
     */
    private removeSpellcastingEntry(event: JQuery.ClickEvent): void {
        event.preventDefault();

        const li = $(event.currentTarget).parents('[data-container-id]');
        const itemId = li.attr('data-container-id') ?? '';
        const item = this.actor.items.get(itemId);
        if (!item) {
            return;
        }

        // Render confirmation modal dialog
        renderTemplate('systems/pf2e/templates/actors/delete-spellcasting-dialog.html').then((html) => {
            new Dialog({
                title: 'Delete Confirmation',
                content: html,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: 'Yes',
                        callback: async () => {
                            console.debug('PF2e System | Deleting Spell Container: ', item.name);
                            // Delete all child objects
                            const itemsToDelete: string[] = [];
                            for (const item of this.actor.itemTypes.spell) {
                                if (item.data.data.location.value === itemId) {
                                    itemsToDelete.push(item.id);
                                }
                            }
                            // Delete item container
                            itemsToDelete.push(item.id);
                            await this.actor.deleteEmbeddedDocuments('Item', itemsToDelete);

                            li.slideUp(200, () => this.render(false));
                        },
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                    },
                },
                default: 'Yes',
            }).render(true);
        });
    }

    private onAddCoinsPopup(event: JQuery.ClickEvent) {
        event.preventDefault();
        new AddCoinsPopup(this.actor, {}).render(true);
    }

    private onRemoveCoinsPopup(event: JQuery.ClickEvent) {
        event.preventDefault();
        new RemoveCoinsPopup(this.actor, {}).render(true);
    }

    private onSellAllTreasure(event: JQuery.ClickEvent) {
        event.preventDefault();
        // Render confirmation modal dialog
        renderTemplate('systems/pf2e/templates/actors/sell-all-treasure-dialog.html').then((html) => {
            new Dialog({
                title: game.i18n.localize('PF2E.SellAllTreasureTitle'),
                content: html,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: 'Yes',
                        callback: async () => {
                            console.debug('PF2e System | Selling all treasure: ', this.actor);
                            sellAllTreasure(this.actor);
                        },
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                    },
                },
                default: 'Yes',
            }).render(true);
        });
    }

    protected onTraitSelector(event: JQuery.ClickEvent) {
        event.preventDefault();
        const $anchor = $(event.currentTarget);
        const selectorType = $anchor.attr('data-trait-selector') ?? '';
        if (!tupleHasValue(TAG_SELECTOR_TYPES, selectorType)) {
            throw ErrorPF2e(`Unrecognized trait selector type "${selectorType}"`);
        }
        if (selectorType === 'basic') {
            const objectProperty = $anchor.attr('data-property') ?? '';
            const title = $anchor.attr('data-title');
            const configTypes = ($anchor.attr('data-config-types') ?? '')
                .split(',')
                .map((type) => type.trim())
                .filter((tag): tag is SelectableTagField => tupleHasValue(SELECTABLE_TAG_FIELDS, tag));
            this.tagSelector('basic', {
                objectProperty,
                configTypes,
                title,
            });
        } else {
            this.tagSelector(selectorType);
        }
    }

    /** Construct and render a tag selection menu */
    protected tagSelector(selectorType: Exclude<TagSelectorType, 'basic'>, options?: FormApplicationOptions): void;
    protected tagSelector(selectorType: 'basic', options: BasicSelectorOptions): void;
    protected tagSelector(
        selectorType: TagSelectorType,
        options: FormApplicationOptions | BasicSelectorOptions = {},
    ): void {
        if (selectorType === 'basic' && 'objectProperty' in options) {
            new TagSelectorBasic(this.object, options).render(true);
        } else if (selectorType === 'basic') {
            throw ErrorPF2e('Insufficient options provided to render basic tag selector');
        } else {
            const TagSelector = {
                resistances: TraitSelectorResistances,
                senses: TraitSelectorSenses,
                'speed-types': TraitSelectorSpeeds,
                weaknesses: TraitSelectorWeaknesses,
            }[selectorType];
            new TagSelector(this.object, options).render(true);
        }
    }

    /** Prevent `ActorSheet#_getSubmitData` from preventing the submission of updates to overridden values */
    protected override _getSubmitData(updateData: Record<string, unknown> = {}): Record<string, unknown> {
        const overrides = this.actor.overrides;
        let submitData: Record<string, unknown>;
        try {
            this.actor.overrides = {};
            submitData = super._getSubmitData(updateData);
        } finally {
            this.actor.overrides = overrides;
        }

        for (const propertyPath of Object.keys(submitData)) {
            const update = submitData[propertyPath];
            if (typeof update === 'number') {
                submitData[propertyPath] = this.getIntendedChange(propertyPath, update);
            }
        }

        return submitData;
    }

    /**
     * A user edits numeric values on actor sheets that are frequently modified by data preparation: we should be able
     * to infer the intended change by adding the difference between their update and the prepared value to the
     * underlying base value.
     */
    protected getIntendedChange(propertyPath: string, update: number): number {
        const base = getProperty(this.actor.data._source, propertyPath);
        const prepared = getProperty(this.actor.data, propertyPath);

        return typeof base === 'number' && typeof prepared === 'number' ? base + (update - prepared) : update;
    }

    /** Hide the sheet-config button unless there is more than one sheet option. */
    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();
        const sheetButton = buttons.find((button) => button.class === 'configure-sheet');
        const hasMultipleSheets = Object.keys(CONFIG.Actor.sheetClasses[this.actor.type]).length > 1;
        if (!hasMultipleSheets && sheetButton) {
            buttons.splice(buttons.indexOf(sheetButton), 1);
        }
        return buttons;
    }

    /** Override of inner render function to maintain item summary state */
    protected override async _renderInner(data: Record<string, unknown>, options: RenderOptions) {
        // Identify which item summaries are expanded currently
        const expandedItemElements = this.element.find('.item.expanded[data-item-id]');
        const openItemIds = new Set(expandedItemElements.map((_i, el) => el.dataset.itemId));

        const result = await super._renderInner(data, options);

        // Re-open hidden item summaries
        for (const elementId of openItemIds) {
            this.toggleItemSummary(result.find(`.item[data-item-id=${elementId}]`), { instant: true });
        }

        return result;
    }
}
