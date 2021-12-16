import { ItemPF2e } from "@item";
import { DropCanvasDataPF2e } from "@module/canvas/drop-canvas-data";
import { PromptChoice, RulesElementPromptData, RulesElementPrompt } from "@module/rules/apps/prompt";
import { PredicatePF2e } from "@system/predication";
import { ErrorPF2e } from "@util";

/** Prompt the user for a selection among a set of options */
export class ChoiceSetPrompt extends RulesElementPrompt<string> {
    /** Does this choice set contain UUIDs? If true, options are always buttons and an item-drop zone is added */
    private containsUUIDs: boolean;

    /** The prompt statement to present the user in this application's window */
    prompt: string;

    /** A predicate validating a dragged & dropped item selection */
    allowedDrops: PredicatePF2e;

    constructor(data: ChoiceSetPromptData) {
        super(data);
        this.prompt = data.prompt ?? "PF2E.UI.RuleElements.ChoiceSet.Prompt";
        this.choices = data.choices ?? [];
        this.allowedDrops = data.allowedDrops;
        this.containsUUIDs = data.containsUUIDs;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            id: "choice-set-prompt",
            width: 250,
            dragDrop: [{ dropSelector: ".drop-zone" }],
        };
    }

    override get template(): string {
        return "systems/pf2e/templates/system/rules-elements/choice-set-prompt.html";
    }

    override async getData(): Promise<ChoiceSetTemplateData> {
        return {
            ...(await super.getData()),
            prompt: this.prompt,
            containsUUIDs: this.containsUUIDs,
        };
    }

    protected override getChoices(): PromptChoice<string>[] {
        return this.choices;
    }

    protected getSelection(event: JQuery.ClickEvent): PromptChoice<string> | null {
        const selection = event.currentTarget.value;
        return this.choices.find((choice) => choice.value === selection) ?? null;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find<HTMLSelectElement>("select").on("change", (event) => {
            const $select = $(event.target);
            const $submit = $html.find<HTMLButtonElement>("button");
            $submit.val(String($select.val()));
        });

        $html.find("i.fas").tooltipster({ theme: "crb-hover" });
    }

    /** Handle a dropped homebrew item */
    override async _onDrop(event: ElementDragEvent): Promise<void> {
        event.preventDefault();
        const dataString = event.dataTransfer?.getData("text/plain");
        const dropData: DropCanvasDataPF2e | undefined = JSON.parse(dataString ?? "");
        if (dropData?.type !== "Item") {
            ui.notifications.error("Only an item can be dropped here.");
            return;
        }
        const droppedItem = await ItemPF2e.fromDropData(dropData);
        if (!droppedItem) throw ErrorPF2e("Unexpected error resolving drop");

        const statements = [droppedItem.getItemRollOptions(), droppedItem.getItemRollOptions("item")].flat();
        const isAllowedDrop = this.allowedDrops.test(statements);
        if (!isAllowedDrop) {
            ui.notifications.error(
                game.i18n.format("PF2E.Item.ABC.InvalidDrop", {
                    badType: droppedItem.name,
                    goodType: game.i18n.localize(this.allowedDrops.label ?? ""),
                })
            );
            return;
        }

        // Drop accepted: create a new button and replace the drop zone with it
        this.choices.push({ value: droppedItem.uuid, label: droppedItem.name });

        $("#choice-set-prompt").css({ height: "unset" });
        const $dropZone = this.element.find(".drop-zone");
        const $newButton = $("<button>")
            .attr({ type: "button" })
            .addClass("with-image")
            .val(droppedItem.uuid)
            .append($("<img>").attr({ src: droppedItem.img }), $("<span>").text(droppedItem.name));

        $newButton.on("click", (event) => {
            this.selection = this.getSelection(event) ?? null;
            this.close();
        });

        $dropZone.replaceWith($newButton);
    }

    override _canDragDrop(): boolean {
        return this.actor.isOwner;
    }
}

interface ChoiceSetPromptData extends RulesElementPromptData<string> {
    prompt?: string;
    choices?: PromptChoice<string>[];
    containsUUIDs: boolean;
    allowedDrops: PredicatePF2e;
}

interface ChoiceSetTemplateData {
    prompt: string;
    choices: PromptChoice<string>[];
    containsUUIDs: boolean;
}
