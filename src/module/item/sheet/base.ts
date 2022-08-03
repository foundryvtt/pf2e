import { ItemPF2e, LorePF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { RuleElements, RuleElementSource } from "@module/rules";
import { createSheetOptions, createSheetTags } from "@module/sheet/helpers";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links";
import { LocalizePF2e } from "@system/localize";
import {
    BasicConstructorOptions,
    SelectableTagField,
    SELECTABLE_TAG_FIELDS,
    TagSelectorBasic,
    TAG_SELECTOR_TYPES,
} from "@system/tag-selector";
import { ErrorPF2e, sluggify, sortStringRecord, tupleHasValue } from "@util";
import Tagify from "@yaireo/tagify";
import type * as TinyMCE from "tinymce";
import { CodeMirror } from "./codemirror";
import { ItemSheetDataPF2e } from "./data-types";
import { RuleElementForm, RULE_ELEMENT_FORMS } from "./rule-elements";

export class ItemSheetPF2e<TItem extends ItemPF2e> extends ItemSheet<TItem> {
    static override get defaultOptions(): DocumentSheetOptions {
        const options = super.defaultOptions;
        options.width = 650;
        options.height = 460;
        options.classes = options.classes.concat(["pf2e", "item"]);
        options.template = "systems/pf2e/templates/items/item-sheet.html";
        options.scrollY = [".tab.active"];
        options.tabs = [
            {
                navSelector: ".tabs",
                contentSelector: ".sheet-body",
                initial: "description",
            },
            {
                navSelector: ".mystify-nav",
                contentSelector: ".mystify-sheet",
                initial: "unidentified",
            },
        ];

        return options;
    }

    /** Maintain selected rule element at the sheet level (do not persist) */
    private selectedRuleElementType: string | null = Object.keys(RuleElements.all).at(0) ?? null;

    /** If we are currently editing an RE, this is the index */
    private editingRuleElementIndex: number | null = null;

    private ruleElementForms: Record<number, RuleElementForm> = {};

    get editingRuleElement() {
        if (this.editingRuleElementIndex === null) return null;
        return this.item.toObject().system.rules[this.editingRuleElementIndex] ?? null;
    }

    override async getData(options?: Partial<DocumentSheetOptions>) {
        const sheetData: any = this.getBaseData(options);
        sheetData.abilities = CONFIG.PF2E.abilities;
        sheetData.saves = CONFIG.PF2E.saves;

        const itemData: TItem["data"] = sheetData.item;

        mergeObject(sheetData, {
            hasSidebar: true,
            sidebarTemplate: () => `systems/pf2e/templates/items/${itemData.type}-sidebar.html`,
            hasDetails: [
                "action",
                "armor",
                "backpack",
                "book",
                "condition",
                "consumable",
                "deity",
                "equipment",
                "feat",
                "lore",
                "melee",
                "spell",
                "weapon",
            ].includes(itemData.type),
            detailsTemplate: () => `systems/pf2e/templates/items/${itemData.type}-details.html`,
        }); // Damage types

        const dt = duplicate(CONFIG.PF2E.damageTypes);
        if (itemData.type === "spell") mergeObject(dt, CONFIG.PF2E.healingTypes);
        sheetData.damageTypes = dt;

        // do not let user set bulk if in a stack group because the group determines bulk
        const stackGroup = sheetData.data?.stackGroup?.value;
        sheetData.bulkDisabled = stackGroup !== undefined && stackGroup !== null && stackGroup.trim() !== "";
        sheetData.rarity = CONFIG.PF2E.rarityTraits;
        sheetData.usage = CONFIG.PF2E.usageTraits; // usage data
        sheetData.stackGroups = CONFIG.PF2E.stackGroups;

        if (itemData.type === "treasure") {
            sheetData.currencies = CONFIG.PF2E.currencies;
            sheetData.bulkTypes = CONFIG.PF2E.bulkTypes;
            sheetData.sizes = CONFIG.PF2E.actorSizes;
        } else if (itemData.type === "consumable") {
            sheetData.consumableTypes = CONFIG.PF2E.consumableTypes;
            sheetData.traits = createSheetTags(CONFIG.PF2E.consumableTraits, itemData.system.traits);
            sheetData.bulkTypes = CONFIG.PF2E.bulkTypes;
            sheetData.stackGroups = CONFIG.PF2E.stackGroups;
            sheetData.consumableTraits = CONFIG.PF2E.consumableTraits;
            sheetData.sizes = CONFIG.PF2E.actorSizes;
        } else if (itemData.type === "melee") {
            // Melee Data
            sheetData.hasSidebar = false;
            sheetData.detailsActive = true;
            sheetData.damageTypes = CONFIG.PF2E.damageTypes;

            sheetData.attackEffects = createSheetOptions(this.getAttackEffectOptions(), sheetData.data.attackEffects);
            sheetData.traits = createSheetTags(CONFIG.PF2E.npcAttackTraits, sheetData.system.traits);
        } else if (itemData.type === "condition") {
            // Condition types

            sheetData.conditions = [];
        } else if (itemData.type === "equipment") {
            // Equipment data
            sheetData.traits = createSheetTags(CONFIG.PF2E.equipmentTraits, itemData.system.traits);
            sheetData.bulkTypes = CONFIG.PF2E.bulkTypes;
            sheetData.stackGroups = CONFIG.PF2E.stackGroups;
            sheetData.equipmentTraits = CONFIG.PF2E.equipmentTraits;
            sheetData.sizes = CONFIG.PF2E.actorSizes;
        } else if (itemData.type === "backpack") {
            // Backpack data
            sheetData.traits = createSheetTags(CONFIG.PF2E.equipmentTraits, itemData.system.traits);
            sheetData.bulkTypes = CONFIG.PF2E.bulkTypes;
            sheetData.equipmentTraits = CONFIG.PF2E.equipmentTraits;
            sheetData.sizes = CONFIG.PF2E.actorSizes;
        } else if (itemData.type === "lore") {
            // Lore-specific data
            sheetData.proficiencies = CONFIG.PF2E.proficiencyLevels;
        }

        const translations: Record<string, string> = LocalizePF2e.translations.PF2E.RuleElement;
        sheetData.ruleLabels = itemData.system.rules.map((ruleData: RuleElementSource) => {
            const key = ruleData.key.replace(/^PF2E\.RuleElement\./, "");
            const label = translations[key] ?? translations.Unrecognized;
            const recognized = label !== translations.Unrecognized;
            return {
                label: recognized ? label : game.i18n.localize("PF2E.RuleElement.Unrecognized"),
                recognized,
            };
        });

        return sheetData;
    }

    /** An alternative to super.getData() for subclasses that don't need this class's `getData` */
    protected getBaseData(options: Partial<DocumentSheetOptions> = {}): ItemSheetDataPF2e<TItem> {
        options.classes?.push(this.item.type);
        options.editable = this.isEditable;

        const item = this.item.clone({}, { keepId: true });
        const itemData = item.toObject(false) as unknown as TItem["data"];
        const rules = this.item.toObject().system.rules;

        return {
            itemType: null,
            hasSidebar: false,
            hasDetails: true,
            cssClass: this.isEditable ? "editable" : "locked",
            editable: this.isEditable,
            document: this.item,
            item: itemData,
            isPhysical: false,
            data: item.system,
            limited: this.item.limited,
            options: this.options,
            owner: this.item.isOwner,
            title: this.title,
            user: { isGM: game.user.isGM },
            enabledRulesUI: game.settings.get("pf2e", "enabledRulesUI"),
            ruleEditing: !!this.editingRuleElement,
            ruleSelection: {
                selected: this.selectedRuleElementType,
                types: sortStringRecord(
                    Object.keys(RuleElements.all).reduce((result: Record<string, string>, key) => {
                        const translations: Record<string, string> = LocalizePF2e.translations.PF2E.RuleElement;
                        result[key] = game.i18n.localize(translations[key] ?? key);
                        return result;
                    }, {})
                ),
            },
            ruleElements: rules.map((rule, index) => ({
                template: RULE_ELEMENT_FORMS[rule.key]?.template ?? "systems/pf2e/templates/items/rules/default.html",
                index,
                rule,
            })),
        };
    }

    protected onTagSelector(event: JQuery.TriggeredEvent): void {
        event.preventDefault();
        const $anchor = $(event.currentTarget);
        const selectorType = $anchor.attr("data-trait-selector") ?? "";
        if (!(selectorType === "basic" && tupleHasValue(TAG_SELECTOR_TYPES, selectorType))) {
            throw ErrorPF2e("Item sheets can only use the basic tag selector");
        }
        const propertyIsFlat = !!$anchor.attr("data-flat");
        const objectProperty = $anchor.attr("data-property") ?? "";
        const title = $anchor.attr("data-title");
        const configTypes = ($anchor.attr("data-config-types") ?? "")
            .split(",")
            .map((type) => type.trim())
            .filter((tag): tag is SelectableTagField => tupleHasValue(SELECTABLE_TAG_FIELDS, tag));
        const selectorOptions: BasicConstructorOptions = {
            objectProperty,
            configTypes,
            title,
            flat: propertyIsFlat,
        };

        const noCustom = $anchor.attr("data-no-custom") === "true";
        if (noCustom) {
            selectorOptions.allowCustom = false;
        } else if (this.actor && configTypes.includes("attackEffects")) {
            selectorOptions.customChoices = this.getAttackEffectOptions();
        }

        new TagSelectorBasic(this.item, selectorOptions).render(true);
    }

    /**
     * Get NPC attack effect options
     */
    protected getAttackEffectOptions(): Record<string, string> {
        // Melee attack effects can be chosen from the NPC's actions and consumable items
        const attackEffectOptions: Record<string, string> =
            this.actor?.items
                .filter((item) => item.type === "action" || item.type === "consumable")
                .reduce((options, item) => {
                    const key = item.slug ?? sluggify(item.name);
                    return mergeObject(options, { [key]: item.name }, { inplace: false });
                }, CONFIG.PF2E.attackEffects) ?? {};

        return attackEffectOptions;
    }

    private async addDamageRoll(event: JQuery.TriggeredEvent) {
        event.preventDefault();
        const newKey = randomID(20);
        const newDamageRoll = {
            damage: "",
            damageType: "",
        };
        return this.item.update({
            [`data.damageRolls.${newKey}`]: newDamageRoll,
        });
    }

    private async deleteDamageRoll(event: JQuery.TriggeredEvent): Promise<ItemPF2e> {
        event.preventDefault();
        if (event.originalEvent) {
            await this._onSubmit(event.originalEvent);
        }
        const targetKey = $(event.target).parents(".damage-part").attr("data-damage-part");
        return this.item.update({
            [`data.damageRolls.-=${targetKey}`]: null,
        });
    }

    override async close(options?: { force?: boolean }): Promise<void> {
        this.editingRuleElementIndex = null;
        return super.close(options);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find("li.trait-item input[type=checkbox]").on("click", (event) => {
            if (event.originalEvent instanceof MouseEvent) {
                this._onSubmit(event.originalEvent); // Trait Selector
            }
        });

        $html.find(".trait-selector").on("click", (ev) => this.onTagSelector(ev));

        // Add Damage Roll
        $html.find(".add-damage").on("click", (ev) => {
            this.addDamageRoll(ev);
        });

        // Remove Damage Roll
        $html.find(".delete-damage").on("click", (ev) => {
            this.deleteDamageRoll(ev);
        });

        $html.find("[data-action=select-rule-element]").on("change", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.selectedRuleElementType = (event.target as HTMLSelectElement).value;
        });

        $html.find(".add-rule-element").on("click", async (event) => {
            event.preventDefault();
            if (event.originalEvent instanceof MouseEvent) {
                await this._onSubmit(event.originalEvent); // submit any unsaved changes
            }
            const rulesData = this.item.toObject().system.rules;
            const key = this.selectedRuleElementType ?? "NewRuleElement";
            this.item.update({ "system.rules": rulesData.concat({ key }) });
        });

        $html.find(".edit-rule-element").on("click", async (event) => {
            const index = Number(event.currentTarget.dataset.ruleIndex ?? "NaN") ?? null;
            this.editingRuleElementIndex = index;
            this.render(true);
        });

        $html.find(".rules .remove-rule-element").on("click", async (event) => {
            event.preventDefault();
            if (event.originalEvent instanceof MouseEvent) {
                await this._onSubmit(event.originalEvent); // submit any unsaved changes
            }
            const rules = this.item.toObject().system.rules;
            const index = Number(event.currentTarget.dataset.ruleIndex ?? "NaN");
            if (rules && Number.isInteger(index) && rules.length > index) {
                rules.splice(index, 1);
                this.item.update({ "system.rules": rules });
            }
        });

        $html.find(".add-skill-variant").on("click", (_event) => {
            if (!(this.item instanceof LorePF2e)) return;
            const variants = this.item.system.variants ?? {};
            const index = Object.keys(variants).length;
            this.item.update({
                [`data.variants.${index}`]: { label: "+X in terrain", options: "" },
            });
        });

        $html.find(".skill-variants .remove-skill-variant").on("click", (event) => {
            const index = event.currentTarget.dataset.skillVariantIndex;
            this.item.update({ [`data.variants.-=${index}`]: null });
        });

        $html.find("[data-clipboard]").on("click", (event) => {
            const clipText = $(event.target).closest("[data-clipboard]").attr("data-clipboard");
            if (clipText) {
                navigator.clipboard.writeText(clipText);
                ui.notifications.info(game.i18n.format("PF2E.ClipboardNotification", { clipText }));
            }
        });

        const $prerequisites = $html.find<HTMLInputElement>('input[name="system.prerequisites.value"]');
        if ($prerequisites[0]) {
            new Tagify($prerequisites[0], {
                editTags: 1,
            });
        }

        // If editing a rule element, create the editor
        const editingRuleElement = this.editingRuleElement;
        if (editingRuleElement) {
            const ruleText = JSON.stringify(editingRuleElement, null, 2);
            const view = new CodeMirror.EditorView({
                doc: ruleText,
                extensions: [CodeMirror.basicSetup, CodeMirror.keybindings, CodeMirror.json(), CodeMirror.jsonLinter()],
            });

            $html.find(".rule-editing .editor-placeholder").replaceWith(view.dom);

            // Prevent textarea changes from bubbling
            $html.find(".rule-editing").on("change", "textarea", (event) => {
                event.stopPropagation();
            });

            $html.find(".rule-editing [data-action=close]").on("click", (event) => {
                event.preventDefault();
                this.editingRuleElementIndex = null;
                this.render(true);
            });

            $html.find(".rule-editing [data-action=apply]").on("click", (event) => {
                event.preventDefault();
                const value = view.state.doc.toString();

                // Close early if the editing index is invalid
                if (this.editingRuleElementIndex === null) {
                    this.editingRuleElementIndex = null;
                    this.render(true);
                    return;
                }

                try {
                    const rules = this.item.toObject().system.rules;
                    rules[this.editingRuleElementIndex] = JSON.parse(value as string);
                    this.editingRuleElementIndex = null;
                    this.item.update({ "system.rules": rules });
                } catch (error) {
                    if (error instanceof Error) {
                        ui.notifications.error(
                            game.i18n.format("PF2E.ErrorMessage.RuleElementSyntax", { message: error.message })
                        );
                        console.warn("Syntax error in rule element definition.", error.message, value);
                        throw error;
                    }
                }
            });
        }

        // Activate rule element sub forms
        this.ruleElementForms = {};
        const html = $html.get(0)!;
        const ruleSections = html.querySelectorAll<HTMLElement>(".rules .rule-form");
        for (const ruleSection of Array.from(ruleSections)) {
            const { idx, key } = ruleSection.dataset;
            const FormClass = RULE_ELEMENT_FORMS[key ?? ""];
            if (FormClass) {
                const form = new FormClass();
                this.ruleElementForms[Number(idx)] = form;
                form.activateListeners(ruleSection);
            }
        }

        InlineRollLinks.listen($html);
    }

    /** Ensure the source description is edited rather than a prepared one */
    override activateEditor(name: string, options?: Partial<TinyMCE.EditorSettings>, initialContent?: string): void {
        super.activateEditor(
            name,
            options,
            name === "system.description.value" ? this.item._source.system.description.value : initialContent
        );
    }

    protected override _getSubmitData(updateData: Record<string, unknown> = {}): Record<string, unknown> {
        // create the expanded update data object
        const fd = new FormDataExtended(this.form, { editors: this.editors });
        const data: Record<string, unknown> & { system?: { rules?: string[] } } = updateData
            ? mergeObject(fd.object, updateData)
            : expandObject(fd.object);

        const flattenedData = flattenObject(data);

        // Process tagify. Tagify has a convention (used in their codebase as well) where it prepends the input element
        const tagifyInputElements = this.form.querySelectorAll<HTMLInputElement>("tags.tagify ~ input");
        for (const inputEl of Array.from(tagifyInputElements)) {
            const path = inputEl.name;
            const inputValue = flattenedData[path];
            const selections = typeof inputValue === "string" ? JSON.parse(inputValue) : inputValue;
            if (Array.isArray(selections)) {
                flattenedData[path] = selections.map((w: { id?: string; value?: string }) => w.id ?? w.value);
            }
        }

        return flattenedData;
    }

    /** Hide the sheet-config button unless there is more than one sheet option. */
    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();
        const hasMultipleSheets = Object.keys(CONFIG.Item.sheetClasses[this.item.type]).length > 1;
        const sheetButton = buttons.find((button) => button.class === "configure-sheet");
        if (!hasMultipleSheets && sheetButton) {
            buttons.splice(buttons.indexOf(sheetButton), 1);
        }
        // Convenenience utility for data entry; may make available to general users in the future
        if (BUILD_MODE === "development" && this.item.isOwned && this.item.sourceId?.startsWith("Compendium.")) {
            buttons.unshift({
                label: "Refresh",
                class: "refresh-from-compendium",
                icon: "fas fa-sync-alt",
                onclick: () => this.item.refreshFromCompendium(),
            });
        }
        return buttons;
    }

    protected override _canDragDrop(_selector: string): boolean {
        return this.item.isOwner;
    }

    /** Tagify sets an empty input field to "" instead of "[]", which later causes the JSON parse to throw an error */
    protected override async _onSubmit(
        event: Event,
        { updateData = null, preventClose = false, preventRender = false }: OnSubmitFormOptions = {}
    ): Promise<Record<string, unknown>> {
        const $form = $<HTMLFormElement>(this.form);
        $form.find<HTMLInputElement>("tags ~ input").each((_i, input) => {
            if (input.value === "") input.value = "[]";
        });

        return super._onSubmit(event, { updateData, preventClose, preventRender });
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Avoid setting a baseItem of an empty string
        if (formData["system.baseItem"] === "") {
            formData["system.baseItem"] = null;
        }

        const rulesVisible = !!this.form.querySelector(".rules");
        const expanded = expandObject(formData) as DeepPartial<ItemSourcePF2e>;

        if (rulesVisible && expanded.system?.rules) {
            const itemData = this.item.toObject();
            const rules = itemData.system.rules ?? [];

            for (const [key, value] of Object.entries(expanded.system.rules)) {
                const idx = Number(key);

                // If the entire thing is a string, this is a regular JSON textarea
                if (typeof value === "string") {
                    try {
                        rules[idx] = JSON.parse(value as string);
                    } catch (error) {
                        if (error instanceof Error) {
                            ui.notifications.error(
                                game.i18n.format("PF2E.ErrorMessage.RuleElementSyntax", { message: error.message })
                            );
                            console.warn("Syntax error in rule element definition.", error.message, value);
                            throw error; // prevent update, to give the user a chance to correct, and prevent bad data
                        }
                    }
                    continue;
                }

                if (!value) continue;

                rules[idx] = mergeObject(rules[idx] ?? {}, value);

                // Call any special handlers in the rule element forms
                this.ruleElementForms[idx]?._updateObject(rules[idx]);

                // predicate is special cased as always json. Later on extend such parsing to more things
                const predicateValue = value.predicate as unknown;
                if (typeof predicateValue === "string" && predicateValue.trim() === "") {
                    delete rules[idx].predicate;
                } else {
                    try {
                        rules[idx].predicate = JSON.parse(predicateValue as string);
                    } catch (error) {
                        if (error instanceof Error) {
                            ui.notifications.error(
                                game.i18n.format("PF2E.ErrorMessage.RuleElementSyntax", { message: error.message })
                            );
                            console.warn("Syntax error in rule element definition.", error.message, predicateValue);
                            throw error; // prevent update, to give the user a chance to correct, and prevent bad data
                        }
                    }
                }
            }

            expanded.system.rules = rules;
        }

        return super._updateObject(event, flattenObject(expanded));
    }
}
