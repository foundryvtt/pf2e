import { RemoveCoinsPopup } from './popups/remove-coins-popup';
import { sellAllTreasure, sellTreasure } from '@item/treasure';
import { AddCoinsPopup } from './popups/add-coins-popup';
import { addKit } from '@item/kits';
import { compendiumBrowser } from '@module/apps/compendium-browser';
import { MoveLootPopup } from './loot/move-loot-popup';
import { ActorPF2e, SKILL_DICTIONARY } from '../base';
import { ItemPF2e } from '@item/base';
import {
    ConditionData,
    isPhysicalItem,
    ItemDataPF2e,
    MagicSchoolKey,
    SpellData,
    SpellDetailsData,
} from '@item/data-definitions';
import { ConditionManager } from '@module/conditions';
import { IdentifyItemPopup } from './popups/identify-popup';
import { PhysicalItemPF2e } from '@item/physical';
import { ActorDataPF2e, SkillAbbreviation, AbilityString, SaveString } from '@actor/data-definitions';
import { ScrollWandPopup } from './popups/scroll-wand-popup';
import { createConsumableFromSpell, SpellConsumableTypes } from '@item/spell-consumables';
import { SpellPF2e } from '@item/spell';
import { SpellFacade } from '@item/spell-facade';
import { SpellcastingEntryPF2e } from '@item/spellcasting-entry';
import { ConditionPF2e } from '@item/others';
import { LocalizePF2e } from '@system/localize';
import {
    SelectableTagField,
    SELECTABLE_TAG_FIELDS,
    TagSelectorType,
    TAG_SELECTOR_TYPES,
    BasicSelectorOptions,
} from '@system/trait-selector';
import { ErrorPF2e, objectHasKey, tupleHasValue } from '@module/utils';
import {
    TraitSelectorBasic,
    TraitSelectorResistances,
    TraitSelectorSenses,
    TraitSelectorSpeeds,
    TraitSelectorWeaknesses,
} from '@module/system/trait-selector';
import { ActorSheetDataPF2e, InventoryItem } from './data-types';

interface SpellSheetData extends SpellData {
    spellInfo?: unknown;
    data: SpellDetailsData & {
        school: {
            value: MagicSchoolKey;
            str?: string;
        };
    };
}

/**
 * Extend the basic ActorSheet class to do all the PF2e things!
 * This sheet is an Abstract layer which is not used.
 * @category Actor
 */
