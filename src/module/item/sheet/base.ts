import { ItemSourcePF2e } from "@item/data/index.ts";
import { ItemPF2e } from "@item";
import { RuleElements, RuleElementSource } from "@module/rules/index.ts";
import {
    createSheetTags,
    createTagifyTraits,
    maintainFocusInRender,
    processTagifyInSubmitData,
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
    htmlQuery,
    htmlQueryAll,
    objectHasKey,
    sluggify,
    sortStringRecord,
    tagify,
    tupleHasValue,
} from "@util";
import type * as TinyMCE from "tinymce";
import { CodeMirror } from "./codemirror.ts";
import { ItemSheetDataPF2e } from "./data-types.ts";
import { RULE_ELEMENT_FORMS, RuleElementForm } from "./rule-elements/index.ts";

export class ItemSheetPF2e<TItem extends ItemPF2e> extends ItemSheet<TItem> {
    static override get defaultOptions(): DocumentSheetOptions {
        const options = super.defaultOptions;
        options.width = 695;
        options.height = 460;
        options.classes = options.classes.concat(["pf2e", "item"]);
        options.template = "systems/pf2e/templates/items/sheet.hbs";
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

    get editingRuleElement(): RuleElementSource | null {
        if (this.editingRuleElementIndex === null) return null;
        return this.item.toObject().system.rules[this.editingRuleElementIndex] ?? null;
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

        const { item } = this;
        const rules = item.toObject().system.rules;

        // Enrich content
        const enrichedContent: Record<string, string> = {};
        const rollData = { ...this.item.getRollData(), ...this.actor?.getRollData() };

        // Get the source description in case this is an unidentified physical item
        enrichedContent.description = await TextEditor.enrichHTML(item._source.system.description.value, {
            rollData,
            async: true,
        });
        enrichedContent.gmNotes = await TextEditor.enrichHTML(item.system.description.gm.trim(), {
            rollData,
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

        // Activate rule element sub forms
        this.ruleElementForms = {};
        for (const [index, rule] of rules.entries()) {
            const FormClass = RULE_ELEMENT_FORMS[String(rule.key)] ?? RuleElementForm;
            this.ruleElementForms[Number(index)] = new FormClass({
                item: this.item,
                index,
                rule,
                object: this.item.rules.find((r) => r.sourceIndex === index) ?? null,
            });
        }

        return {
            itemType: null,
            showTraits: this.validTraits !== null,
            hasSidebar: this.item.isOfType("condition", "lore"),
            hasDetails: true,
            sidebarTitle: game.i18n.format("PF2E.Item.SidebarSummary", {
                type: game.i18n.localize(`TYPES.Item.${this.item.type}`),
            }),
            cssClass: this.isEditable ? "editable" : "locked",
            editable: this.isEditable,
            document: item,
            item,
            isPhysical: false,
            data: item.system,
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
                labels: rules.map((ruleData: RuleElementSource) => {
                    const localization = CONFIG.PF2E.ruleElement;
                    const key = String(ruleData.key).replace(/^PF2E\.RuleElement\./, "");
                    const label = game.i18n.localize(
                        localization[key as keyof typeof localization] ?? localization.Unrecognized
                    );
                    const recognized = label !== game.i18n.localize(localization.Unrecognized);
                    return { label, recognized };
                }),
                selection: {
                    selected: this.selectedRuleElementType,
                    types: sortStringRecord(
                        Object.keys(RuleElements.all).reduce(
                            (result: Record<string, string>, key) =>
                                mergeObject(result, { [key]: `PF2E.RuleElement.${key}` }),
                            {}
                        )
                    ),
                },
                elements: await Promise.all(
                    rules.map(async (rule, index) => ({
                        template: await this.ruleElementForms[index].render(),
                        index,
                        rule,
                    }))
                ),
            },
            sidebarTemplate: () => `systems/pf2e/templates/items/${item.type}-sidebar.hbs`,
            detailsTemplate: () => `systems/pf2e/templates/items/${item.type}-details.hbs`,
            proficiencies: CONFIG.PF2E.proficiencyLevels, // lore only, will be removed later
        };
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
        options: Partial<TinyMCE.EditorOptions> = {},
        initialContent?: string
    ): Promise<TinyMCE.Editor> {
        // Ensure the source description is edited rather than a prepared one
        const sourceContent =
            name === "system.description.value" ? this.item._source.system.description.value : initialContent;

        // Remove toolbar options that are unsuitable for a smaller notes field
        if (name === "system.description.gm") {
            options.toolbar = "styles bullist numlist image hr link removeformat code save";
        }

        return super.activateEditor(name, options, sourceContent);
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
            this.selectedRuleElementType = ruleElementSelect.value;
        });

        for (const anchor of htmlQueryAll(rulesPanel, "a.add-rule-element")) {
            anchor.addEventListener("click", async (event) => {
                await this._onSubmit(event); // Submit any unsaved changes
                const rulesData = this.item.toObject().system.rules;
                const key = this.selectedRuleElementType ?? "NewRuleElement";
                this.item.update({ "system.rules": rulesData.concat({ key }) });
            });
        }

        for (const anchor of htmlQueryAll(rulesPanel, "a.edit-rule-element")) {
            anchor.addEventListener("click", async () => {
                if (this._submitting) return; // Don't open if already submitting
                const index = Number(anchor.dataset.ruleIndex ?? "NaN") ?? null;
                this.editingRuleElementIndex = index;
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
                this.editingRuleElementIndex = null;
                this.render();
            });
            closeBtn?.removeAttribute("disabled");

            html.querySelector<HTMLButtonElement>(".rule-editing button[data-action=apply]")?.addEventListener(
                "click",
                () => {
                    const value = view.state.doc.toString();

                    // Close early if the editing index is invalid
                    if (this.editingRuleElementIndex === null) {
                        this.editingRuleElementIndex = null;
                        this.render();
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
                }
            );
        }

        // Activate rule element sub forms
        const ruleSections = html.querySelectorAll<HTMLElement>(".rules .rule-form");
        for (const ruleSection of Array.from(ruleSections)) {
            const idx = ruleSection.dataset.idx ? Number(ruleSection.dataset.idx) : NaN;
            const form = this.ruleElementForms[idx];
            if (form) {
                form.activateListeners(ruleSection);
            }
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

        // Update Tab visibility (in case this is a tab without a sidebar)
        this.updateSidebarVisibility(this._tabs[0].active);

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

        // Tooltipped info circles
        for (const infoCircle of htmlQueryAll(html, "i.fa-info-circle[title]")) {
            if (infoCircle.classList.contains("small")) {
                $(infoCircle).tooltipster({
                    maxWidth: 275,
                    position: "right",
                    theme: "crb-hover",
                    contentAsHTML: true,
                });
            } else if (infoCircle.classList.contains("large")) {
                $(infoCircle).tooltipster({
                    maxWidth: 400,
                    theme: "crb-hover",
                    contentAsHTML: true,
                });
            }
        }

        // Add a link to add GM notes
        if (
            this.isEditable &&
            game.user.isGM &&
            !this.item.system.description.gm &&
            !(this.item.isOfType("spell") && this.item.isVariant)
        ) {
            const descriptionEditors = htmlQuery(html, ".descriptions");
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
    }

    /** When tabs are changed, change visibility of elements such as the sidebar */
    protected override _onChangeTab(event: MouseEvent, tabs: Tabs, active: string): void {
        super._onChangeTab(event, tabs, active);
        this.updateSidebarVisibility(active);
    }

    /** Internal function to update the sidebar visibility based on the current tab */
    private updateSidebarVisibility(activeTab: string) {
        const sidebarHeader = this.element[0]?.querySelector<HTMLElement>(".sidebar-summary");
        const sidebar = this.element[0]?.querySelector<HTMLElement>(".sheet-sidebar");
        if (sidebarHeader && sidebar) {
            sidebarHeader.style.visibility = activeTab === "rules" ? "hidden" : "";
            sidebar.style.display = activeTab === "rules" ? "none" : "";
        }
    }

    protected override _getSubmitData(updateData: Record<string, unknown> = {}): Record<string, unknown> {
        // create the expanded update data object
        const fd = new FormDataExtended(this.form, { editors: this.editors });
        const data: Record<string, unknown> & { system?: { rules?: string[] } } = updateData
            ? mergeObject(fd.object, updateData)
            : expandObject(fd.object);

        const flattenedData = flattenObject(data);
        processTagifyInSubmitData(this.form, flattenedData);
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
        if (
            game.settings.get("pf2e", "dataTools") &&
            this.item.isOwned &&
            this.item.sourceId?.startsWith("Compendium.")
        ) {
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
                const predicateValue = value.predicate;
                if (typeof predicateValue === "string") {
                    if (predicateValue.trim() === "") {
                        delete rules[idx].predicate;
                    } else {
                        try {
                            rules[idx].predicate = JSON.parse(predicateValue);
                        } catch (error) {
                            if (error instanceof Error) {
                                ui.notifications.error(
                                    game.i18n.format("PF2E.ErrorMessage.RuleElementSyntax", { message: error.message })
                                );
                                throw error; // prevent update, to give the user a chance to correct, and prevent bad data
                            }
                        }
                    }
                }
            }

            expanded.system.rules = rules;
        }

        return super._updateObject(event, flattenObject(expanded));
    }

    /** Overriden _render to maintain focus on tagify elements */
    protected override async _render(force?: boolean, options?: RenderOptions): Promise<void> {
        await maintainFocusInRender(this, () => super._render(force, options));
    }
}
