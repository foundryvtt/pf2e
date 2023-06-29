import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { ArmyPF2e } from "./document.ts";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import {
    htmlQueryAll,
} from "@util";
import { DicePF2e } from "@scripts/dice.ts";

class ArmySheetPF2e<TActor extends ArmyPF2e> extends ActorSheetPF2e<TActor> {
    protected readonly actorConfigClass = CONFIG;

    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        return {
            ...options,
            classes: [...options.classes, "pf2e", "army"],
            template: "systems/pf2e/templates/actors/army/sheet.hbs",
        };
    }

    override async getData(): Promise<ArmySheetDataPF2e<TActor>> {
        const sheetData = await super.getData();
        // Enrich content
        const rollData = this.actor.getRollData();
        sheetData.enrichedContent.description = await TextEditor.enrichHTML(sheetData.data.details.description, {
            rollData,
            async: true,
        });

        return { ...sheetData };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        // Don't subscribe to edit buttons it the sheet is not editable
        if (!this.isEditable) return;
        const html = $html[0];
        const { actor } = this;

        // Gear pips
        for (const button of htmlQueryAll(html, "button.pips")) {
            const action = Array.from(button.classList).find((c) => ["melee", "ranged", "potion", "armor"].includes(c));
            const piplistener = (event: MouseEvent) => {
                // Identify the button
                const [updatePath, pipCount] = ((): [string, number] | [null, null] => {
                    const { gear } = actor.system;
                    switch (action) {
                        case "melee":
                            return ["system.gear.melee.magic.bonus", gear.melee.magic.bonus];
                        case "ranged":
                            return ["system.gear.ranged.magic.bonus", gear.ranged.magic.bonus];
                        case "armor":
                            return ["system.gear.armor.magic.bonus", gear.armor.magic.bonus];
                        case "potion":
                            return ["system.gear.potions.unlocked", gear.potions.unlocked];
                        default:
                            return [null, null];
                    }
                })();

                if (updatePath) {
                    const change = event.type === "click" ? 1 : -1;
                    actor.update({ [updatePath]: Math.clamped(pipCount + change, 0, 3) });
                }
            };
            button.addEventListener("click", piplistener);
            button.addEventListener("contextmenu", piplistener);
        }

        // Toggles
        for (const button of htmlQueryAll(html, "button.toggle")) {
            // Then for each one
            button.addEventListener("click", () => {
                // When they click
                const buttonclass = button.className; // Find the type of button
                console.log(buttonclass);
                if (buttonclass.includes("melee")) {
                    // If it's melee,
                    console.log("Toggling melee");
                    const property = actor.system.gear.melee.unlocked; // Then find the lock status
                    actor.update({ "system.gear.melee.unlocked": !property }); // And invert it
                }
                if (buttonclass.includes("ranged")) {
                    console.log("Toggling ranged");
                    const property = actor.system.gear.ranged.unlocked;
                    actor.update({ "system.gear.ranged.unlocked": !property });
                }
                return;
            });
        }

        // This is probably a bad way to do it, but it's very easy
        for (const header of htmlQueryAll(html, "legend.compendium-items")) {
            header.addEventListener("click", () => {
                const compendium = game.packs.get("pf2e.kingmaker-features")
                if ( compendium ) {
                    compendium.render(true)
                } else {
                    ui.notifications.error("Compendium not found");
                }
            })
        }

        // Drink potions
        for (const button of htmlQueryAll(html, "button.usepotion")) {
            button.addEventListener("click", () => {
                const { hitPoints } = actor;
                const currentPotions = actor.system.gear.potions.unlocked;
                if (currentPotions < 1) {
                    ui.notifications.warn("No potions!");
                } else if (hitPoints.value === hitPoints.max) {
                    ui.notifications.warn("HP is already full!");
                } else {
                    actor.update({
                        "system.attributes.hp.value": hitPoints.value + 1,
                        "system.gear.potions.unlocked": currentPotions - 1,
                    });
                }
            });
        }

        // Listens to all roll buttons
        const rollables = [".rollable"].join(", ");
        for (const rollable of htmlQueryAll(html, rollables)) {
            rollable.addEventListener("click", (event) => {
                this.#onClickRollable(rollable, event);
            });
        }
    }

    // Function that handles all checks and rolls
    async #onClickRollable(link: HTMLElement, event: MouseEvent): Promise<void> {
        const { attribute, strike } = link?.dataset ?? {};
        const speaker = ChatMessage.getSpeaker({ token: this.token, actor: this.actor });
        let title = "Title Not Found"
        let bonus = 0
        let parts = ["@bonus"];

        if ( strike === "melee" || strike === "ranged" ) {
            bonus = this.actor.system.gear[strike].bonus + this.actor.system.gear[strike].magic.bonus;
            parts = ["@bonus", "@magicbonus"];
            title = game.i18n.localize(`PF2E.Actor.Army.Strike${strike}`);
        } else if ( attribute === "scouting" || attribute === "morale" || attribute === "maneuver" ) {
            bonus = this.actor.system.attributes[attribute].bonus;
            title = game.i18n.localize(`PF2E.Actor.Army.Attr${attribute}`);
        }

        let data = { bonus };

        await DicePF2e.d20Roll({
            event,
            parts,
            data,
            title,
            speaker,
        });
    }
}

interface ArmySheetDataPF2e<TActor extends ArmyPF2e> extends ActorSheetDataPF2e<TActor> {}

export { ArmySheetPF2e };