export abstract class ActorSheetPF2e<ActorType extends ActorPF2e> extends ActorSheet<ActorType, ItemDataPF2e> {
    /** @override */
    static get defaultOptions() {
        const options = super.defaultOptions;
        return mergeObject(options, {
            classes: options.classes.concat(['pf2e', 'actor']),
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
            ],
        });
    }

    /**
     * Return the type of the current Actor
     */
    get type(): string {
        return this.actor.data.type;
    }

    /** @override */
    get isEditable(): boolean {
        return this.actor.can(game.user, 'update');
    }

    /** Can non-owning users loot items from this sheet? */
    get isLootSheet(): boolean {
        return false;
    }

    /** @override */
    getData(): any {
        // The Actor and its Items
        const actorData = duplicate(this.actor.data);
        const items = duplicate(
            this.actor.items.map((item) => item.data).sort((a, b) => (a.sort || 0) - (b.sort || 0)),
        );
        actorData.items = items;

        const inventoryItems = items.filter((itemData): itemData is InventoryItem => isPhysicalItem(itemData));
        for (const itemData of inventoryItems) {
            itemData.isEquipped = itemData.data.equipped.value;
            itemData.isIdentified = itemData.data.identification.status === 'identified';
            itemData.isContainer = itemData.type === 'backpack';

            // Reveal the unidentified item's real name to the GM
            const realName = itemData.data.identification?.identified?.name ?? '';
            if (!itemData.isIdentified && realName && game.user.isGM) {
                itemData.name = `${itemData.name} (${realName})`;
            }
        }

        const sheetData: ActorSheetDataPF2e<this['actor']['data']> = {
            cssClass: this.actor.owner ? 'editable' : 'locked',
            editable: this.isEditable,
            entity: actorData,
            limited: this.actor.limited,
            options: this.options,
            owner: this.actor.owner,
            title: this.title,
            actor: actorData,
            data: actorData.data,
            items: items,
            user: { isGM: game.user.isGM },
            isTargetFlatFooted: this.actor.getFlag(game.system.id, 'rollOptions.all.target:flatFooted'),
            isProficiencyLocked: this.actor.getFlag(game.system.id, 'proficiencyLock'),
        };

        this.prepareTraits(sheetData.data.traits);
        this.prepareItems(sheetData);

        return sheetData;
    }

    protected abstract prepareItems(sheetData: { actor: ActorDataPF2e }): void;

    protected findActiveList() {
        return (this.element as JQuery).find('.tab.active .directory-list');
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

    /**
     * Insert a spell into the spellbook object when rendering the character sheet
     * @param actorData    The Actor data being prepared
     * @param spellbook    The spellbook data being prepared
     * @param spell        The spell data being prepared
     */
    protected prepareSpell(actorData: ActorDataPF2e, spellbook: any, spell: SpellSheetData) {
        const heightenedLevel = spell.data.heightenedLevel?.value;
        const spellLvl = heightenedLevel ?? (Number(spell.data.level.value) < 11 ? Number(spell.data.level.value) : 10);
        const spellcastingEntry = this.actor.getOwnedItem(spell.data.location.value)?.data ?? null;

        // if the spellcaster entry cannot be found (maybe it was deleted?)
        if (spellcastingEntry?.type !== 'spellcastingEntry') {
            console.debug(`PF2e System | Prepare Spell | Spellcasting entry not found for spell ${spell.name}`);
            return;
        }

        // This is needed only if we want to prepare the data model only for the levels that a spell is already prepared in setup spellbook levels for all of those to catch case where sheet only has spells of lower level prepared in higher level slot
        const tradition = spellcastingEntry.data.tradition?.value;
        const isNotLevelBasedSpellcasting = tradition === 'ritual' || tradition === 'focus';

        const slots = spellcastingEntry.data.slots;
        const spellsSlotsWhereThisIsPrepared = Object.entries((slots ?? {}) as Record<any, any>)?.filter(
            (slotArr) => !!Object.values(slotArr[1].prepared as any[]).find((slotSpell) => slotSpell?.id === spell._id),
        );
        const highestSlotPrepared =
            spellsSlotsWhereThisIsPrepared
                ?.map((slot) => parseInt(slot[0].match(/slot(\d+)/)[1], 10))
                .reduce((acc, cur) => (cur > acc ? cur : acc), 0) ?? spellLvl;
        const normalHighestSpellLevel = Math.ceil(actorData.data.details.level.value / 2);
        const maxSpellLevelToShow = Math.min(10, Math.max(spellLvl, highestSlotPrepared, normalHighestSpellLevel));
        // Extend the Spellbook level
        for (let i = maxSpellLevelToShow; i >= 0; i--) {
            if (!isNotLevelBasedSpellcasting || i === spellLvl) {
                const slotKey = `slot${i}` as keyof typeof slots;
                spellbook[i] = spellbook[i] || {
                    isCantrip: i === 0,
                    isFocus: i === 11,
                    label: CONFIG.PF2E.spellLevels[i],
                    spells: [],
                    prepared: [],
                    uses: spellcastingEntry ? Number(slots[slotKey].value) || 0 : 0,
                    slots: spellcastingEntry ? Number(slots[slotKey].max) || 0 : 0,
                    displayPrepared:
                        spellcastingEntry &&
                        spellcastingEntry.data.displayLevels &&
                        spellcastingEntry.data.displayLevels[i] !== undefined
                            ? spellcastingEntry.data.displayLevels[i]
                            : true,
                    unpreparedSpellsLabel:
                        spellcastingEntry &&
                        spellcastingEntry.data.tradition.value === 'arcane' &&
                        spellcastingEntry.data.prepared.value === 'prepared'
                            ? game.i18n.localize('PF2E.UnpreparedSpellsLabelArcanePrepared')
                            : game.i18n.localize('PF2E.UnpreparedSpellsLabel'),
                };
            }
        }

        // Add the spell to the spellbook at the appropriate level
        spell.data.school.str = CONFIG.PF2E.magicSchools[spell.data.school.value];
        // Add chat data
        try {
            const item = this.actor.getOwnedItem(spell._id);
            if (item instanceof SpellPF2e) {
                spell.spellInfo = item.getChatData();
            }
        } catch (err) {
            console.debug(`PF2e System | Character Sheet | Could not load chat data for spell ${spell._id}`, spell);
        }

        const isSpontaneous = spellcastingEntry.data.prepared.value === 'spontaneous';
        const signatureSpells = spellcastingEntry.data.signatureSpells?.value ?? [];
        const isCantrip = spell.data.level.value === 0;
        const isFocusSpell = spell.data.category.value === 'focus';
        const isRitual = spell.data.category.value === 'ritual';

        if (isSpontaneous && signatureSpells.includes(spell._id) && !isCantrip && !isFocusSpell && !isRitual) {
            spell.data.isSignatureSpell = true;

            for (let i = spell.data.level.value; i <= maxSpellLevelToShow; i++) {
                spellbook[i].spells.push(spell);
            }
        } else {
            spellbook[spellLvl].spells.push(spell);
        }
    }

    /**
     * Insert prepared spells into the spellbook object when rendering the character sheet
     * @param spellcastingEntry    The spellcasting entry data being prepared
     * @param spellbook            The spellbook data being prepared
     */
    protected preparedSpellSlots(spellcastingEntry: any, spellbook: any) {
        for (const [key, spl] of Object.entries(spellbook as Record<any, any>)) {
            if (spl.slots > 0) {
                for (let i = 0; i < spl.slots; i++) {
                    const entrySlot = ((spellcastingEntry.data.slots[`slot${key}`] || {}).prepared || {})[i] || null;

                    if (entrySlot && entrySlot.id) {
                        const item: any = this.actor.getOwnedItem(entrySlot.id);
                        if (item) {
                            const itemCopy: any = duplicate(item);
                            if (entrySlot.expended) {
                                itemCopy.expended = true;
                            } else {
                                itemCopy.expended = false;
                            }

                            spl.prepared[i] = itemCopy;
                            if (spl.prepared[i]) {
                                const school = spl.prepared[i].data.school.value;
                                // enrich data with spell school formatted string
                                if (
                                    spl.prepared[i].data &&
                                    spl.prepared[i].data.school &&
                                    spl.prepared[i].data.school.str &&
                                    objectHasKey(CONFIG.PF2E.magicSchools, school)
                                ) {
                                    spl.prepared[i].data.school.str = CONFIG.PF2E.magicSchools[school];
                                }

                                // Add chat data
                                try {
                                    spl.prepared[i].spellInfo = item.getChatData();
                                } catch (err) {
                                    console.debug(
                                        `PF2e System | Character Sheet | Could not load prepared spell ${entrySlot.id}`,
                                        item,
                                    );
                                }

                                spl.prepared[i].prepared = true;
                            }
                            // prepared spell not found
                            else {
                                spl.prepared[i] = {
                                    name: LocalizePF2e.translations.PF2E.SpellSlotEmpty,
                                    id: null,
                                    prepared: false,
                                };
                            }
                        } else {
                            // Could not find an item for ID: ${entrySlot.id}. Marking the slot as empty so it can be overwritten.
                            spl.prepared[i] = {
                                name: LocalizePF2e.translations.PF2E.SpellSlotEmpty,
                                id: null,
                                prepared: false,
                            };
                        }
                    } else {
                        // if there is no prepared spell for this slot then make it empty.
                        spl.prepared[i] = {
                            name: LocalizePF2e.translations.PF2E.SpellSlotEmpty,
                            id: null,
                            prepared: false,
                        };
                    }
                }
            }
        }
    }

    /**
     * Prepare Spell SLot
     * Saves the prepared spell slot data to the actor
     * @param spellLevel The level of the spell slot
     * @param spellSlot The number of the spell slot
     * @param spell The item details for the spell
     */
    private async allocatePreparedSpellSlot(spellLevel: number, spellSlot: number, spell: SpellData, entryId: string) {
        if (spell.data.level.value > spellLevel) {
            console.warn(`Attempted to add level ${spell.data.level.value} spell to level ${spellLevel} spell slot.`);
            return;
        }
        if (CONFIG.debug.hooks === true)
            console.debug(
                `PF2e System | Updating location for spell ${spell.name} to match spellcasting entry ${entryId}`,
            );
        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}`;
        const entry = this.actor.getOwnedItem(entryId);
        if (entry) {
            const updates: any = {
                _id: entryId,
                [key]: {
                    id: spell._id,
                },
            };
            const slot = getProperty(entry, `data.data.slots.slot${spellLevel}.prepared`);
            if (slot[spellSlot] !== undefined) {
                if (slot[spellSlot].prepared !== undefined) {
                    updates[key]['-=prepared'] = null;
                }
                if (slot[spellSlot].name !== undefined) {
                    updates[key]['-=name'] = null;
                }
                if (slot[spellSlot].expended !== undefined) {
                    updates[key]['-=expended'] = null;
                }
            }
            this.actor.updateEmbeddedEntity('OwnedItem', updates);
        }
    }

    /**
     * Remove Spell Slot
     * Removes the spell from the saved spell slot data for the actor
     * @param spellLevel The level of the spell slot
     * @param spellSlot The number of the spell slot
     */
    private async removePreparedSpellSlot(spellLevel: number, spellSlot: number, entryId: string) {
        if (CONFIG.debug.hooks === true)
            console.debug(
                `PF2e System | Updating spellcasting entry ${entryId} to remove spellslot ${spellSlot} for spell level ${spellLevel}`,
            );
        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}`;
        const updates = {
            _id: entryId,
            [key]: {
                name: 'Empty Slot (drag spell here)',
                id: null,
                prepared: false,
            },
        };
        this.actor.updateEmbeddedEntity('OwnedItem', updates);
    }

    /**
     * Sets the expended state of a  Spell Slot
     * Marks the slot as expended which is reflected in the UI
     * @param spellLevel The level of the spell slot
     * @param spellSlot The number of the spell slot
     */
    private async setExpendedPreparedSpellSlot(
        spellLevel: number,
        spellSlot: number,
        entryId: string,
        isExpended: boolean,
    ) {
        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}.expended`;
        const updates = {
            _id: entryId,
            [key]: isExpended,
        };
        this.actor.updateEmbeddedEntity('OwnedItem', updates);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers
    /* -------------------------------------------- */

    /** @override */
    activateListeners(html: JQuery): void {
        super.activateListeners(html);

        // Pad field width
        html.find('[data-wpad]').each((_i, e) => {
            const text = e.tagName === 'INPUT' ? (e as HTMLInputElement).value : e.innerText;
            const w = (text.length * parseInt(e.getAttribute('data-wpad'), 10)) / 2;
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
            const save = $(event.currentTarget).parents('[data-save]')[0].getAttribute('data-save') as SaveString;
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
            const checkType = this.actor.data.data.attributes.initiative.ability as SkillAbbreviation;
            const options = this.actor.getRollOptions(
                ['all', 'initiative'].concat(SKILL_DICTIONARY[checkType] ?? checkType),
            );
            this.actor.data.data.attributes.initiative.roll({ event, options });
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

        // Toggle Levels of stats (like proficiencies conditions or hero points)
        html.find('.click-stat-level').on('click contextmenu', this.onClickStatLevel.bind(this));

        // Remove Spell Slot
        html.find('.item-unprepare').on('click', (event) => {
            const spellLvl = Number($(event.currentTarget).parents('.item').attr('data-spell-lvl') ?? 0);
            const slotId = Number($(event.currentTarget).parents('.item').attr('data-slot-id') ?? 0);
            const entryId = $(event.currentTarget).parents('.item').attr('data-entry-id') ?? '';
            this.removePreparedSpellSlot(spellLvl, slotId, entryId);
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
            this.setExpendedPreparedSpellSlot(spellLvl, slotId, entryId, expendedState);
        });

        // Toggle equip
        html.find('.item-toggle-equip').on('click', (event) => {
            const f = $(event.currentTarget);
            const itemId = f.parents('.item').attr('data-item-id') ?? '';
            const active = f.hasClass('active');
            this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.equipped.value': !active });
        });

        // Toggle invest
        html.find('.item-toggle-invest').on('click', (event) => {
            const f = $(event.currentTarget);
            const itemId = f.parents('.item').attr('data-item-id') ?? '';
            const active = f.hasClass('active');
            this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.invested.value': !active });
        });

        // Trait Selector
        html.find('.trait-selector').on('click', (event) => this.onTraitSelector(event));

        html.find('.add-coins-popup button').on('click', (event) => this.onAddCoinsPopup(event));

        html.find('.remove-coins-popup button').on('click', (event) => this.onRemoveCoinsPopup(event));

        html.find('.sell-all-treasure button').on('click', (event) => this.onSellAllTreasure(event));

        // Feat Browser
        html.find('.feat-browse').on('click', () => compendiumBrowser.openTab('feat'));

        // Action Browser
        html.find('.action-browse').on('click', () => compendiumBrowser.openTab('action'));

        // Spell Browser
        html.find('.spell-browse').on('click', () => compendiumBrowser.openTab('spell'));

        // Inventory Browser
        html.find('.inventory-browse').on('click', () => compendiumBrowser.openTab('equipment'));

        // Spell Create
        html.find('.spell-create').on('click', (event) => this.onItemCreate(event));

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
        /*  Inventory
        /* -------------------------------------------- */

        // Create New Item
        html.find('.item-create').on('click', (event) => this.onItemCreate(event));

        html.find('.item-toggle-container').on('click', (event) => this.toggleContainer(event));

        // Sell treasure item
        html.find('.item-sell-treasure').on('click', (event) => {
            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
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
                const item = this.actor.getOwnedItem(itemId);
                if (!(item instanceof PhysicalItemPF2e)) {
                    throw Error(`PF2e | ${item.name} is not a physical item.`);
                }
                item.setIdentifiedState('unidentified');
            } else {
                new IdentifyItemPopup(this.actor, { itemId }).render(true);
            }
        });

        // Delete Inventory Item
        html.find('.item-delete').on('click', (event) => this.onClickDeleteItem(event));

        // Increase Item Quantity
        html.find('.item-increase-quantity').on('click', (event) => {
            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id') ?? '';
            const item = this.actor.getOwnedItem(itemId);
            if (!(item instanceof PhysicalItemPF2e)) {
                throw new Error('PF2e System | Tried to update quantity on item that does not have quantity');
            }
            this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId,
                'data.quantity.value': Number(item.data.data.quantity.value) + 1,
            });
        });

        // Decrease Item Quantity
        html.find('.item-decrease-quantity').on('click', (event) => {
            const li = $(event.currentTarget).parents('.item');
            const itemId = li.attr('data-item-id') ?? '';
            const item = this.actor.getOwnedItem(itemId);
            if (!(item instanceof PhysicalItemPF2e)) {
                throw new Error('Tried to update quantity on item that does not have quantity');
            }
            if (Number(item.data.data.quantity.value) > 0) {
                this.actor.updateEmbeddedEntity('OwnedItem', {
                    _id: itemId,
                    'data.quantity.value': Number(item.data.data.quantity.value) - 1,
                });
            }
        });

        // Toggle Spell prepared value
        html.find('.item-prepare').on('click', (event) => {
            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            const item = this.actor.getOwnedItem(itemId ?? '');
            if (!(item instanceof SpellPF2e)) {
                throw new Error('Tried to update prepared on item that does not have prepared');
            }
            this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: item.id,
                'data.prepared.value': !item.data.data.prepared.value,
            });
        });

        // Item Dragging
        const handler = (event: DragEvent) => this.onDragItemStart(event as ElementDragEvent);
        html.find('.item').each((_i, li) => {
            li.setAttribute('draggable', 'true');
            li.addEventListener('dragstart', handler, false);
        });

        // Skill Dragging
        const skillHandler = (event: DragEvent) => this.onDragSkillStart(event as ElementDragEvent);
        html.find('.skill').each((_i, li) => {
            li.setAttribute('draggable', 'true');
            li.addEventListener('dragstart', skillHandler, false);
        });

        // Toggle Dragging
        html.find('[data-toggle-property][data-toggle-label]').each((_i, li) => {
            li.setAttribute('draggable', 'true');
            li.addEventListener('dragstart', (event) => this.onDragToggleStart(event as ElementDragEvent), false);
        });

        // change background for dragged over items that are containers
        const containerItems = Array.from(html[0].querySelectorAll('[data-item-is-container="true"]'));
        containerItems.forEach((elem: HTMLElement) =>
            elem.addEventListener('dragenter', () => elem.classList.add('hover-container'), false),
        );
        containerItems.forEach((elem: HTMLElement) =>
            elem.addEventListener('dragleave', () => elem.classList.remove('hover-container'), false),
        );

        // Item Rolling
        html.find('[data-item-id].item .item-image').on('click', (event) => this.onItemRoll(event));

        // Update Item Bonus on an actor.item input
        html.find<HTMLInputElement>('.focus-pool-input').on('change', async (event) => {
            event.preventDefault();
            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id') ?? '';
            const focusPool = Math.clamped(Number(event.target.value), 0, 3);
            const item = this.actor.getOwnedItem(itemId);
            let focusPoints = getProperty(item.data, 'data.focus.points') || 0;
            focusPoints = Math.clamped(focusPoints, 0, focusPool);
            await this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId,
                'data.focus.points': focusPoints,
                'data.focus.pool': focusPool,
            });
        });

        // Update Item Bonus on an actor.item input
        html.find<HTMLInputElement>('.item-value-input').on('change', async (event) => {
            event.preventDefault();

            let itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            if (!itemId) {
                itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
            }

            await this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId ?? '',
                'data.item.value': Number(event.target.value),
            });
        });

        // Update Item Name
        html.find<HTMLInputElement>('.item-name-input').on('change', async (event) => {
            const itemId = event.target.attributes['data-item-id']?.value;
            await this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId ?? '', name: event.target.value });
        });

        // Update used slots for Spell Items
        html.find<HTMLInputElement>('.spell-slots-input').on('change', async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item, .section').attr('data-item-id') ?? '';
            const slotLvl = Number($(event.currentTarget).parents('.item, .section').attr('data-level') ?? 0);

            const key = `data.slots.slot${slotLvl}.value`;
            const options = { _id: itemId };
            options[key] = Number(event.target.value);

            await this.actor.updateEmbeddedEntity('OwnedItem', options);
        });

        // Update max slots for Spell Items
        html.find<HTMLInputElement>('.spell-max-input').on('change', async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item, .section').attr('data-item-id') ?? '';
            const slotLvl = Number($(event.currentTarget).parents('.item, .section').attr('data-level')) || 0;
            const key = `data.slots.slot${slotLvl}.max`;
            await this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId,
                [key]: Number(event.target.value),
            });
        });

        // Modify select element
        html.find<HTMLSelectElement>('.ability-select').on('change', async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id') ?? '';
            await this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId,
                'data.ability.value': event.target.value,
            });
        });

        // Update max slots for Spell Items
        html.find('.prepared-toggle').on('click', async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id') ?? '';
            const itemToEdit = this.actor.getOwnedItem(itemId)?.data;
            if (itemToEdit?.type !== 'spellcastingEntry')
                throw new Error('Tried to toggle prepared spells on a non-spellcasting entry');
            const bool = !(itemToEdit.data.showUnpreparedSpells || {}).value;

            await this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId ?? '',
                'data.showUnpreparedSpells.value': bool,
            });
        });

        html.find('.level-prepared-toggle').on('click', async (event) => {
            event.preventDefault();

            const parentNode = $(event.currentTarget).parents('.spellbook-header');
            const itemId = parentNode.attr('data-item-id') ?? '';
            const lvl = Number(parentNode.attr('data-level') ?? '');
            if (!Number.isInteger(lvl)) {
                return;
            }

            const itemToEdit = this.actor.getOwnedItem(itemId)?.data;
            if (itemToEdit?.type !== 'spellcastingEntry')
                throw new Error('Tried to toggle prepared spells on a non-spellcasting entry');
            const currentDisplayLevels = itemToEdit.data.displayLevels || {};
            currentDisplayLevels[lvl] = currentDisplayLevels[lvl] === undefined ? false : !currentDisplayLevels[lvl];
            await this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: itemId,
                'data.displayLevels': currentDisplayLevels,
            });
            this.render();
        });

        // Select all text in an input field on focus
        html.find<HTMLInputElement>('input[type=text], input[type=number]').on('focus', (event) => {
            event.currentTarget.select();
        });
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Handle clicking of stat levels. The max level is by default 4.
     * The max level can be set in the hidden input field with a data-max attribute. Eg: data-max="3"
     */
    private onClickStatLevel(event: JQuery.TriggeredEvent) {
        event.preventDefault();
        const field = $(event.currentTarget).siblings('input[type="hidden"]');
        const max = field.data('max') ?? 4;
        const { statType, category } = field.data();
        if (this.actor.getFlag('pf2e', 'proficiencyLock') && category === 'proficiency') return;

        // Get the current level and the array of levels
        const level = parseFloat(`${field.val()}`);
        // Toggle next level - forward on click, backwards on right
        let newLevel = event.type === 'click' ? Math.clamped(level + 1, 0, max) : Math.clamped(level - 1, 0, max);

        // Update the field value and save the form
        if (statType === 'item') {
            let itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            if (itemId === undefined) {
                // Then item is spellcastingEntry, this could be refactored
                // but data-contained-id and proviciency/proficient need to be refactored everywhere to give
                // Lore Skills, Martial Skills and Spellcasting Entries the same structure.

                itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id') ?? '';
                if (category === 'focus') {
                    const item = this.actor.getOwnedItem(itemId);
                    const focusPoolSize = getProperty(item?.data ?? {}, 'data.focus.pool') || 1;
                    newLevel = Math.clamped(newLevel, 0, focusPoolSize);
                    this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.focus.points': newLevel });
                } else {
                    this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.proficiency.value': newLevel });
                }
            } else {
                this.actor.updateEmbeddedEntity('OwnedItem', { _id: itemId, 'data.proficient.value': newLevel });
            }
            return;
        }
        field.val(newLevel);
        this._onSubmit(event.originalEvent!);
    }

    async onClickDeleteItem(event: JQuery.ClickEvent | JQuery.ContextMenuEvent): Promise<void> {
        const li = $(event.currentTarget).closest('.item');
        const itemId = li.attr('data-item-id') ?? '';
        const item = this.actor.getOwnedItem(itemId);

        if (item instanceof ConditionPF2e && item.fromSystem) {
            const references = li.find('.condition-references');

            const deleteCondition = async (): Promise<void> => {
                this.actor.removeOrReduceCondition(item, { forceRemove: true });
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
                await this.actor.deleteOwnedItem(itemId);
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

    /** @override */
    protected _canDragStart(selector: string): boolean {
        if (this.isLootSheet) return true;
        return super._canDragStart(selector);
    }

    /** @override */
    protected _canDragDrop(selector: string): boolean {
        if (this.isLootSheet) return true;
        return super._canDragDrop(selector);
    }

    protected onDragItemStart(event: ElementDragEvent): boolean {
        event.stopImmediatePropagation();

        const itemId = event.currentTarget.getAttribute('data-item-id');
        const containerId = event.currentTarget.getAttribute('data-container-id');
        const actionIndex = event.currentTarget.getAttribute('data-action-index');

        const id = itemId ?? containerId ?? '';
        const item = this.actor.getOwnedItem(id);
        if (item) {
            event.dataTransfer!.setData(
                'text/plain',
                JSON.stringify({
                    type: 'Item',
                    data: item.data,
                    actorId: this.actor._id,
                    tokenId: this.actor.token?.id,
                    id: itemId,
                }),
            );

            return true;
        } else if (actionIndex && event) {
            event.dataTransfer!.setData(
                'text/plain',
                JSON.stringify({
                    type: 'Action',
                    index: actionIndex,
                    actorId: this.actor._id,
                }),
            );

            return true;
        }
        return false;
    }

    private onDragSkillStart(event: ElementDragEvent): boolean {
        const skill = event.currentTarget.getAttribute('data-skill');

        if (skill) {
            const skillName = $(event.currentTarget).find('.skill-name').text();
            event.dataTransfer!.setData(
                'text/plain',
                JSON.stringify({
                    type: 'Skill',
                    skill,
                    skillName,
                    actorId: this.actor._id,
                }),
            );

            return true;
        }
        return false;
    }

    private onDragToggleStart(event: ElementDragEvent): boolean {
        const property = event.currentTarget.getAttribute('data-toggle-property');
        const label = event.currentTarget.getAttribute('data-toggle-label');
        if (property) {
            event.dataTransfer!.setData(
                'text/plain',
                JSON.stringify({
                    type: 'Toggle',
                    property,
                    label,
                    actorId: this.actor._id,
                }),
            );
            return true;
        }
        return false;
    }

    /**
     * Handle a drop event for an existing Owned Item to sort that item
     * @param event
     * @param itemData
     */
    protected async _onSortItem(
        event: ElementDragEvent,
        itemData: ItemDataPF2e,
    ): Promise<(ItemDataPF2e | null)[] | ItemDataPF2e | null> {
        const dropSlotType = $(event.target).parents('.item').attr('data-item-type');
        const dropContainerType = $(event.target).parents('.item-container').attr('data-container-type');

        // if they are dragging onto another spell, it's just sorting the spells
        // or moving it from one spellcastingEntry to another
        if (itemData.type === 'spell') {
            if (dropSlotType === 'spellLevel') {
                const { itemId, level } = $(event.target).closest('.item').data();

                if (typeof itemId === 'string' && typeof level === 'number') {
                    if (this._moveSpell(itemData as SpellData, itemId, level)) {
                        return this.actor.updateOwnedItem(itemData);
                    }
                }
            } else if (dropSlotType === 'spell') {
                const sourceId = itemData._id;
                const dropId = $(event.target).parents('.item').attr('data-item-id') ?? '';
                const target = this.actor.getOwnedItem(dropId);
                if (target instanceof SpellPF2e && sourceId !== dropId) {
                    const source: any = this.actor.getOwnedItem(sourceId);
                    const sourceLevel = source.data.data.heightenedLevel?.value ?? source.data.data.level.value;
                    const sourceLocation = source.data.data.location.value;
                    const targetLevel = target.data.data.heightenedLevel?.value ?? target.data.data.level.value;
                    const targetLocation = target.data.data.location.value;

                    if (sourceLevel === targetLevel && sourceLocation === targetLocation) {
                        const siblings: any[] = (this.actor as any).items.entries.filter(
                            (i: ItemPF2e) =>
                                i.data.type === 'spell' &&
                                i.data.data.level.value === sourceLevel &&
                                i.data.data.location.value === sourceLocation,
                        );
                        const sortBefore = source.data.sort >= target.data.sort;
                        source.sortRelative({ target, siblings, sortBefore });
                    } else {
                        if (this._moveSpell(itemData, targetLocation, targetLevel)) {
                            return this.actor.updateOwnedItem(itemData);
                        }
                    }
                }
            } else if (dropSlotType === 'spellSlot') {
                if (CONFIG.debug.hooks === true)
                    console.debug('PF2e System | ***** spell dropped on a spellSlot *****');
                const dropID = Number($(event.target).parents('.item').attr('data-item-id'));
                const spellLvl = Number($(event.target).parents('.item').attr('data-spell-lvl'));
                const entryId = $(event.target).parents('.item').attr('data-entry-id') ?? '';

                if (Number.isInteger(dropID) && Number.isInteger(spellLvl) && entryId) {
                    this.allocatePreparedSpellSlot(spellLvl, dropID, itemData, entryId);
                }
                return itemData;
            } else if (dropContainerType === 'spellcastingEntry') {
                // if the drop container target is a spellcastingEntry then check if the item is a spell and if so update its location.
                // if the dragged item is a spell and is from the same actor
                if (CONFIG.debug.hooks === true)
                    console.debug('PF2e System | ***** spell from same actor dropped on a spellcasting entry *****');

                const dropID = $(event.target).parents('.item-container').attr('data-container-id');

                if (dropID) {
                    itemData.data.location = { value: dropID };
                    return this.actor.updateEmbeddedEntity('OwnedItem', itemData);
                }
            }
        } else if (itemData.type === 'spellcastingEntry') {
            // target and source are spellcastingEntries and need to be sorted
            if (dropContainerType === 'spellcastingEntry') {
                const sourceId = itemData._id;
                const dropId = $(event.target).parents('.item-container').attr('data-container-id') ?? '';
                const source = this.actor.getOwnedItem(sourceId);
                const target = this.actor.getOwnedItem(dropId);

                if (source && target && source.id !== target.id) {
                    const siblings = this.actor.itemTypes.spellcastingEntry;
                    const sortBefore = source.data.sort >= target.data.sort;
                    source.sortRelative({ target, siblings, sortBefore });
                    return target.data;
                }
            }
        }

        const container = $(event.target).closest('[data-item-is-container="true"]');
        const containerId = container[0]?.dataset?.itemId?.trim();
        const item = this.actor.items.get(itemData._id);
        if (item instanceof PhysicalItemPF2e && (containerId || (item.isInContainer && !containerId))) {
            await this.actor.stashOrUnstash(item, containerId);
            return item.data;
        }
        return super._onSortItem(event, itemData);
    }

    protected async _onDropItemCreate(itemData: ItemDataPF2e): Promise<ItemDataPF2e | null> {
        if (itemData.type === 'ancestry' || itemData.type === 'background' || itemData.type === 'class') {
            // ignore these. they should get handled in the derived class
            ui.notifications.error(game.i18n.localize('PF2E.ItemNotSupportedOnActor'));
            return null;
        }
        return super._onDropItemCreate(itemData);
    }

    async onDropItem(data: DropCanvasData) {
        return await this._onDropItem({ preventDefault(): void {} } as ElementDragEvent, data);
    }

    /**
     * Extend the base _onDrop method to handle dragging spells onto spell slots.
     */
    protected async _onDropItem(
        event: ElementDragEvent,
        data: DropCanvasData,
    ): Promise<(ItemDataPF2e | null)[] | ItemDataPF2e | null> {
        event.preventDefault();

        const item = await ItemPF2e.fromDropData(data);
        const itemData = duplicate(item._data);

        const actor = this.actor;
        const isSameActor = data.actorId === actor.id || (actor.isToken && data.tokenId === actor.token?.id);
        if (isSameActor) return this._onSortItem(event, itemData);

        if (data.actorId && isPhysicalItem(itemData)) {
            this.moveItemBetweenActors(
                event,
                data.actorId,
                data.tokenId ?? '',
                actor.id,
                actor.token?.id ?? '',
                data.id,
            );
            return itemData;
        }

        // get the item type of the drop target
        const dropSlotType = $(event.target).closest('.item').attr('data-item-type');
        const dropContainerType = $(event.target).parents('.item-container').attr('data-container-type');

        // otherwise they are dragging a new spell onto their sheet.
        // we still need to put it in the correct spellcastingEntry
        if (itemData.type === 'spell') {
            if (dropSlotType === 'spellSlot' || dropContainerType === 'spellcastingEntry') {
                const dropID = $(event.target).parents('.item-container').attr('data-container-id');
                if (typeof dropID !== 'string') {
                    throw Error('PF2e System | Unexpected error while adding spell to spellcastingEntry');
                }
                itemData.data.location = { value: dropID };
                this.actor._setShowUnpreparedSpells(dropID, itemData.data.level?.value);
                return this.actor.createEmbeddedEntity('OwnedItem', itemData);
            } else if (dropSlotType === 'spellLevel') {
                const { itemId, level } = $(event.target).closest('.item').data();

                if (typeof itemId === 'string' && typeof level === 'number') {
                    this._moveSpell(itemData, itemId, level);
                    return this.actor.createEmbeddedEntity('OwnedItem', itemData);
                }
            } else if (dropSlotType === 'spell') {
                const { containerId } = $(event.target).closest('.item-container').data();
                const { spellLvl } = $(event.target).closest('.item').data();

                if (typeof containerId === 'string' && typeof spellLvl === 'number') {
                    this._moveSpell(itemData, containerId, spellLvl);
                    return this.actor.createEmbeddedEntity('OwnedItem', itemData);
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
                return itemData;
            } else {
                return null;
            }
        } else if (itemData.type === 'spellcastingEntry') {
            // spellcastingEntry can only be created. drag & drop between actors not allowed
            return null;
        } else if (itemData.type === 'kit') {
            await addKit(itemData, async (newItems) => {
                const items = await actor.createEmbeddedEntity('OwnedItem', newItems);
                if (Array.isArray(items)) {
                    return items.flatMap((i) => (i === null ? [] : i._id));
                }
                return items === null ? [] : [items._id];
            });
            return itemData;
        } else if (itemData.type === 'condition' && itemData.flags.pf2e?.condition) {
            const condition = itemData as ConditionData;
            const value: number = (data as any).value;
            if (value && condition.data.value.isValued) {
                condition.data.value.value = value;
            }
            const token = actor.token
                ? actor.token
                : canvas.tokens.controlled.find((canvasToken) => canvasToken.actor.id === actor.id);

            if (token) {
                await ConditionManager.addConditionToToken(condition, token);
                return itemData;
            } else {
                const translations = LocalizePF2e.translations.PF2E;
                const message = actor.can(game.user, 'update')
                    ? translations.ErrorMessage.ActorMustHaveToken
                    : translations.ErrorMessage.NoUpdatePermission;
                ui.notifications.error(message);
                return null;
            }
        }

        if (isPhysicalItem(itemData)) {
            const container = $(event.target).parents('[data-item-is-container="true"]');
            let containerId = null;
            if (container[0] !== undefined) {
                containerId = container[0].dataset.itemId?.trim();
            }
            itemData.data.containerId.value = containerId || '';
        }
        return this._onDropItemCreate(itemData);
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
        const item = sourceActor?.getOwnedItem(itemId);

        if (sourceActor === null || targetActor === null) {
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

    async _moveSpell(spellData: SpellData, targetLocation: string, targetLevel: number) {
        const spell = new SpellFacade(spellData);

        if (spell.spellcastingEntryId === targetLocation && spell.heightenedLevel === targetLevel) {
            return false;
        }

        const spellcastingEntry = this.actor.getOwnedItem(targetLocation);
        if (!(spellcastingEntry instanceof SpellcastingEntryPF2e)) {
            throw new Error(`PF2e System | SpellcastingEntry ${targetLocation} not found in actor ${this.actor._id}`);
        }

        spellData.data.location = { value: targetLocation };

        if (!spell.isCantrip && !spell.isFocusSpell && !spell.isRitual) {
            if (spellcastingEntry.isSpontaneous || spellcastingEntry.isInnate) {
                spellData.data.heightenedLevel = {
                    value: Math.max(spell.spellLevel, targetLevel),
                };
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
        const item = this.actor.getOwnedItem(itemId ?? '');
        if (item instanceof PhysicalItemPF2e && !item.isIdentified) {
            // we don't want to show the item card for items that aren't identified
            return;
        }

        item?.roll(event);
    }

    /**
     * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
     */
    protected onItemSummary(event: JQuery.ClickEvent) {
        event.preventDefault();

        const li = $(event.currentTarget).parent().parent();
        const itemId = li.attr('data-item-id');
        const itemType = li.attr('data-item-type');

        if (itemType === 'spellSlot') return;

        const item = this.actor.getOwnedItem(itemId ?? '');
        if (!item) return;

        if (item.data.type === 'spellcastingEntry' || item.data.type === 'condition') return;

        const chatData = item.getChatData({ secrets: this.actor.owner });

        if (game.user.isGM || !(item instanceof PhysicalItemPF2e) || item.hasShowableMystifiedState) {
            this.renderItemSummary(li, item, chatData);
        }
    }

    protected renderItemSummary(li: JQuery, _item: ItemPF2e, chatData: any) {
        const localize = game.i18n.localize.bind(game.i18n);

        // Toggle summary
        if (li.hasClass('expanded')) {
            const summary = li.children('.item-summary');
            summary.slideUp(200, () => summary.remove());
        } else {
            const div = $(
                `<div class="item-summary"><div class="item-description">${chatData.description.value}</div></div>`,
            );
            const props = $('<div class="item-properties tags"></div>');
            if (chatData.properties) {
                chatData.properties
                    .filter((property: unknown) => typeof property === 'string')
                    .forEach((property: string) => {
                        props.append(`<span class="tag tag_secondary">${localize(property)}</span>`);
                    });
            }
            if (chatData.critSpecialization)
                props.append(
                    `<span class="tag" title="${localize(
                        chatData.critSpecialization.description,
                    )}" style="background: rgb(69,74,124); color: white;">${localize(
                        chatData.critSpecialization.label,
                    )}</span>`,
                );
            // append traits (only style the tags if they contain description data)
            if (chatData.traits && chatData.traits.length) {
                chatData.traits.forEach((property: any) => {
                    if (property.description)
                        props.append(
                            `<span class="tag tag_alt" title="${localize(property.description)}">${localize(
                                property.label,
                            )}</span>`,
                        );
                    else props.append(`<span class="tag">${localize(property.label)}</span>`);
                });
            }

            div.append(props);
            li.append(div.hide());
            div.slideDown(200);
        }
        li.toggleClass('expanded');
    }

    /**
     * Opens an item container
     */
    private toggleContainer(event: JQuery.ClickEvent) {
        const itemId = $(event.currentTarget).parents('.item').data('item-id');
        const item = this.actor.getOwnedItem(itemId);
        if (item === null || item.data.type !== 'backpack') {
            return;
        }

        const isCollapsed = item?.data?.data?.collapsed?.value ?? false;
        item.update({ 'data.collapsed.value': !isCollapsed });
    }

    /**
     * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
     */
    private onItemCreate(event: JQuery.ClickEvent) {
        event.preventDefault();
        const header = event.currentTarget;
        const data = duplicate(header.dataset);
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
            // for prepared spellcasting entries, set showUnpreparedSpells to true to avoid the confusion of nothing appearing to happen.
            this.actor._setShowUnpreparedSpells(data.location, data.level);

            const newLabel = game.i18n.localize('PF2E.NewLabel');
            const spellLevel = game.i18n.localize(`PF2E.SpellLevel${data.level}`);
            const spellLabel = data.level > 0 ? game.i18n.localize('PF2E.SpellLabel') : '';
            data.name = `${newLabel} ${spellLevel} ${spellLabel}`;
            mergeObject(data, {
                'data.level.value': data.level,
                'data.location.value': data.location,
            });
            // Show the spellbook pages if you're adding a new spell
            const currentLvlToDisplay: Record<number, boolean> = {};
            currentLvlToDisplay[data.level] = true;
            this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: data.location,
                'data.showUnpreparedSpells.value': true,
                'data.displayLevels': currentLvlToDisplay,
            });
        } else if (data.type === 'lore') {
            if (this.type === 'npc') {
                data.name = game.i18n.localize('PF2E.SkillLabel');
                data.img = '/icons/svg/d20-black.svg';
            } else data.name = game.i18n.localize('PF2E.NewPlaceholders.Lore');
        } else {
            data.name = game.i18n.localize(`PF2E.NewPlaceholders.${data.type.capitalize()}`);
        }

        this.actor.createEmbeddedEntity('OwnedItem', data);
    }

    /**
     * Handle creating a new spellcasting entry for the actor
     */
    private createSpellcastingEntry(event: JQuery.ClickEvent) {
        event.preventDefault();

        // let entries = this.actor.data.data.attributes.spellcasting.entry || {};

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
                    buttons: {
                        create: {
                            label: game.i18n.localize('PF2E.CreateLabelUniversal'),
                            callback: (html: JQuery) => {
                                // if ( onClose ) onClose(html, parts, data);
                                let name = '';
                                magicTradition = `${html.find('[name="magicTradition"]').val()}`;
                                if (magicTradition === 'ritual') {
                                    spellcastingType = '';
                                    name = game.i18n.localize(CONFIG.PF2E.magicTraditions[magicTradition]);
                                } else if (magicTradition === 'focus') {
                                    spellcastingType = '';
                                    name = [
                                        game.i18n.localize(CONFIG.PF2E.magicTraditions[magicTradition]),
                                        game.i18n.localize('PF2E.SpellLabelPlural'),
                                    ].join(' ');
                                } else {
                                    spellcastingType = `${html.find('[name="spellcastingType"]').val()}`;
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
                                const spellcastingEntity = {
                                    ability: {
                                        type: 'String',
                                        label: 'Spellcasting Ability',
                                        value: '',
                                    },
                                    spelldc: {
                                        type: 'String',
                                        label: 'Class DC',
                                        item: 0,
                                    },
                                    tradition: {
                                        type: 'String',
                                        label: 'Magic Tradition',
                                        value: magicTradition,
                                    },
                                    prepared: {
                                        type: 'String',
                                        label: 'Spellcasting Type',
                                        value: spellcastingType,
                                    },
                                    showUnpreparedSpells: { value: true },
                                };

                                const data = {
                                    name,
                                    type: 'spellcastingEntry',
                                    data: spellcastingEntity,
                                };

                                this.actor.createEmbeddedEntity('OwnedItem', (data as unknown) as ItemDataPF2e);
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

        const li = $(event.currentTarget).parents('.item');
        const itemId = li.attr('data-container-id') ?? '';
        const item = this.actor.getOwnedItem(itemId);
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
                            const itemsToDelete = [];
                            for (const item of this.actor.itemTypes.spell) {
                                if (item.data.data.location.value === itemId) {
                                    itemsToDelete.push(item.id);
                                }
                            }

                            await this.actor.deleteOwnedItem(itemsToDelete);

                            // Delete item container
                            await this.actor.deleteOwnedItem(item.id);
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
            const configTypes = ($anchor.attr('data-config-types') ?? '')
                .split(',')
                .map((type) => type.trim())
                .filter((tag): tag is SelectableTagField => tupleHasValue(SELECTABLE_TAG_FIELDS, tag));
            this.tagSelector('basic', {
                objectProperty,
                configTypes,
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
            new TraitSelectorBasic(this.object, options).render(true);
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

    /** @override */
    protected async _onSubmit(event: Event, options: OnSubmitFormOptions = {}): Promise<Record<string, unknown>> {
        // Limit HP value to data.attributes.hp.max value
        if (!(event.currentTarget instanceof HTMLInputElement)) {
            return super._onSubmit(event, options);
        }

        const $target = $(event.currentTarget ?? {});
        if ($target.attr('name') === 'data.attributes.hp.value') {
            $target.attr({
                value: Math.clamped(
                    parseInt($target.attr('value') ?? '0', 10),
                    0,
                    this.actor.data.data.attributes.hp?.max ?? 0,
                ),
            });
        }

        return super._onSubmit(event, options);
    }

    /**
     * Hide the sheet-config button unless there is more than one sheet option.
     *@override */
    protected _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();
        const sheetButton = buttons.find((button) => button.class === 'configure-sheet');
        const hasMultipleSheets = Object.keys(CONFIG.Actor.sheetClasses[this.actor.type]).length > 1;
        if (!hasMultipleSheets && sheetButton) {
            buttons.splice(buttons.indexOf(sheetButton), 1);
        }
        return buttons;
    }
}
