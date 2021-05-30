import { ActorPF2e } from '@actor/base';
import { getPropertySlots } from '../runes';
import { ItemDataPF2e } from '@item/data';
import { LocalizePF2e } from '@system/localize';
import { AESheetData, SheetOptions, SheetSelections } from './data-types';
import { ItemPF2e, LorePF2e } from '@item/index';
import { PF2RuleElementData } from '@module/rules/rules-data-definitions';
import Tagify from '@yaireo/tagify';
import {
    BasicSelectorOptions,
    SelectableTagField,
    SELECTABLE_TAG_FIELDS,
    TraitSelectorBasic,
    TAG_SELECTOR_TYPES,
} from '@module/system/trait-selector';
import { ErrorPF2e, sluggify, tupleHasValue } from '@module/utils';
import { ActiveEffectPF2e } from '@module/active-effect';
import { WeaponTrait } from '@item/weapon/data';

export interface ItemSheetDataPF2e<TItem extends ItemPF2e> extends ItemSheetData<TItem> {
    user: { isGM: boolean };
    enabledRulesUI: boolean;
    activeEffects: AESheetData;
}

/** @override */
export class ItemSheetPF2e<TItem extends ItemPF2e> extends ItemSheet<TItem> {
    /** @override */
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.width = 630;
        options.height = 460;
        options.classes = options.classes.concat(['pf2e', 'item']);
        options.template = 'systems/pf2e/templates/items/item-sheet.html';
        options.tabs = [
            {
                navSelector: '.tabs',
                contentSelector: '.sheet-body',
                initial: 'description',
            },
            {
                navSelector: '.mystify-nav',
                contentSelector: '.mystify-sheet',
                initial: 'unidentified',
            },
        ];

