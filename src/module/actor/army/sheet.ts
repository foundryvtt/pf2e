import { ArmyPF2e } from "@actor/army/army.ts";
import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { CreatureConfig } from "@actor/creature/config.ts";
import { htmlQueryAll } from "@util";

class ArmySheetPF2e<TActor extends ArmyPF2e> extends ActorSheetPF2e<TActor> {
    protected readonly actorConfigClass = CreatureConfig;

    static override get defaultOptions() : ActorSheetOptions {
        const options = super.defaultOptions;
        return {
            ...options,
            classes: [...options.classes, "pf2e", "army"],
            template: "systems/pf2e/templates/actors/army/sheet.hbs",
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // Don't subscribe to edit buttons it the sheet is not editable
        if (!this.options.editable) return;

        // ================= //
        //      POTIONS      //
        // ================= //
        const potionBottlesList = htmlQueryAll(html, "button.potion");
        if (potionBottlesList.length > 0) {
            const listener = (event: Event) => {
                const oldbottlecount = this.actor.system.gear.potions.unlocked;
                const change = event.type === "click" ? 1 : -1;
                const newbottlecount = oldbottlecount + change;
                if (newbottlecount > 3) {
                    console.log("You cannot have more than 3 bottles");
                    this.actor.update({ "system.gear.potions.unlocked" : 3 });
                }
                else if (newbottlecount < 0) {
                    console.log("You cannot have fewer than 0 bottles");
                    this.actor.update({ "system.gear.potions.unlocked" : 0 });
                } else {
                this.actor.update({ "system.gear.potions.unlocked" : newbottlecount });
                }
            };
    
            for (const bottles of potionBottlesList) {
                bottles.addEventListener("click", listener);
                bottles.addEventListener("contextmenu", listener);
            }
        }
        const drinkpotionsbutton = htmlQueryAll(html, "button.usepotion");
        const drinkpotion = () => {
            const oldbottlecount = this.actor.system.gear.potions.unlocked;
            const hitpointtotal = this.actor.system.attributes.hp?.value;
            const hitpointmax = this.actor.system.attributes.hp?.max;
            if (oldbottlecount < 1) {
                ui.notifications.warn("No potions!");
            } else if (hitpointtotal == hitpointmax) {
                ui.notifications.warn("HP is already full!");
            } else {
                const newbottlecount = oldbottlecount - 1;
                const newhitpointcount = hitpointtotal + 1;
                this.actor.update({ "system.gear.potions.unlocked" : newbottlecount });
                this.actor.update({ "system.attributes.hp.value" : newhitpointcount });
            }
        }
        for (const drink of drinkpotionsbutton) {
        drink.addEventListener("click", drinkpotion);
        }
    }
}

export { ArmySheetPF2e };
export { ArmyPF2e };