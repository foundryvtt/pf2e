import type { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import {
    PickableThing,
    PickAThingConstructorArgs,
    PickAThingPrompt,
    PromptTemplateData,
} from "@module/apps/pick-a-thing-prompt.ts";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import type { PredicatePF2e } from "@system/predication.ts";
import { createHTMLElement, ErrorPF2e, htmlQuery, htmlQueryAll, sluggify } from "@util";
import { UUIDUtils } from "@util/uuid.ts";

/** Prompt the user for a selection among a set of options */
class ChoiceSetPrompt extends PickAThingPrompt<ItemPF2e<ActorPF2e>, string | number | object> {
    /** The prompt statement to present the user in this application's window */
    prompt: string;

    /** Does this choice set contain items? If true, an item-drop zone may be added */
    containsItems: boolean;

    /** A predicate validating a dragged & dropped item selection */
    allowedDrops: { label: string | null; predicate: PredicatePF2e } | null;

    constructor(data: ChoiceSetPromptData) {
        super(data);
        this.prompt = data.prompt;
        this.choices = data.choices ?? [];
        this.containsItems = data.containsItems;
        this.allowedDrops = this.containsItems ? data.allowedDrops : null;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["choice-set-prompt"],
            dragDrop: [{ dropSelector: ".drop-zone" }],
            template: "systems/pf2e/templates/system/rules-elements/choice-set-prompt.hbs",
        };
    }

    override async getData(): Promise<ChoiceSetTemplateData> {
        return {
            ...(await super.getData()),
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

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        htmlQuery(html, "button[data-action=close]")?.addEventListener("click", () => {
            this.close();
        });

        const renderItemSheet = async (choice: ChoiceSetChoice | null): Promise<void> => {
            if (!choice || !UUIDUtils.isItemUUID(choice.value)) return;
            const item = await fromUuid(choice.value);
            item?.sheet.render(true);
        };

        if (this.containsItems) {
            if (this.selectMenu) {
                const itemInfoAnchor = htmlQuery(html, "a[data-action=view-item]");
                if (!itemInfoAnchor) return;

                const updateAnchor = (disable: boolean, value = ""): void => {
                    itemInfoAnchor.dataset.value = value;
                    itemInfoAnchor.classList.toggle("disabled", disable);
                    itemInfoAnchor.dataset.tooltip = game.i18n.localize(
                        disable
                            ? "PF2E.UI.RuleElements.ChoiceSet.ViewItem.Disabled"
                            : "PF2E.UI.RuleElements.ChoiceSet.ViewItem.Tooltip",
                    );
                };

                itemInfoAnchor.addEventListener("click", (event) => {
                    renderItemSheet(this.getSelection(event));
                });

                this.selectMenu.on("change", (event) => {
                    const data = event.detail.tagify.value.at(0);
                    if (!data) {
                        return updateAnchor(true);
                    }
                    const index = Number(data.value);
                    if (!isNaN(index)) {
                        const choice = this.choices.at(index);
                        if (UUIDUtils.isItemUUID(choice?.value)) {
                            updateAnchor(false, data.value);
                        } else {
                            updateAnchor(true);
                        }
                    }
                });
            } else {
                for (const anchor of htmlQueryAll(html, "a[data-action=view-item]")) {
                    anchor.addEventListener("click", (event) => {
                        renderItemSheet(this.getSelection(event));
                    });
                }
            }
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
            this.close({ force: true });
            return null;
        }

        return super.resolveSelection();
    }

    override async close(options?: { force?: boolean }): Promise<void> {
        if (this.choices.length > 0 && !this.selection && !this.allowNoSelection) {
            ui.notifications.warn(
                game.i18n.format("PF2E.UI.RuleElements.Prompt.NoSelectionMade", { item: this.item.name }),
            );
        }

        return super.close(options);
    }

    /** Handle a dropped homebrew item */
    protected override async _onDrop(event: DragEvent): Promise<void> {
        event.preventDefault();
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
            value: slugsAsValues ? droppedItem.slug ?? sluggify(droppedItem.id) : droppedItem.uuid,
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

    protected override _canDragDrop(): boolean {
        return this.actor.isOwner;
    }
}

interface ChoiceSetPrompt extends PickAThingPrompt<ItemPF2e<ActorPF2e>, string | number | object> {
    getSelection(event: MouseEvent): ChoiceSetChoice | null;
}

interface ChoiceSetPromptData extends PickAThingConstructorArgs<ItemPF2e<ActorPF2e>, string | number | object> {
    prompt: string;
    containsItems: boolean;
    allowedDrops: { label: string | null; predicate: PredicatePF2e } | null;
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
