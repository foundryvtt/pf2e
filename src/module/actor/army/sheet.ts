import { ArmyPF2e } from "@actor";

class ArmySheetPF2e<TActor extends ArmyPF2e> extends ActorSheet<TActor> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        return foundry.utils.mergeObject(options, {
            classes: [...options.classes, "pf2e", "army"],
            template: "systems/pf2e/templates/actors/army/sheet.hbs",
        });
    }
}

export { ArmySheetPF2e };