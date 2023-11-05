import { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { Rarity } from "@module/data.ts";
import { RuleElements, RuleElementSource } from "@module/rules/index.ts";
import {
    createSheetTags,
    createTagifyTraits,
    maintainFocusInRender,
    processTagifyInSubmitData,
    SheetOptions,
    TraitTagifyEntry,
} from "@module/sheet/helpers.ts";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links.ts";
import {
    BasicConstructorOptions,
    SELECTABLE_TAG_FIELDS,
    SelectableTagField,
    TagSelectorBasic,
} from "@system/tag-selector/index.ts";
import {
    ErrorPF2e,
    fontAwesomeIcon,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    objectHasKey,
    sluggify,
    SORTABLE_DEFAULTS,
    sortStringRecord,
    tagify,
    tupleHasValue,
} from "@util";
import * as R from "remeda";
import Sortable from "sortablejs";
import type * as TinyMCE from "tinymce";
import { CodeMirror } from "./codemirror.ts";
import { RULE_ELEMENT_FORMS, RuleElementForm } from "./rule-element-form/index.ts";

class ItemSheetPF2e<TItem extends ItemPF2e> extends ItemSheet<TItem> {
    static override get defaultOptions(): DocumentSheetOptions {
        const options = super.defaultOptions;
        options.width = 695;
        options.height = 460;
        options.classes = options.classes.concat(["pf2e", "item"]);
        options.template = "systems/pf2e/templates/items/sheet.hbs";
        options.scrollY = [".tab.active", ".inventory-details", "div[data-rule-tab]"];
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
    #selectedRuleElementType: string | null = Object.keys(RuleElements.all).at(0) ?? null;

    /** If we are currently editing an RE, this is the index */
    #editingRuleElementIndex: number | null = null;
    #rulesLastScrollTop: number | null = null;

    #ruleElementForms: RuleElementForm[] = [];

    get editingRuleElement(): RuleElementSource | null {
        if (this.#editingRuleElementIndex === null) return null;
        return this.item.toObject().system.rules[this.#editingRuleElementIndex] ?? null;
    }

    get validTraits(): Record<string, string> | null {
        if (objectHasKey(CONFIG.PF2E.Item.traits, this.item.type)) {
            return CONFIG.PF2E.Item.traits[this.item.type];
        }
        return null;
    }

    /** An alternative to super.getData() for subclasses that don't need this class's `getData` */
    override async getData(options: Partial<DocumentSheetOptions> = {}): Promise<ItemSheetDataPF2e<TItem>> {
        options.id = this.id;
        options.classes?.push(this.item.type);
        options.editable = this.isEditable;
        options.sheetConfig &&=
            Object.values(CONFIG.Item.sheetClasses[this.item.type]).filter((c) => c.canConfigure).length > 1;

        const { item } = this;
        this.#createRuleElementForms();

        // Enrich content
        const enrichedContent: Record<string, string> = {};
        const rollData = { ...this.item.getRollData(), ...this.actor?.getRollData() };

        // Get the source description in case this is an unidentified physical item
        enrichedContent.description = await TextEditor.enrichHTML(item._source.system.description.value, {
            rollData,
            secrets: game.user.isGM,
            async: true,
        });
        enrichedContent.gmNotes = await TextEditor.enrichHTML(item.system.description.gm.trim(), {
            rollData,
            secrets: game.user.isGM,
            async: true,
        });

        const validTraits = this.validTraits;
        const hasRarity = !item.isOfType("action", "condition", "deity", "effect", "lore", "melee");
        const itemTraits = item.system.traits?.value ?? [];
        const sourceTraits = item._source.system.traits?.value ?? [];
        const traits = validTraits ? createSheetTags(validTraits, itemTraits) : null;
        const traitTagifyData = validTraits
            ? createTagifyTraits(itemTraits, { sourceTraits, record: validTraits })
            : null;

        return {
            itemType: null,
            showTraits: this.validTraits !== null,
            hasSidebar: this.item.isOfType("condition", "lore"),
            sidebarTitle: game.i18n.format("PF2E.Item.SidebarSummary", {
                type: game.i18n.localize(`TYPES.Item.${this.item.type}`),
            }),
            sidebarTemplate: `systems/pf2e/templates/items/${sluggify(item.type)}-sidebar.hbs`,
            detailsTemplate: `systems/pf2e/templates/items/${sluggify(item.type)}-details.hbs`,
            cssClass: this.isEditable ? "editable" : "locked",
            editable: this.isEditable,
            document: item,
            item,
            isPhysical: false,
            data: item.system,
            fieldIdPrefix: `field-${this.appId}-`,
            enrichedContent,
            limited: this.item.limited,
            options: this.options,
            owner: this.item.isOwner,
            title: this.title,
            user: { isGM: game.user.isGM },
            rarity: hasRarity ? this.item.system.traits?.rarity ?? "common" : null,
            rarities: CONFIG.PF2E.rarityTraits,
            traits,
            traitTagifyData,
            enabledRulesUI: game.user.isGM || game.settings.get("pf2e", "enabledRulesUI"),
            ruleEditing: !!this.editingRuleElement,
            rules: {
                selection: {
                    selected: this.#selectedRuleElementType,
                    types: sortStringRecord(
                        Object.keys(RuleElements.all).reduce(
                            (result: Record<string, string>, key) =>
                                mergeObject(result, { [key]: `PF2E.RuleElement.${key}` }),
                            {},
                        ),
                    ),
                },
                elements: await Promise.all(
                    this.#ruleElementForms.map(async (form) => ({
                        template: await form.render(),
                    })),
                ),
            },
            proficiencies: CONFIG.PF2E.proficiencyLevels, // lore only, will be removed later
        };
    }

    /** Creates and activates rule element forms, reusing previous ones when possible to preserve form state */
    #createRuleElementForms(): void {
        const rules = this.item.toObject().system.rules;
        const previousForms = [...this.#ruleElementForms];

        // First pass, create options, and then look for exact matches of data and reuse those forms
        // This is mostly to handle deletions and re-ordering of rule elements
        const processedRules = rules.map((rule, index) => {
            const options = {
                sheet: this,
                index,
                rule,
                object: this.item.rules.find((r) => r.sourceIndex === index) ?? null,
            };

            // If a form exists of the correct type with an exact match, reuse that one.
            // If we find a match, delete it so that we don't use the same form for two different REs
            const FormClass = RULE_ELEMENT_FORMS[String(rule.key)] ?? RuleElementForm;
            const existing =
                previousForms.find((f) => R.equals(f.rule, rule) && f.constructor.name === FormClass.name) ?? null;
            if (existing) {
                previousForms.splice(previousForms.indexOf(existing), 1);
            }
            return { options, FormClass, existing };
        });

        // Second pass, if any unmatched rule has a form in the exact position that fits, reuse that one
        // This handles the "frequent updates" case that would desync the other one
        for (const rule of processedRules.filter((p) => !p.existing)) {
            const existing = this.#ruleElementForms[rule.options.index];
            if (existing instanceof rule.FormClass && !processedRules.some((r) => r.existing === existing)) {
                rule.existing = existing;
            }
        }

        // Create the forms, using the existing form or creating a new one if necessary
        this.#ruleElementForms = processedRules.map((processed) => {
            if (processed.existing) {
                processed.existing.initialize(processed.options);
                return processed.existing;
            }

            return new processed.FormClass(processed.options);
        });
    }

    protected onTagSelector(anchor: HTMLAnchorElement): void {
        const selectorType = anchor.dataset.tagSelector ?? "";
        if (selectorType !== "basic") {
            throw ErrorPF2e("Item sheets can only use the basic tag selector");
        }
        const propertyIsFlat = anchor.dataset.flat === "true";
        const objectProperty = anchor.dataset.property ?? "";
        const title = anchor.dataset.title;
        const configTypes = (anchor.dataset.configTypes ?? "")
            .split(",")
            .map((type) => type.trim())
            .filter((tag): tag is SelectableTagField => tupleHasValue(SELECTABLE_TAG_FIELDS, tag));
        const selectorOptions: BasicConstructorOptions = {
            objectProperty,
            configTypes,
            title,
            flat: propertyIsFlat,
        };

        const noCustom = anchor.dataset.noCustom === "true";
        if (noCustom) {
            selectorOptions.allowCustom = false;
        } else if (this.actor && configTypes.includes("attackEffects")) {
            selectorOptions.customChoices = this.getAttackEffectOptions();
        }

        new TagSelectorBasic(this.item, selectorOptions).render(true);
    }

    /** Get NPC attack effect options */
    protected getAttackEffectOptions(): Record<string, string> {
        // Melee attack effects can be chosen from the NPC's actions and consumable items
        const items = this.actor?.items.contents ?? [];
        return items
            .filter((i) => i.isOfType("action", "consumable"))
            .reduce((options, item) => {
                const key = item.slug ?? sluggify(item.name);
                return { ...options, [key]: item.name };
            }, deepClone(CONFIG.PF2E.attackEffects));
    }

    override async activateEditor(
        name: string,
        options: EditorCreateOptions = {},
        initialContent?: string,
    ): Promise<TinyMCE.Editor | ProseMirror.EditorView> {
        // Ensure the source description is edited rather than a prepared one
        const sourceContent =
            name === "system.description.value" ? this.item._source.system.description.value : initialContent;

        const mutuallyExclusive = ["system.description.gm", "system.description.value"];
        if (mutuallyExclusive.includes(name)) {
            const html = this.element[0];
            for (const elementName of mutuallyExclusive.filter((n) => n !== name)) {
                const element = htmlQuery(html, `[data-edit="${elementName}"]`);
                const section = htmlClosest(element, ".editor-container");
                if (section) {
                    section.style.display = "none";
                }
            }

            htmlQuery(html, ".tab.description")?.classList.add("editing");
        }

        return super.activateEditor(name, options, sourceContent);
    }

    override async close(options?: { force?: boolean }): Promise<void> {
        this.#editingRuleElementIndex = null;
        return super.close(options);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        for (const anchor of htmlQueryAll<HTMLAnchorElement>(html, "a.tag-selector")) {
            anchor.addEventListener("click", () => this.onTagSelector(anchor));
        }

        const rulesPanel = htmlQuery(html, ".tab[data-tab=rules]");

        // Item slug
        const slugInput = htmlQuery<HTMLInputElement>(rulesPanel, 'input[name="system.slug"]');
        if (slugInput) {
            slugInput.addEventListener("change", () => {
                slugInput.value = sluggify(slugInput.value);
            });
            htmlQuery(rulesPanel, "a[data-action=regenerate-slug]")?.addEventListener("click", () => {
                if (this._submitting) return;

                slugInput.value = sluggify(this.item.name);
                const event = new Event("change");
                slugInput.dispatchEvent(event);
            });
        }

        const ruleElementSelect = htmlQuery<HTMLSelectElement>(rulesPanel, "select[data-action=select-rule-element]");
        ruleElementSelect?.addEventListener("change", () => {
            this.#selectedRuleElementType = ruleElementSelect.value;
        });

        for (const anchor of htmlQueryAll(rulesPanel, "a.add-rule-element")) {
            anchor.addEventListener("click", async (event) => {
                await this._onSubmit(event); // Submit any unsaved changes
                const rulesData = this.item.toObject().system.rules;
                const key = this.#selectedRuleElementType ?? "NewRuleElement";
                this.item.update({ "system.rules": rulesData.concat({ key }) });
            });
        }

        for (const anchor of htmlQueryAll(rulesPanel, "a.edit-rule-element")) {
            anchor.addEventListener("click", async () => {
                if (this._submitting) return; // Don't open if already submitting
                const index = Number(anchor.dataset.ruleIndex ?? "NaN") ?? null;
                this.#editingRuleElementIndex = index;
                this.#rulesLastScrollTop = rulesPanel?.scrollTop ?? null;
                this.render();
            });
        }

        for (const anchor of htmlQueryAll(rulesPanel, ".rules a.remove-rule-element")) {
            anchor.addEventListener("click", async (event) => {
                await this._onSubmit(event); // Submit any unsaved changes
                const rules = this.item.toObject().system.rules;
                const index = Number(anchor.dataset.ruleIndex ?? "NaN");
                if (rules && Number.isInteger(index) && rules.length > index) {
                    rules.splice(index, 1);
                    this.item.update({ "system.rules": rules });
                }
            });
        }

        for (const anchor of htmlQueryAll<HTMLAnchorElement>(rulesPanel, "a[data-clipboard]")) {
            anchor.addEventListener("click", () => {
                const clipText = anchor.dataset.clipboard;
                if (clipText) {
                    game.clipboard.copyPlainText(clipText);
                    ui.notifications.info(game.i18n.format("PF2E.ClipboardNotification", { clipText }));
                }
            });
        }

        // If editing a rule element, create the editor
        const editingRuleElement = this.editingRuleElement;
        if (editingRuleElement) {
            const ruleText = JSON.stringify(editingRuleElement, null, 2);
            const schema = RuleElements.all[String(editingRuleElement.key)]?.schema.fields;
            const view = new CodeMirror.EditorView({
                doc: ruleText,
                extensions: [
                    CodeMirror.basicSetup,
                    CodeMirror.keybindings,
                    ...CodeMirror.ruleElementExtensions({ schema }),
                ],
            });

            html.querySelector<HTMLDivElement>(".rule-editing .editor-placeholder")?.replaceWith(view.dom);

            const closeBtn = html.querySelector<HTMLButtonElement>(".rule-editing button[data-action=close]");
            closeBtn?.addEventListener("click", () => {
                this.#editingRuleElementIndex = null;
                this.render();
            });
            closeBtn?.removeAttribute("disabled");

            html
                .querySelector<HTMLButtonElement>(".rule-editing button[data-action=apply]")
                ?.addEventListener("click", () => {
                    const value = view.state.doc.toString();

                    // Close early if the editing index is invalid
                    if (this.#editingRuleElementIndex === null) {
                        this.#editingRuleElementIndex = null;
                        this.render();
                        return;
                    }

                    try {
                        const rules = this.item.toObject().system.rules;
                        rules[this.#editingRuleElementIndex] = JSON.parse(value as string);
                        this.#editingRuleElementIndex = null;
                        this.item.update({ "system.rules": rules });
                    } catch (error) {
                        if (error instanceof Error) {
                            ui.notifications.error(
                                game.i18n.format("PF2E.ErrorMessage.RuleElementSyntax", { message: error.message }),
                            );
                            console.warn("Syntax error in rule element definition.", error.message, value);
                            throw error;
                        }
                    }
                });
        }

        // Activate rule element sub forms
        const ruleSections = html.querySelectorAll<HTMLElement>(".rules .rule-form");
        for (const ruleSection of Array.from(ruleSections)) {
            const idx = ruleSection.dataset.idx ? Number(ruleSection.dataset.idx) : NaN;
            this.#ruleElementForms.at(idx)?.activateListeners(ruleSection);
        }

        InlineRollLinks.listen(html, this.item);

        // Set up traits selection in the header
        const { validTraits } = this;
        const tagElement = html.querySelector(".sheet-header .tags");
        const traitsPrepend = html.querySelector<HTMLTemplateElement>(".traits-extra");
        if (validTraits !== null && tagElement instanceof HTMLInputElement) {
            const tags = tagify(tagElement, { whitelist: validTraits });
            if (traitsPrepend) {
                tags.DOM.scope.prepend(traitsPrepend.content);
            }
        } else if (tagElement && traitsPrepend) {
            // If there are no traits, we still need to show elements like rarity
            tagElement.append(traitsPrepend.content);
        }

        // Tagify other-tags input if present
        tagify(htmlQuery<HTMLInputElement>(html, 'input[type=text][name="system.traits.otherTags"]'), { maxTags: 6 });

        // Handle select and input elements that show modified prepared values until focused
        const modifiedPropertyFields = htmlQueryAll<HTMLSelectElement | HTMLInputElement>(html, "[data-property]");
        for (const input of modifiedPropertyFields) {
            const propertyPath = input.dataset.property ?? "";
            const baseValue =
                input.dataset.valueBase ?? String(getProperty(this.item._source, propertyPath) ?? "").trim();

            input.addEventListener("focus", () => {
                input.dataset.value = input.value;
                input.value = baseValue;
                input.name = propertyPath;
            });

            input.addEventListener("blur", () => {
                input.removeAttribute("name");
                if (input.value === baseValue) {
                    input.value = input.dataset.value ?? "";
                }
            });
        }

        // Lore items
        htmlQuery(html, ".add-skill-variant")?.addEventListener("click", (): void => {
            if (!this.item.isOfType("lore")) return;
            const variants = this.item.system.variants ?? {};
            const index = Object.keys(variants).length;
            this.item.update({
                [`system.variants.${index}`]: { label: "+X in terrain", options: "" },
            });
        });

        for (const button of htmlQueryAll(html, ".skill-variants .remove-skill-variant")) {
            button.addEventListener("click", (event): void => {
                if (!(event.currentTarget instanceof HTMLElement)) return;
                const index = event.currentTarget.dataset.skillVariantIndex;
                this.item.update({ [`system.variants.-=${index}`]: null });
            });
        }

        // Add a link to add GM notes
        if (
            this.isEditable &&
            game.user.isGM &&
            !this.item.system.description.gm &&
            !(this.item.isOfType("spell") && this.item.isVariant)
        ) {
            const descriptionEditors = htmlQuery(html, ".tab[data-tab=description]");
            const mainEditor = htmlQuery(descriptionEditors, ".main .editor");
            if (!mainEditor) throw ErrorPF2e("Unexpected error retrieving description editor");

            const addGMNotesLink = document.createElement("a");
            addGMNotesLink.className = addGMNotesLink.dataset.action = "add-gm-notes";
            addGMNotesLink.innerHTML = fontAwesomeIcon("fa-note-medical", { style: "regular" }).outerHTML;
            addGMNotesLink.dataset.tooltip = "PF2E.Item.GMNotes.Add";
            mainEditor.prepend(addGMNotesLink);
            addGMNotesLink.addEventListener("click", () => {
                htmlQuery(descriptionEditors, ".gm-notes")?.classList.add("has-content");
                this.activateEditor("system.description.gm");
            });
        }

        // Allow drag/drop sorting of rule elements
        const rules = htmlQuery(html, ".rule-element-forms");
        if (rules) {
            Sortable.create(rules, {
                ...SORTABLE_DEFAULTS,
                handle: ".drag-handle",
                onEnd: async (event) => {
                    const currentIndex = event.oldDraggableIndex;
                    const newIndex = event.newDraggableIndex;
                    if (currentIndex === undefined || newIndex === undefined) {
                        this.render();
                        return;
                    }

                    // Update rules. If the update returns undefined, there was no change, and we need to re-render manually
                    const rules = this.item.toObject().system.rules;
                    const movingRule = rules.at(currentIndex);
                    if (movingRule && newIndex <= rules.length) {
                        rules.splice(currentIndex, 1);
                        rules.splice(newIndex, 0, movingRule);
                        const result = await this.item.update({ "system.rules": rules });
                        if (!result) this.render();
                    } else {
                        this.render();
                    }
                },
            });
        }
    }

    protected override _getSubmitData(updateData: Record<string, unknown> | null = null): Record<string, unknown> {
        // create the expanded update data object
        const fd = new FormDataExtended(this.form, { editors: this.editors });
        const data: Record<string, unknown> & { system?: { rules?: string[] } } = updateData
            ? mergeObject(fd.object, updateData)
            : expandObject(fd.object);

        const flattenedData = flattenObject(data);
        processTagifyInSubmitData(this.form, flattenedData);
        return flattenedData;
    }

    /** Add button to refresh from compendium if setting is enabled. */
    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();

        if (
            (BUILD_MODE === "development" || game.settings.get("pf2e", "dataTools")) &&
            this.isEditable &&
            this.item.sourceId?.startsWith("Compendium.") &&
            (this.actor || !this.item.uuid.startsWith("Compendium."))
        ) {
            buttons.unshift({
                label: "Refresh",
                class: "refresh-from-compendium",
                icon: "fa-solid fa-sync-alt",
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
        { updateData = null, preventClose = false, preventRender = false }: OnSubmitFormOptions = {},
    ): Promise<Record<string, unknown> | false> {
        for (const input of htmlQueryAll<HTMLInputElement>(this.form, "tags ~ input")) {
            if (input.value === "") input.value = "[]";
        }

        return super._onSubmit(event, { updateData, preventClose, preventRender });
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const expanded = expandObject(formData) as DeepPartial<ItemSourcePF2e>;

        // If the submission is coming from a rule element, update that rule element
        // This avoids updates from forms if that form has a problematic implementation
        const form = htmlClosest(event.target, ".rule-form[data-idx]");
        if (form) {
            const idx = Number(form.dataset.idx);
            const ruleForm = this.#ruleElementForms[idx];
            const itemRules = this.item.toObject().system.rules;
            if (idx >= itemRules.length || !ruleForm) {
                throw ErrorPF2e(`Invalid rule form update, no rule form available at index ${idx}`);
            }

            const incomingData = expanded.system?.rules?.[idx];
            if (incomingData) {
                ruleForm.updateObject(incomingData);
                itemRules[idx] = ruleForm.rule;
                this.item.update({ "system.rules": itemRules });
            }
        }

        // Remove rules from submit data, it should be handled by the previous check
        delete expanded.system?.rules;

        return super._updateObject(event, flattenObject(expanded));
    }

    /** Overriden _render to maintain focus on tagify elements */
    protected override async _render(force?: boolean, options?: RenderOptions): Promise<void> {
        await maintainFocusInRender(this, () => super._render(force, options));

        // Maintain last rules panel scroll position when opening/closing the codemirror editor
        if (this.#editingRuleElementIndex === null && this.#rulesLastScrollTop) {
            const html = this.element[0];
            const rulesTab = htmlQuery(html, ".tab[data-tab=rules]");
            if (rulesTab) {
                rulesTab.scrollTop = this.#rulesLastScrollTop;
            }
            this.#rulesLastScrollTop = null;
        }
    }
}

interface ItemSheetDataPF2e<TItem extends ItemPF2e> extends ItemSheetData<TItem> {
    /** The item type label that shows at the top right (for example, "Feat" for "Feat 6") */
    itemType: string | null;
    showTraits: boolean;
    /** Whether the sheet should have a sidebar at all */
    hasSidebar: boolean;
    /** The sidebar's current title */
    sidebarTitle: string;
    sidebarTemplate: string;
    detailsTemplate: string;
    item: TItem;
    data: TItem["system"];
    fieldIdPrefix: string;
    enrichedContent: Record<string, string>;
    isPhysical: boolean;
    user: { isGM: boolean };
    enabledRulesUI: boolean;
    ruleEditing: boolean;
    rarity: Rarity | null;
    rarities: ConfigPF2e["PF2E"]["rarityTraits"];
    traits: SheetOptions | null;
    traitTagifyData: TraitTagifyEntry[] | null;
    rules: {
        selection: {
            selected: string | null;
            types: Record<string, string>;
        };
        elements: {
            template: string;
        }[];
    };
    /** Lore only, will be removed later */
    proficiencies: ConfigPF2e["PF2E"]["proficiencyLevels"];
}

export { ItemSheetPF2e };
export type { ItemSheetDataPF2e };
