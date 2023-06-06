import { ArmyPF2e } from "@actor";
import { ActorSheetPF2e } from "@actor/sheet/base";

class ArmySheetPF2e extends ActorSheetPF2e<ArmyPF2e> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        return foundry.utils.mergeObject(options, {
            classes: [...options.classes, "pf2e", "army"],
            template: "systems/pf2e/templates/actors/army/sheet.hbs",
        });
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const rollables = ["a.rollable", ".rollable a", ".item-icon.rollable"].join(", ");
        $html.find(rollables).on("click", (event) => this.#onClickRollable(event));
    }

    async #onClickRollable(event: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement>): Promise<void> {
        event.preventDefault();
    }
}

export { ArmySheetPF2e };