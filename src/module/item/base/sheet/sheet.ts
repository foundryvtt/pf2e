import type { FormSelectOption } from "@client/applications/forms/fields.d.mts";
import type { ProseMirrorEditor } from "@client/applications/ux/_module.d.mts";
import type { ApplicationV1HeaderButton, AppV1RenderOptions } from "@client/appv1/api/application-v1.d.mts";
import type { DataField } from "@common/data/fields.d.mts";
import { ItemPF2e } from "@item";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { Rarity } from "@module/data.ts";
import { RuleElements, RuleElementSource } from "@module/rules/index.ts";
import {
    createSheetTags,
    createTagifyTraits,
    maintainFocusInRender,
    SheetOptions,
    TagifyEntry,
} from "@module/sheet/helpers.ts";
import type { HTMLTagifyTagsElement } from "@system/html-elements/tagify-tags.ts";
import {
    BasicConstructorOptions,
    LanguageSelector,
    SELECTABLE_TAG_FIELDS,
    SelectableTagField,
    TagSelectorBasic,
} from "@system/tag-selector/index.ts";
import {
    createHTMLElement,
    ErrorPF2e,
    fontAwesomeIcon,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    sluggify,
    SORTABLE_BASE_OPTIONS,
    sortStringRecord,
    tupleHasValue,
} from "@util";
import { createSortable } from "@util/destroyables.ts";
import { tagify } from "@util/tags.ts";
import type { Plugin } from "prosemirror-state";
import * as R from "remeda";
import { ItemSystemModel } from "../data/model.ts";
import { CodeMirror } from "./codemirror.ts";
import { RULE_ELEMENT_FORMS, RuleElementForm } from "./rule-element-form/index.ts";

class ItemSheetPF2e<TItem extends ItemPF2e> extends fav1.sheets.ItemSheet<TItem, ItemSheetOptions> {
    constructor(item: TItem, options: Partial<fav1.sheets.ItemSheetData<TItem>> = {}) {
        super(item, options);
        this.options.classes.push(this.item.type);
    }

    /** Ignore deprecation warning */
    protected static override _warnedAppV1 = true;

