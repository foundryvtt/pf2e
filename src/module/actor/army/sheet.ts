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
        const thisactor = this.actor;

        // Don't subscribe to edit buttons it the sheet is not editable
        if (!this.options.editable) return;

        // ================ //
        //       PIPS       //
        // ================ //
        const piptrackers = htmlQueryAll(html, "button.pips");
        if (piptrackers.length > 0) {
            for (const button of piptrackers) {
                const piplistener = (event: Event) => {
                    const change = event.type === "click" ? 1 : -1;
                    let pipcount = 0;
                    // Identify the button
                    const buttonclass = button.className;
                    console.log(buttonclass);
                    if (buttonclass.includes("melee")) {
                        pipcount = thisactor.system.gear.melee.magic.bonus;
                    } else if (buttonclass.includes("ranged")) {
                        pipcount = thisactor.system.gear.ranged.magic.bonus;
                    } else if (buttonclass.includes("potion")) {
                        pipcount = thisactor.system.gear.potions.unlocked;
                    } else if (buttonclass.includes("armor")) {
                        pipcount = thisactor.system.gear.armor.magic.bonus;
                    }
                    // Verify values
                    let newpipcount = pipcount + change;
                    if (newpipcount > 3) {
                        console.log("Value cannot be higher than 3!");
                        newpipcount = 3;
                    }
                    if (newpipcount < 0) {
                        console.log("Value cannot be lower than 0!");
                        newpipcount = 0;
                    }
                    // Apply values
                    if (buttonclass.includes("melee")) {
                        thisactor.update({ "system.gear.melee.magic.bonus" : newpipcount });
                    } else if (buttonclass.includes("ranged")) {
                        thisactor.update({ "system.gear.ranged.magic.bonus" : newpipcount });
                    } else if (buttonclass.includes("potion")) {
                        thisactor.update({ "system.gear.potions.unlocked" : newpipcount });
                    } else if (buttonclass.includes("armor")) {
                        thisactor.update({ "system.gear.armor.magic.bonus" : newpipcount });
                    }
                }
                button.addEventListener("click", piplistener);
                button.addEventListener("contextmenu", piplistener);
            }
        }
        // ================= //
        //      TOGGLES      //
        // ================= //
        const togglebuttons = htmlQueryAll(html, "button.toggle")                           // Find all the toggles
        if (togglebuttons.length > 0) {                                                     // If there are any
            for (const button of togglebuttons) {                                           // Then for each one
                button.addEventListener("click", function(){                                // When they click
                    const buttonclass = button.className;                                   // Find the type of button
                    console.log(buttonclass)
                    if (buttonclass.includes("melee")) {                                    // If it's melee,
                        console.log("Toggling melee")                                                
                        const property = thisactor.system.gear.melee.unlocked ;             // Then find the lock status
                        thisactor.update({ "system.gear.melee.unlocked" : !property  });    // And invert it
                    } if (buttonclass.includes("ranged")) {
                        console.log("Toggling ranged")
                        const property = thisactor.system.gear.ranged.unlocked ;
                        thisactor.update({ "system.gear.ranged.unlocked" : !property  });
                    } if (buttonclass.includes("darkvision")) {
                        console.log("Toggling darkvision")
                        const property = thisactor.attributes.scouting.darkvision ;
                        thisactor.update({ "system.attributes.scouting.darkvision" : !property  });
                    } 
                    return;
                });
            }
        }
        // ================= //
        //       DRINK       //
        // ================= //
        const drinkpotionsbutton = htmlQueryAll(html, "button.usepotion");
        if (drinkpotionsbutton.length > 0) {
            const drinkpotion = () => {
                const oldbottlecount = thisactor.system.gear.potions.unlocked;
                const hitpointtotal = thisactor.system.attributes.hp?.value;
                const hitpointmax = thisactor.system.attributes.hp?.max;
                if (oldbottlecount < 1) {
                    ui.notifications.warn("No potions!");
                } else if (hitpointtotal == hitpointmax) {
                    ui.notifications.warn("HP is already full!");
                } else {
                    const newbottlecount = oldbottlecount - 1;
                    const newhitpointcount = hitpointtotal + 1;
                    thisactor.update({ "system.gear.potions.unlocked" : newbottlecount });
                    thisactor.update({ "system.attributes.hp.value" : newhitpointcount });
                }
            };
            for (const drink of drinkpotionsbutton) {
            drink.addEventListener("click", drinkpotion);
            };
        }
    }
}

export { ArmySheetPF2e };
export { ArmyPF2e };