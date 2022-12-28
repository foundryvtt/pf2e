import { ItemPF2e } from "@item";
import { DropCanvasDataPF2e } from "@module/canvas/drop-canvas-data";
import {
    PickableThing,
    PickAThingConstructorArgs,
    PickAThingPrompt,
    PromptTemplateData,
} from "@module/apps/pick-a-thing-prompt";
import { PredicatePF2e } from "@system/predication";
import { ErrorPF2e } from "@util";

/** Prompt the user for a selection among a set of options */
export class ChoiceSetPrompt extends PickAThingPrompt<string | number | object> {
    /** Does this choice set contain UUIDs? If true, options are always buttons and an item-drop zone is added */
    private containsUUIDs: boolean;

    /** The prompt statement to present the user in this application's window */
    prompt: string;

    /** A predicate validating a dragged & dropped item selection */
    allowedDrops: { label: string | null; predicate: PredicatePF2e };

    constructor(data: ChoiceSetPromptData) {
        super(data);
        this.prompt = data.prompt;
        this.choices = data.choices ?? [];
        this.allowedDrops = data.allowedDrops;
        this.containsUUIDs = data.containsUUIDs;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["choice-set-prompt"],
            dragDrop: [{ dropSelector: ".drop-zone" }],
        };
    }

    override get template(): string {
        return "systems/pf2e/templates/system/rules-elements/choice-set-prompt.hbs";
    }

    override async getData(options: Partial<ApplicationOptions> = {}): Promise<ChoiceSetTemplateData> {
        return {
            ...(await super.getData(options)),
            prompt: this.prompt,
            containsUUIDs: this.containsUUIDs,
            allowNoSelection: this.allowNoSelection,
            selectMenu: this.choices.length > 9,
        };
    }

    protected override getChoices(): PickableThing[] {
        return this.choices;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find("button[data-action=close]").on("click", () => {
            this.close();
        });

        $html.find("i.fas").tooltipster({ theme: "crb-hover" });
    }

    /** Return early if there is only one choice */
    override async resolveSelection(): Promise<PickableThing<string | number | object> | null> {
        const firstChoice = this.choices.at(0);
        if (!this.containsUUIDs && firstChoice && this.choices.length === 1) {
            return (this.selection = firstChoice);
        }

        // Exit early if there are no valid choices
        if (this.choices.length === 0 && !this.containsUUIDs) {
            await this.close({ force: true });
            return null;
        }

        return super.resolveSelection();
    }

    /** Handle a dropped homebrew item */
    override async _onDrop(event: ElementDragEvent): Promise<void> {
        event.preventDefault();
        const dataString = event.dataTransfer?.getData("text/plain");
        const dropData: DropCanvasDataPF2e<"Item"> | undefined = JSON.parse(dataString ?? "");
        if (dropData?.type !== "Item") {
            ui.notifications.error("Only an item can be dropped here.");
            return;
        }
        const droppedItem = await ItemPF2e.fromDropData(dropData);
        if (!droppedItem) throw ErrorPF2e("Unexpected error resolving drop");

        const isAllowedDrop = this.allowedDrops.predicate.test(droppedItem.getRollOptions("item"));
        if (!isAllowedDrop) {
            ui.notifications.error(
                game.i18n.format("PF2E.Item.ABC.InvalidDrop", {
                    badType: droppedItem.name,
                    goodType: game.i18n.localize(this.allowedDrops.label ?? ""),
                })
            );
            return;
        }

        // Drop accepted: Add to button list or select menu
        const newChoice = { value: droppedItem.uuid, label: droppedItem.name };
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
            const $newButton = $("<button>")
                .attr({ type: "button" })
                .addClass("with-image")
                .val(choicesLength - 1)
                .append($("<img>").attr({ src: droppedItem.img }), $("<span>").text(droppedItem.name));

            $newButton.on("click", (event) => {
                this.selection = this.getSelection(event.originalEvent!) ?? null;
                this.close();
            });

            if (dropZone) $(dropZone).replaceWith($newButton);
        }
    }

    override _canDragDrop(): boolean {
        return this.actor.isOwner;
    }
}

interface ChoiceSetPromptData extends PickAThingConstructorArgs<string | number | object> {
    prompt: string;
    choices?: PickableThing[];
    containsUUIDs: boolean;
    allowedDrops: { label: string | null; predicate: PredicatePF2e };
}

interface ChoiceSetTemplateData extends PromptTemplateData {
    prompt: string;
    choices: PickableThing[];
    containsUUIDs: boolean;
    allowNoSelection: boolean;
}