    static override get defaultOptions(): ItemSheetOptions {
        const options = super.defaultOptions;
        options.classes.push("pf2e", "item");

        return {
            ...options,
            width: 700,
            height: 460,
            template: "systems/pf2e/templates/items/sheet.hbs",
            scrollY: [".tab.active", ".inventory-details", "div[data-rule-tab]"],
            tabs: [
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
            ],
            hasSidebar: false,
        };
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

    protected get validTraits(): Record<string, string> {
        return this.item.constructor.validTraits;
    }

    /** An alternative to super.getData() for subclasses that don't need this class's `getData` */
    override async getData(options: Partial<ItemSheetOptions> = {}): Promise<ItemSheetDataPF2e<TItem>> {
        options.id = this.id;
        options.editable = this.isEditable;
        options.sheetConfig &&=
            Object.values(CONFIG.Item.sheetClasses[this.item.type]).filter((c) => c.canConfigure).length > 1;

        const { item } = this;
        this.#createRuleElementForms();

        // Enrich content
        const enrichedContent: Record<string, string> = {};

        // Get the source description in case this is an unidentified physical item
        const description = await item.getDescription({ includeAddendum: false, secrets: item.isOwner });
        enrichedContent.description = description.value;
        enrichedContent.gmNotes = description.gm;

        const validTraits = this.validTraits;
        const hasRarity = !item.isOfType("action", "condition", "deity", "effect", "lore", "melee");
        const itemTraits = item.system.traits?.value ?? [];
        const sourceTraits = item._source.system.traits?.value ?? [];
        const traits = validTraits ? createSheetTags(validTraits, itemTraits) : null;
        const traitTagifyData = validTraits
            ? createTagifyTraits(itemTraits, { sourceTraits, record: validTraits })
            : null;
        const otherTagsTagifyData = createTagifyTraits(item.system.traits.otherTags, {
            sourceTraits: item._source.system.traits.otherTags,
        });

        return {
            itemType: null,
            showTraits: !R.isEmpty(this.validTraits),
            sidebarTitle: game.i18n.format("PF2E.Item.SidebarSummary", {
                type: game.i18n.localize(`TYPES.Item.${this.item.type}`),
            }),
            sidebarTemplate: options.hasSidebar
                ? `systems/pf2e/templates/items/${sluggify(item.type)}-sidebar.hbs`
                : null,
            detailsTemplate: `systems/pf2e/templates/items/${sluggify(item.type)}-details.hbs`,
            cssClass: this.isEditable ? "editable" : "locked",
            editable: this.isEditable,
            document: item,
            item,
            isPhysical: false,
            data: item.system,
            systemFields: this.item.system instanceof ItemSystemModel ? this.item.system.schema.fields : {},
            fieldRootId: this.item.collection?.has(this.item.id) ? this.id : fu.randomID(),
            fieldIdPrefix: `field-${this.appId}-`,
            enrichedContent,
            limited: this.item.limited,
            options: this.options,
            owner: this.item.isOwner,
            title: this.title,
            user: { isGM: game.user.isGM },
            rarity: hasRarity ? (this.item.system.traits?.rarity ?? "common") : null,
            rarities: CONFIG.PF2E.rarityTraits,
            traits,
            traitTagifyData,
            otherTagsTagifyData,
            enabledRulesUI: game.user.hasRole(game.settings.get("pf2e", "minimumRulesUI")),
            ruleEditing: !!this.editingRuleElement,
            rules: {
                selection: {
                    selected: this.#selectedRuleElementType,
                    types: sortStringRecord(
                        Object.keys(RuleElements.all).reduce(
                            (result: Record<string, string>, key) =>
                                fu.mergeObject(result, { [key]: `PF2E.RuleElement.${key}` }),
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
            proficiencyRanks: CONFIG.PF2E.proficiencyLevels, // lore only, will be removed later
            publicationLicenses: [
                { label: "PF2E.Publication.License.OGL", value: "OGL" },
                { label: "PF2E.Publication.License.ORC", value: "ORC" },
            ],
            rootId: this.id,
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
                previousForms.find((f) => R.isDeepEqual(f.rule, rule) && f.constructor.name === FormClass.name) ?? null;
            if (existing) {
                previousForms.splice(previousForms.indexOf(existing), 1);
            }
            return { options, FormClass, existing };
        });

        // Second pass, if any unmatched rule has a form in the exact position that fits, reuse that one
        // We have to account for re-ordering when fetching the existing form
        for (const rule of processedRules.filter((r) => !r.existing)) {
            const existing = this.#ruleElementForms.at(rule.options.index);
            const alreadyMatched = processedRules.some((r) => r.existing === existing);
            if (existing?.constructor.name === rule.FormClass.name && !alreadyMatched) {
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
        if (!["basic", "languages"].includes(selectorType)) {
            throw ErrorPF2e("Item sheets can only use the basic tag selector");
        }
        const objectProperty = anchor.dataset.property ?? "";
        const configTypes = (anchor.dataset.configTypes ?? "")
            .split(",")
            .map((type) => type.trim())
            .filter((tag): tag is SelectableTagField => tupleHasValue(SELECTABLE_TAG_FIELDS, tag));
        const options: BasicConstructorOptions = {
            objectProperty,
            configTypes,
            title: anchor.dataset.title,
            flat: anchor.dataset.flat === "true",
        };

        if (this.actor && configTypes.includes("attackEffects")) {
            options.customChoices = this.getAttackEffectOptions();
        }

        const SelectorClass = selectorType === "languages" ? LanguageSelector : TagSelectorBasic;
        new SelectorClass(this.item, options).render(true);
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
            }, fu.deepClone(CONFIG.PF2E.attackEffects));
    }

    override async activateEditor(
        name: string,
        options: { engine?: "prosemirror" | "tinymce" } = {},
        initialContent = "",
    ): Promise<TinyMCE.Editor | ProseMirrorEditor> {
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

            // Remove other edit button. Will be restored by editor save rerender
            if (name === "system.description.value") {
                htmlQuery(html, "a[data-action=add-gm-notes]")?.remove();
            } else if (name === "system.description.gm") {
                htmlQuery(html, "a.editor-edit")?.remove();
            }

            htmlQuery(html, ".tab.description")?.classList.add("editing");
        }

        return super.activateEditor(name, options, sourceContent);
    }

    override async close(options?: { force?: boolean }): Promise<void> {
        this.#editingRuleElementIndex = null;
        return super.close(options);
    }

    protected override _configureProseMirrorPlugins(
        name: string,
        options: { remove?: boolean },
    ): Record<string, Plugin> {
        const plugins = super._configureProseMirrorPlugins(name, options);
        plugins.menu = foundry.prosemirror.ProseMirrorMenu.build(foundry.prosemirror.defaultSchema, {
            destroyOnSave: options.remove,
            onSave: () => this.saveEditor(name, options),
            compact: this.options.hasSidebar,
        });
        return plugins;
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

                slugInput.value = sluggify(this.item._source.name);
                const event = new Event("change");
                slugInput.dispatchEvent(event);
            });
        }

        const ruleElementSelect = htmlQuery<HTMLSelectElement>(rulesPanel, "select[data-action=select-rule-element]");
        ruleElementSelect?.addEventListener("change", () => {
            this.#selectedRuleElementType = ruleElementSelect.value;
        });

        // Add implementation for viewing an item's roll options
        const viewRollOptionsElement = htmlQuery(rulesPanel, "a[data-action=view-roll-options]");
        viewRollOptionsElement?.addEventListener("click", async () => {
            const path = "systems/pf2e/templates/system/roll-options-tooltip.hbs";
            const content = await fa.handlebars.renderTemplate(path, {
                description: game.i18n.localize("PF2E.Item.Rules.Hint.RollOptions"),
                rollOptions: R.sortBy(this.item.getRollOptions("item").sort(), (o) => o.includes(":")),
            });
            game.tooltip.dismissLockedTooltips();
            game.tooltip.activate(viewRollOptionsElement, {
                html: createHTMLElement("div", { innerHTML: content }),
                locked: true,
            });
        });

        for (const anchor of htmlQueryAll(rulesPanel, "a[data-action=add-rule-element]")) {
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
                const index = Number(anchor.dataset.ruleIndex ?? "NaN");
                this.#editingRuleElementIndex = Number.isInteger(index) ? index : null;
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

            html.querySelector<HTMLButtonElement>(".rule-editing button[data-action=apply]")?.addEventListener(
                "click",
                () => {
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
                },
            );
        }

        // Activate rule element sub forms
        const ruleSections = html.querySelectorAll<HTMLElement>(".rules .rule-form");
        for (const ruleSection of Array.from(ruleSections)) {
            const idx = ruleSection.dataset.idx ? Number(ruleSection.dataset.idx) : NaN;
            this.#ruleElementForms.at(idx)?.activateListeners(ruleSection);
        }

        // Set up traits selection in the header
        const { validTraits } = this;
        const tagElement = htmlQuery<HTMLTagifyTagsElement>(this.form, ":scope > header tagify-tags");
        const traitsPrepend = html.querySelector<HTMLTemplateElement>(".traits-extra");
        if (validTraits !== null && tagElement) {
            const tags = tagify(tagElement, { whitelist: validTraits });
            if (traitsPrepend) {
                tags.DOM.scope.prepend(traitsPrepend.content);
            }
        } else if (traitsPrepend) {
            // If there are no traits, we still need to show elements like rarity
            htmlQuery(html, "div.paizo-style.tags")?.append(traitsPrepend.content);
        }

        // Tagify other-tags input if present
        tagify(htmlQuery<HTMLTagifyTagsElement>(html, 'tagify-tags[name="system.traits.otherTags"]'), { maxTags: 6 });

        // Handle select and input elements that show modified prepared values until focused
        const modifiedPropertyFields = html.querySelectorAll<HTMLSelectElement | HTMLInputElement>(
            "input[data-property], select[data-property]",
        );
        for (const input of modifiedPropertyFields) {
            const propertyPath = input.dataset.property ?? "";
            const baseValue =
                input.dataset.valueBase ?? String(fu.getProperty(this.item._source, propertyPath) ?? "").trim();

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
            createSortable(rules, {
                ...SORTABLE_BASE_OPTIONS,
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

        const refreshAnchor = htmlQuery(html.closest("div.item.sheet"), "a.refresh-from-compendium");
        if (refreshAnchor) {
            if (
                this.item.system.rules.some(
                    (r) => typeof r.key === "string" && ["ChoiceSet", "GrantItem"].includes(r.key),
                )
            ) {
                refreshAnchor.classList.add("disabled");
                refreshAnchor.dataset.tooltip = "PF2E.Item.RefreshFromCompendium.Tooltip.Disabled";
            } else {
                refreshAnchor.dataset.tooltip = "PF2E.Item.RefreshFromCompendium.Tooltip.Enabled";
            }
        }

        // View a referenced item
        for (const link of htmlQueryAll(html, "a[data-action=view-item]")) {
            link.addEventListener("click", async (): Promise<void> => {
                const uuid = htmlClosest(link, "li")?.dataset.uuid ?? "";
                const item = await fromUuid(uuid);
                if (!(item instanceof ItemPF2e)) {
                    this.render(false);
                    ui.notifications.error(`An item with the UUID "${uuid}" no longer exists`);
                    return;
                }

                item.sheet.render(true);
            });
        }
    }

    /** Add button to refresh from compendium if setting is enabled. */
    protected override _getHeaderButtons(): ApplicationV1HeaderButton[] {
        const buttons = super._getHeaderButtons();

        if (
            this.isEditable &&
            this.item.sourceId?.startsWith("Compendium.") &&
            (this.actor || !this.item.uuid.startsWith("Compendium."))
        ) {
            buttons.unshift({
                label: "PF2E.Item.RefreshFromCompendium.Label",
                class: "refresh-from-compendium",
                icon: "fa-solid fa-rotate",
                onclick: () => {
                    const enabled = !this.item.system.rules.some(
                        (r) => typeof r.key === "string" && ["ChoiceSet", "GrantItem"].includes(r.key),
                    );
                    if (enabled) this.item.refreshFromCompendium();
                },
            });
        }

        return buttons;
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const expanded = fu.expandObject(formData) as DeepPartial<ItemSourcePF2e>;

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
                ruleForm.updateObject(incomingData as RuleElementSource);
                itemRules[idx] = ruleForm.rule;
                this.item.update({ "system.rules": itemRules });
            }
        }

        // Remove rules from submit data, it should be handled by the previous check
        delete expanded.system?.rules;

        return super._updateObject(event, fu.flattenObject(expanded));
    }

    /** Overriden _render to maintain focus on tagify elements */
    protected override async _render(force?: boolean, options?: AppV1RenderOptions): Promise<void> {
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

interface ItemSheetDataPF2e<TItem extends ItemPF2e> extends fav1.sheets.ItemSheetData<TItem> {
    /** The item type label that shows at the top right (for example, "Feat" for "Feat 6") */
    itemType: string | null;
    showTraits: boolean;
    /** The sidebar's current title */
    sidebarTitle: string;
    sidebarTemplate: string | null;
    detailsTemplate: string;
    item: TItem;
    data: TItem["system"];
    systemFields: Record<string, DataField>;
    /** The leading part of IDs used for label-input/select matching */
    fieldRootId: string;
    /** Legacy value of the above */
    fieldIdPrefix: string;
    enrichedContent: Record<string, string>;
    isPhysical: boolean;
    user: { isGM: boolean };
    enabledRulesUI: boolean;
    ruleEditing: boolean;
    rarity: Rarity | null;
    rarities: typeof CONFIG.PF2E.rarityTraits;
    traits: SheetOptions | null;
    traitTagifyData: TagifyEntry[] | null;
    otherTagsTagifyData: TagifyEntry[] | null;
    rules: {
        selection: {
            selected: string | null;
            types: Record<string, string>;
        };
        elements: {
            template: string;
        }[];
    };
    publicationLicenses: FormSelectOption[];
    /** Lore only, will be removed later */
    proficiencyRanks: typeof CONFIG.PF2E.proficiencyLevels;
    /** A prefix for label and form elements ids */
    rootId: string;
}

interface ItemSheetOptions extends fav1.api.DocumentSheetV1Options {
    hasSidebar: boolean;
}

export { ItemSheetPF2e };
export type { ItemSheetDataPF2e, ItemSheetOptions };