        return options;
    }

    /** @override */
    getData() {
        const data: any = this.getBaseData();
        data.abilities = CONFIG.PF2E.abilities;
        data.saves = CONFIG.PF2E.saves;

        const { type } = this.item;
        mergeObject(data, {
            hasSidebar: true,
            sidebarTemplate: () => `systems/pf2e/templates/items/${type}-sidebar.html`,
            hasDetails: [
                'consumable',
                'equipment',
                'feat',
                'spell',
                'weapon',
                'armor',
                'action',
                'melee',
                'backpack',
                'condition',
                'lore',
            ].includes(type),
            detailsTemplate: () => `systems/pf2e/templates/items/${type}-details.html`,
        }); // Damage types

        const itemData: ItemDataPF2e = data.item;
        // Expose the saved traits for editing purposes;
        data.data.traits.value = this.item.toObject().data.traits.value.filter((trait) => !!trait);

        const dt = duplicate(CONFIG.PF2E.damageTypes);
        if (itemData.type === 'spell') mergeObject(dt, CONFIG.PF2E.healingTypes);
        data.damageTypes = dt;

        // do not let user set bulk if in a stack group because the group determines bulk
        const stackGroup = data.data?.stackGroup?.value;
        data.bulkDisabled = stackGroup !== undefined && stackGroup !== null && stackGroup.trim() !== '';
        data.rarity = CONFIG.PF2E.rarityTraits;
        data.usage = CONFIG.PF2E.usageTraits; // usage data
        data.stackGroups = CONFIG.PF2E.stackGroups;

        if (type === 'treasure') {
            data.currencies = CONFIG.PF2E.currencies;
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.sizes = CONFIG.PF2E.actorSizes;
        } else if (type === 'consumable') {
            data.consumableTypes = CONFIG.PF2E.consumableTypes;
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.stackGroups = CONFIG.PF2E.stackGroups;
            data.consumableTraits = CONFIG.PF2E.consumableTraits;
            data.sizes = CONFIG.PF2E.actorSizes;
        } else if (type === 'weapon') {
            const materials: Partial<typeof CONFIG.PF2E.preciousMaterials> = duplicate(CONFIG.PF2E.preciousMaterials);
            delete materials.dragonhide;
            const slots = getPropertySlots(data);
            this.assignPropertySlots(data, slots);
            data.preciousMaterials = materials;
            data.weaponPotencyRunes = CONFIG.PF2E.weaponPotencyRunes;
            data.weaponStrikingRunes = CONFIG.PF2E.weaponStrikingRunes;
            data.weaponPropertyRunes = CONFIG.PF2E.weaponPropertyRunes;
            data.preciousMaterials = CONFIG.PF2E.preciousMaterials;
            data.preciousMaterialGrades = CONFIG.PF2E.preciousMaterialGrades;

            data.weaponTraits = data.data.traits.value.map(
                (trait: WeaponTrait) => CONFIG.PF2E.weaponTraits[trait] ?? trait,
            );
            data.baseWeapons = LocalizePF2e.translations.PF2E.Weapon.Base;
            data.weaponTypes = CONFIG.PF2E.weaponTypes;
            data.weaponGroups = CONFIG.PF2E.weaponGroups;
            data.itemBonuses = CONFIG.PF2E.itemBonuses;
            data.damageDie = CONFIG.PF2E.damageDie;
            data.damageDice = CONFIG.PF2E.damageDice;
            data.conditionTypes = CONFIG.PF2E.conditionTypes;
            data.weaponDamage = CONFIG.PF2E.damageTypes;
            data.weaponRange = CONFIG.PF2E.weaponRange;
            data.weaponReload = CONFIG.PF2E.weaponReload;
            data.weaponMAP = CONFIG.PF2E.weaponMAP;
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.sizes = CONFIG.PF2E.actorSizes;
            data.isBomb = type === 'weapon' && data.data?.group?.value === 'bomb';

            this.prepareTraits(data.data.traits, CONFIG.PF2E.weaponTraits);
        } else if (type === 'melee') {
            // Melee Data
            data.hasSidebar = false;
            data.detailsActive = true;
            data.damageTypes = CONFIG.PF2E.damageTypes;

            // Melee attack effects can be chosen from the NPC's actions
            const attackEffectOptions: Record<string, string> =
                this.actor?.itemTypes.action.reduce((options, action) => {
                    const key = action.slug ?? sluggify(action.name);
                    return mergeObject(options, { [key]: action.name }, { inplace: false });
                }, CONFIG.PF2E.attackEffects) ?? {};
            data.attackEffects = this.prepareOptions(attackEffectOptions, data.data.attackEffects);
            data.traits = this.prepareOptions(CONFIG.PF2E.weaponTraits, data.data.traits);
        } else if (type === 'condition') {
            // Condition types

            data.conditions = [];
        } else if (type === 'equipment') {
            // Equipment data
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.stackGroups = CONFIG.PF2E.stackGroups;
            data.equipmentTraits = CONFIG.PF2E.equipmentTraits;
            data.sizes = CONFIG.PF2E.actorSizes;
        } else if (type === 'backpack') {
            // Backpack data
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.equipmentTraits = CONFIG.PF2E.equipmentTraits;
            data.sizes = CONFIG.PF2E.actorSizes;
            // this._prepareTraits(data.data.traits, CONFIG.PF2E.backpackTraits);
        } else if (type === 'armor') {
            // Armor data
            const slots = getPropertySlots(data);
            this.assignPropertySlots(data, slots);
            data.armorPotencyRunes = CONFIG.PF2E.armorPotencyRunes;
            data.armorResiliencyRunes = CONFIG.PF2E.armorResiliencyRunes;
            data.armorPropertyRunes = CONFIG.PF2E.armorPropertyRunes;
            data.armorTypes = CONFIG.PF2E.armorTypes;
            data.armorGroups = CONFIG.PF2E.armorGroups;
            data.baseArmors = LocalizePF2e.translations.PF2E.Item.Armor.Base;
            data.bulkTypes = CONFIG.PF2E.bulkTypes;
            data.traits = this.prepareOptions(CONFIG.PF2E.armorTraits, data.data.traits);
            data.preciousMaterials = CONFIG.PF2E.preciousMaterials;
            data.preciousMaterialGrades = CONFIG.PF2E.preciousMaterialGrades;
            data.sizes = CONFIG.PF2E.actorSizes;
        } else if (type === 'lore') {
            // Lore-specific data
            data.proficiencies = CONFIG.PF2E.proficiencyLevels;
        } else if (type === 'effect') {
            // Effect-specific data
            if (this?.actor?.items) {
                const scopes = new Set<string>();

                data.item.data.rules
                    .filter((rule: PF2RuleElementData) => rule.key === 'PF2E.RuleElement.EffectTarget')
                    .forEach((rule: PF2RuleElementData) => {
                        scopes.add(rule.scope as string);
                    });
                if (scopes) {
                    data.targets = this.actor.items
                        .filter((item) => scopes.has(item.type))
                        .map((item) => {
                            return { id: item.id, name: item.name };
                        });
                }
            }
        }
        return data;
    }

    /** An alternative to super.getData() for subclasses that don't need this class's `getData` */
    protected getBaseData(): ItemSheetDataPF2e<TItem> {
        const itemData = this.item.data;
        const isEditable = this.isEditable;
        return {
            cssClass: isEditable ? 'editable' : 'locked',
            editable: isEditable,
            document: this.item,
            item: itemData,
            data: itemData.data,
            limited: this.item.limited,
            options: this.options,
            owner: this.item.isOwner,
            title: this.title,
            user: { isGM: game.user.isGM },
            enabledRulesUI: game.settings.get('pf2e', 'enabledRulesUI'),
            activeEffects: this.getActiveEffectsData(),
        };
    }

    protected getActiveEffectsData(): AESheetData {
        const durationString = (duration: foundry.data.EffectDurationData): string => {
            const translations = LocalizePF2e.translations.PF2E.ActiveEffects;

            /** @todo use `as const` when fixed in typescript 4.3.3 */
            const durationFields: ['rounds', 'seconds', 'turns'] = ['rounds', 'seconds', 'turns'];
            const unit = durationFields.find((unit) => duration[unit] !== undefined);
            const quantity = unit && duration[unit];
            if (!(typeof unit === 'string' && typeof quantity === 'number')) return translations.Duration.Permanent;

            type UnitLabel = 'Second' | 'Seconds' | 'Round' | 'Rounds' | 'Turn' | 'Turns';
            const unitLabel =
                quantity === 1
                    ? ((unit.slice(0, 1).toUpperCase() + unit.slice(1, -1)) as UnitLabel)
                    : ((unit.slice(0, 1).toUpperCase() + unit.slice(1)) as UnitLabel);
            return game.i18n.format(translations.Duration[unitLabel], {
                quantity,
            });
        };

        const actor = this.item.actor;
        const oldOrigin = `Actor.${actor?.id}.OwnedItem.${this.item.id}`; // Foundry 0.7
        const newOrigin = `Actor.${actor?.id}.Item.${this.item.id}`; // Foundry 0.8
        const effects =
            actor instanceof ActorPF2e
                ? actor.effects.contents.filter(
                      (effect) => effect.data.origin === newOrigin || effect.data.origin === oldOrigin,
                  )
                : this.item.effects.contents;

        const ruleUIEnabled = game.settings.get('pf2e', 'enabledRulesUI');

        return {
            showAEs: ruleUIEnabled,
            canEdit: this.actor === null && !this.item.uuid.match(/Compendium/),
            effects: effects.map((effect) => ({
                id: effect.id,
                iconPath: effect.data.icon ?? null,
                name: effect.data.label,
                duration: durationString(effect.data.duration),
                enabled: effect.isEnabled,
            })),
        };
    }

    assignPropertySlots(data: Record<string, boolean>, number: number) {
        const slots = [1, 2, 3, 4] as const;

        for (const slot of slots) {
            if (number >= slot) {
                data[`propertyRuneSlots${slot}`] = true;
            }
        }
    }

    protected prepareTraits(traits: any, choices: Record<string, string>): void {
        if (traits === undefined) {
            return;
        }
        if (traits.selected) {
            traits.selected = traits.value.reduce((obj: any, t: string) => {
                obj[t] = choices[t];
                return obj;
            }, {});
        } else {
            traits.selected = [];
        } // Add custom entry

        if (traits.custom) traits.selected.custom = traits.custom;
    }

    /** Prepare form options on the item sheet */
    protected prepareOptions(options: Record<string, string>, selections: SheetSelections): SheetOptions {
        const sheetOptions = Object.entries(options).reduce((sheetOptions, [stringKey, label]) => {
            const key = typeof selections.value[0] === 'number' ? Number(stringKey) : stringKey;
            sheetOptions[key] = {
                label,
                value: stringKey,
                selected: selections.value.includes(key),
            };
            return sheetOptions;
        }, {} as SheetOptions);

        if (selections.custom) {
            sheetOptions.custom = {
                label: selections.custom,
                value: '',
                selected: true,
            };
        }

        return sheetOptions;
    }

    protected onTraitSelector(event: JQuery.TriggeredEvent): void {
        event.preventDefault();
        const $anchor = $(event.currentTarget);
        const selectorType = $anchor.attr('data-trait-selector') ?? '';
        if (!(selectorType === 'basic' && tupleHasValue(TAG_SELECTOR_TYPES, selectorType))) {
            throw ErrorPF2e('Item sheets can only use the basic tag selector');
        }
        const objectProperty = $anchor.attr('data-property') ?? '';
        const configTypes = ($anchor.attr('data-config-types') ?? '')
            .split(',')
            .map((type) => type.trim())
            .filter((tag): tag is SelectableTagField => tupleHasValue(SELECTABLE_TAG_FIELDS, tag));
        const selectorOptions: BasicSelectorOptions = {
            objectProperty,
            configTypes,
        };

        const noCustom = $anchor.attr('data-no-custom') === 'true';
        if (noCustom) {
            selectorOptions.allowCustom = false;
        } else if (this.actor && configTypes.includes('attackEffects')) {
            // Melee attack effects can be chosen from the NPC's actions
            const attackEffectOptions: Record<string, string> = this.actor.itemTypes.action.reduce(
                (options, action) => {
                    const key = action.slug ?? sluggify(action.name);
                    return mergeObject(options, { [key]: action.name }, { inplace: false });
                },
                CONFIG.PF2E.attackEffects,
            );
            selectorOptions.customChoices = attackEffectOptions;
        }

        new TraitSelectorBasic(this.item, selectorOptions).render(true);
    }

    /**
     * Get the action image to use for a particular action type.
     */
    protected getActionImg(action: string): ImagePath {
        const img: Record<string, ImagePath> = {
            0: 'systems/pf2e/icons/default-icons/mystery-man.svg',
            1: 'systems/pf2e/icons/actions/OneAction.webp',
            2: 'systems/pf2e/icons/actions/TwoActions.webp',
            3: 'systems/pf2e/icons/actions/ThreeActions.webp',
            free: 'systems/pf2e/icons/actions/FreeAction.webp',
            reaction: 'systems/pf2e/icons/actions/Reaction.webp',
            passive: 'systems/pf2e/icons/actions/Passive.webp',
        };
        return img[action ?? '0'];
    }

    private async addDamageRoll(event: JQuery.TriggeredEvent) {
        event.preventDefault();
        const newKey = randomID(20);
        const newDamageRoll = {
            damage: '',
            damageType: '',
        };
        return this.item.update({
            [`data.damageRolls.${newKey}`]: newDamageRoll,
        });
    }

    private async deleteDamageRoll(event: JQuery.TriggeredEvent) {
        event.preventDefault();
        if (event.originalEvent) {
            await this._onSubmit(event.originalEvent);
        }
        const targetKey = $(event.target).parents('.damage-part').attr('data-damage-part');
        return this.item.update({
            [`data.damageRolls.-=${targetKey}`]: null,
        });
    }

    /** @override */
    protected _canDragDrop(_selector: string) {
        return this.item.isOwner;
    }

    /** @override */
    activateListeners(html: JQuery): void {
        super.activateListeners(html);

        html.find('li.trait-item input[type="checkbox"]').on('click', (event) => {
            if (event.originalEvent instanceof MouseEvent) {
                this._onSubmit(event.originalEvent); // Trait Selector
            }
        });

        html.find('.trait-selector').on('click', (ev) => this.onTraitSelector(ev));

        // Add Damage Roll
        html.find('.add-damage').on('click', (ev) => {
            this.addDamageRoll(ev);
        });

        // Remove Damage Roll
        html.find('.delete-damage').on('click', (ev) => {
            this.deleteDamageRoll(ev);
        });

        html.find('.add-rule-element').on('click', async (event) => {
            event.preventDefault();
            if (event.originalEvent instanceof MouseEvent) {
                await this._onSubmit(event.originalEvent); // submit any unsaved changes
            }
            const rules = (this.item.data.data as any).rules ?? [];
            this.item.update({
                'data.rules': rules.concat([{ key: 'PF2E.RuleElement.Unrecognized' }]),
            });
        });
        html.find('.rules').on('click', '.remove-rule-element', async (event) => {
            event.preventDefault();
            if (event.originalEvent instanceof MouseEvent) {
                await this._onSubmit(event.originalEvent); // submit any unsaved changes
            }
            const rules = duplicate((this.item.data.data as any).rules ?? []) as any[];
            const index = event.currentTarget.dataset.ruleIndex;
            if (rules && rules.length > Number(index)) {
                rules.splice(index, 1);
                this.item.update({ 'data.rules': rules });
            }
        });

        html.find('.add-skill-variant').on('click', (_event) => {
            if (!(this.item instanceof LorePF2e)) return;
            const variants = this.item.data.data.variants ?? {};
            const index = Object.keys(variants).length;
            this.item.update({
                [`data.variants.${index}`]: { label: '+X in terrain', options: '' },
            });
        });
        html.find('.skill-variants').on('click', '.remove-skill-variant', (event) => {
            const index = event.currentTarget.dataset.skillVariantIndex;
            this.item.update({ [`data.variants.-=${index}`]: null });
        });

        const $prerequisites = html.find<HTMLInputElement>('input[name="data.prerequisites.value"]');
        if ($prerequisites[0]) {
            new Tagify($prerequisites[0], {
                editTags: 1,
            });
        }

        // Active Effect controls
        html.find('.tab.effects table th a[data-action="create"]').on('click', async () => {
            const newEffect = await ActiveEffectPF2e.create(
                {
                    label: 'New Effect',
                    icon: this.item.img,
                    origin: this.item.uuid,
                    disabled: false,
                },
                { parent: this.item as unknown as foundry.documents.BaseItem },
            );
            this.render();
            this.item.effects.get(newEffect?.id ?? '')!.sheet.render(true);
        });

        const $aeControls = html.find('.tab.effects table tbody td.controls');

        const actor = this.item.actor;
        const origin = `Actor.${actor?.id}.OwnedItem.${this.item.id}`; // `;

        const getEffects = (): ActiveEffect[] => {
            return actor instanceof ActorPF2e
                ? actor.effects.contents.filter((effect) => effect.data.origin === origin)
                : this.item.effects.contents;
        };
        const getEffectId = (target: HTMLElement): string | undefined => {
            return $(target).closest('tr').data('effect-id');
        };
        const effects = getEffects();
        effects;

        $aeControls.find('input[data-action="enable"]').on('change', (event) => {
            event.preventDefault();

            const effects = getEffects();
            const effectId = getEffectId(event.target);
            const effect = effects.find((ownedEffect) => ownedEffect.id === effectId);
            if (effect instanceof ActiveEffect) {
                const isDisabled = !$(event.target as HTMLInputElement).is(':checked');
                effect.update({ disabled: isDisabled }).then(() => this.render());
            }
        });

        $aeControls.find('a[data-action="edit"]').on('click', (event) => {
            const effects = getEffects();
            const effectId = getEffectId(event.target);
            const effect = effects.find((ownedEffect) => ownedEffect.id === effectId);
            if (effect instanceof ActiveEffect) {
                effect.sheet.render(true);
            }
        });
        $aeControls.find('a[data-action="delete"]').on('click', (event) => {
            const effects = getEffects();
            const effectId = getEffectId(event.target);
            const effect = effects.find((ownedEffect) => ownedEffect.id === effectId);
            if (effect instanceof ActiveEffect) {
                effect.delete();
            }
        });
    }

    /** @override */
    protected _getSubmitData(updateData: Record<string, unknown> = {}): Record<string, unknown> {
        // create the expanded update data object
        const fd = new FormDataExtended(this.form, { editors: this.editors });
        const data: Record<string, unknown> & { data?: { rules?: string[] } } = updateData
            ? mergeObject(fd.toObject(), updateData)
            : expandObject(fd.toObject());

        // ensure all rules objects are parsed and saved as objects
        if (data.data?.rules) {
            data.data.rules = Object.entries(data.data.rules).map(([_, value]) => {
                try {
                    return JSON.parse(value);
                } catch (error) {
                    ui.notifications.warn('Syntax error in rule element definition.');
                    throw error;
                }
            });
        }

        return flattenObject(data); // return the flattened submission data
    }

    /**
     * Hide the sheet-config button unless there is more than one sheet option.
     * @override */
    protected _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();
        const hasMultipleSheets = Object.keys(CONFIG.Item.sheetClasses[this.item.type]).length > 1;
        const sheetButton = buttons.find((button) => button.class === 'configure-sheet');
        if (!hasMultipleSheets && sheetButton) {
            buttons.splice(buttons.indexOf(sheetButton), 1);
        }
        return buttons;
    }

    /**
     * Tagify sets an empty input field to "" instead of "[]", which later causes the JSON parse to throw an error
     * @override
     */
    protected async _onSubmit(
        event: Event,
        { updateData = null, preventClose = false, preventRender = false }: OnSubmitFormOptions = {},
    ): Promise<Record<string, unknown>> {
        const $form = $<HTMLFormElement>(this.form);
        $form.find<HTMLInputElement>('tags ~ input').each((_i, input) => {
            if (input.value === '') {
                input.value = '[]';
            }
        });
        return super._onSubmit(event, { updateData, preventClose, preventRender });
    }

    /** @override */
    protected async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Avoid setting a baseItem of an empty string
        if (formData['data.baseItem'] === '') {
            formData['data.baseItem'] = null;
        }
        super._updateObject(event, formData);
    }
}
