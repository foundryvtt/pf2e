import type { ActorPF2e } from "@actor";
import type { HandlebarsRenderOptions } from "@client/applications/api/handlebars-application.d.mts";
import { ItemPF2e } from "@item";
import {
    PickableThing,
    PickAThingConstructorArgs,
    PickAThingPrompt,
    PromptTemplateData,
} from "@module/apps/pick-a-thing-prompt.ts";
import type { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import type { Predicate } from "@system/predication.ts";
import { createHTMLElement, ErrorPF2e, htmlQuery, sluggify } from "@util";
import { UUIDUtils } from "@util/uuid.ts";

/** Prompt the user for a selection among a set of options */
class ChoiceSetPrompt extends PickAThingPrompt<ItemPF2e<ActorPF2e>, string | number | object> {
    /** The prompt statement to present the user in this application's window */
    prompt: string;

    /** Does this choice set contain items? If true, an item-drop zone may be added */
    containsItems: boolean;

    /** A predicate validating a dragged & dropped item selection */
    allowedDrops: { label: string | null; predicate: Predicate } | null;

    constructor(data: ChoiceSetPromptData) {
        super(data);
        this.prompt = data.prompt;
        this.choices = data.choices ?? [];
        this.containsItems = data.containsItems;
        this.allowedDrops = this.containsItems ? data.allowedDrops : null;
    }

    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        window: {
            contentClasses: ["choice-set-prompt"],
        },
        actions: {
            close: ChoiceSetPrompt.#onClickClose,
            viewItem: ChoiceSetPrompt.#onClickViewItem,
        },
    };

    static override PARTS: Record<string, fa.api.HandlebarsTemplatePart> = {
        base: { template: "systems/pf2e/templates/system/rules-elements/choice-set-prompt.hbs", root: true },
    };

    static #onClickClose(this: ChoiceSetPrompt): void {
        this.close();
    }

    static async #onClickViewItem(this: ChoiceSetPrompt, event: PointerEvent): Promise<void> {
        if (!this.containsItems) return;
        const choice = this.getSelection(event);
        if (!choice || !UUIDUtils.isItemUUID(choice.value)) return;
        const item = await fromUuid(choice.value);
        item?.sheet.render(true);
    }

    override async _prepareContext(): Promise<ChoiceSetTemplateData> {
        return {
            ...(await super._prepareContext()),
            choices: this.choices.map((c, index) => ({
                ...c,
                value: index,
                hasUUID: UUIDUtils.isItemUUID(c.value),
            })),
            prompt: this.prompt,
            includeDropZone: !!this.allowedDrops,
            allowNoSelection: this.allowNoSelection,
            selectMenu: this.choices.length > 9,
            containsItems: this.containsItems,
        };
    }

    protected override async _onRender(context: object, options: HandlebarsRenderOptions): Promise<void> {
        await super._onRender(context, options);
        const html = this.element;

        if (this.selectMenu) {
            const button = htmlQuery(html, "button[data-action=viewItem]");
            if (!button) return;
            const updateButton = (disable: boolean, value = ""): void => {
                button.dataset.value = value;
                button.classList.toggle("disabled", disable);
                button.dataset.tooltip = game.i18n.localize(
                    disable
                        ? "PF2E.UI.RuleElements.ChoiceSet.ViewItem.Disabled"
                        : "PF2E.UI.RuleElements.ChoiceSet.ViewItem.Tooltip",
                );
            };

            this.selectMenu.on("change", (event) => {
                const data = event.detail.tagify.value.at(0);
                if (!data) {
                    return updateButton(true);
                }
                const index = Number(data.value);
                if (!isNaN(index)) {
                    const choice = this.choices.at(index);
                    if (UUIDUtils.isItemUUID(choice?.value)) {
                        updateButton(false, data.value);
                    } else {
                        updateButton(true);
                    }
                }
            });
        }

        if (this.allowedDrops) {
            htmlQuery(html, ".drop-zone")?.addEventListener("drop", this._onDrop.bind(this));
        }
    }

    /** Return early if there is only one choice */
    override async resolveSelection(): Promise<PickableThing<string | number | object> | null> {
        const firstChoice = this.choices.at(0);
        if (!this.allowedDrops && firstChoice && this.choices.length === 1) {
            return (this.selection = firstChoice);
        }

        // Exit early if there are no valid choices
        if (this.choices.length === 0 && !this.allowedDrops) {
            ui.notifications.warn(
                game.i18n.format("PF2E.UI.RuleElements.Prompt.NoValidOptions", {
                    actor: this.actor.name,
                    item: this.item.name,
                }),
            );
            this.close();
            return null;
        }

        return super.resolveSelection();
    }

    protected override _onClose(options: fa.ApplicationClosingOptions): void {
        if (this.choices.length > 0 && !this.selection && !this.allowNoSelection) {
            ui.notifications.warn(
                game.i18n.format("PF2E.UI.RuleElements.Prompt.NoSelectionMade", { item: this.item.name }),
            );
        }

        return super._onClose(options);
    }

    /** Handle a dropped homebrew item */
    protected async _onDrop(event: DragEvent): Promise<void> {
        event.preventDefault();
        if (!this.actor.isOwner) return;

        const dataString = event.dataTransfer?.getData("text/plain");
        const dropData: DropCanvasItemDataPF2e | undefined = JSON.parse(dataString ?? "");
        if (dropData?.type !== "Item") {
            ui.notifications.error("Only an item can be dropped here.");
            return;
        }
        const droppedItem = await ItemPF2e.fromDropData(dropData);
        if (!droppedItem) throw ErrorPF2e("Unexpected error resolving drop");

        const isAllowedDrop = !!this.allowedDrops?.predicate.test(droppedItem.getRollOptions("item"));
        if (this.allowedDrops && !isAllowedDrop) {
            ui.notifications.error(
                game.i18n.format("PF2E.Item.ABC.InvalidDrop", {
                    badType: droppedItem.name,
                    goodType: game.i18n.localize(this.allowedDrops.label ?? ""),
                }),
            );
            return;
        }

        // Drop accepted: Add to button list or select menu
        const slugsAsValues =
            this.containsItems && this.choices.length > 0 && this.choices.every((c) => !UUIDUtils.isItemUUID(c.value));

        const newChoice = {
            value: slugsAsValues ? (droppedItem.slug ?? sluggify(droppedItem.id)) : droppedItem.uuid,
            label: droppedItem.name,
        };
        const choicesLength = this.choices.push(newChoice);

        const prompt = document.querySelector<HTMLElement>(`#${this.id}`);
        const dropZone = prompt?.querySelector(".drop-zone");
        if (!prompt) throw ErrorPF2e("Unexpected error retrieving ChoiceSet dialog");

        // The dialog will resize when the following DOM change occurs, so allow it to dynamically adjust
        prompt.style.height = "unset";

        if (this.selectMenu) {
            // SELECT MENU
            const { whitelist } = this.selectMenu.settings;
            const menuChoice = { value: String(choicesLength - 1), label: newChoice.label };
            // Assert to accommodate impossible type specified by Tagify
            whitelist?.push(menuChoice.value as string & { label: string; value: string });

            this.selectMenu.setPersistedData(whitelist, "whitelist");
            this.selectMenu.addTags([menuChoice], true, true);
            this.selectMenu.setReadonly(true);

            dropZone?.remove();
        } else {
            // BUTTON LIST
            const img = document.createElement("img");
            img.src = droppedItem.img;
            const newButton = createHTMLElement("button", {
                classes: ["with-image"],
                children: [img, createHTMLElement("span", { children: [droppedItem.name] })],
                dataset: { action: "pick" },
            });
            newButton.type = "button";
            newButton.value = String(choicesLength - 1);

            newButton.addEventListener("click", (event) => {
                this.selection = this.getSelection(event) ?? null;
                this.close();
            });

            dropZone?.replaceWith(newButton);
        }
    }
}

interface ChoiceSetPrompt extends PickAThingPrompt<ItemPF2e<ActorPF2e>, string | number | object> {
    getSelection(event: PointerEvent): ChoiceSetChoice | null;
}

interface ChoiceSetPromptData extends PickAThingConstructorArgs<ItemPF2e<ActorPF2e>, string | number | object> {
    prompt: string;
    containsItems: boolean;
    allowedDrops: { label: string | null; predicate: Predicate } | null;
}

interface ChoiceSetChoice extends PickableThing {
    hasUUID: boolean;
}

interface ChoiceSetTemplateData extends PromptTemplateData {
    prompt: string;
    choices: ChoiceSetChoice[];
    /** Whether to use a select menu instead of a column of buttons */
    selectMenu: boolean;
    includeDropZone: boolean;
    allowNoSelection: boolean;
    containsItems: boolean;
}

export { ChoiceSetPrompt };
