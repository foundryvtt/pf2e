import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { ArmyPF2e } from "./document.ts";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { htmlQueryAll } from "@util";
import { DicePF2e } from "@scripts/dice.ts";
import { ARMY_STATS } from "./values.ts"; 
import { ChatMessagePF2e } from "@module/chat-message/document.ts";

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
            const action = Array.from(button.classList).find((c) => ["melee", "ranged", "potion", "armor", "ammunition"].includes(c));
            const piplistener = (event: MouseEvent) => {
                // Identify the button
                const [updatePath, pipCount, pipMax] = ((): [string, number, number] | [null, null, null] => {
                    switch (action) {
                        case "melee":
                            return ["system.weapons.melee.potency", actor.system.weapons.melee.potency, 3];
                        case "ranged":
                            return ["system.weapons.ranged.potency", actor.system.weapons.ranged.potency, 3];
                        case "armor":
                            return ["system.attributes.ac.potency", actor.system.attributes.ac.potency, 3];
                        case "potion":
                            return ["system.attributes.hp.potions", actor.system.attributes.hp.potions, 3];
                        case "ammunition":
                            return ["system.weapons.ammunition.value", actor.system.weapons.ammunition.value, actor.system.weapons.ammunition.max];
                        default:
                            return [null, null, null];
                    }
                })();

                if (updatePath) {
                    const change = event.type === "click" ? 1 : -1;
                    actor.update({ [updatePath]: Math.clamped(pipCount + change, 0, pipMax) });
                }
            };
            button.addEventListener("click", piplistener);
            button.addEventListener("contextmenu", piplistener);
        }

        // Lock/unlock weapons
        for (const button of htmlQueryAll(html, "button.unlock")) {
            button.addEventListener("click", () => {
                const buttonclass = button.className;
                console.log(buttonclass);
                if (buttonclass.includes("melee")) {
                    console.log("Toggling melee");
                    const property = actor.system.weapons.melee.unlocked;
                    actor.update({ "system.weapons.melee.unlocked": !property });
                }
                if (buttonclass.includes("ranged")) {
                    console.log("Toggling ranged");
                    const property = actor.system.weapons.ranged.unlocked;
                    actor.update({ "system.weapons.ranged.unlocked": !property });
                }
                return;
            });
        }

        // This is definitely a bad way to do it, but it's also very easy
        for (const header of htmlQueryAll(html, "legend.compendium-items")) {
            header.addEventListener("click", () => {
                const compendium = game.packs.get("pf2e.kingmaker-features");
                if (compendium) {
                    compendium.render(true);
                } else {
                    ui.notifications.error("Compendium not found");
                }
            });
        }

        // Drink potions
        for (const button of htmlQueryAll(html, "button.usepotion")) {
            button.addEventListener("click", () => {
                const { hitPoints } = actor;
                const currentPotions = actor.system.attributes.hp.potions;
                if (currentPotions < 1) {
                    ui.notifications.warn("No potions!");
                } else if (hitPoints.value === hitPoints.max) {
                    ui.notifications.warn("HP is already full!");
                } else {
                    actor.update({
                        "system.attributes.hp.value": hitPoints.value + 1,
                        "system.attributes.hp.potions": currentPotions - 1,
                    });
                }
            });
        }

        // All roll buttons
        for (const rollable of htmlQueryAll(html, ".rollable")) {
            rollable.addEventListener("click", (event) => {
                this.#onClickRollable(rollable, event);
            });
        }

        // Gear Info Buttons
        for (const button of htmlQueryAll(html, "button.info")) {
            button.addEventListener("click", () => {
                this.#onClickInfo(button);
            });
        }

        // Generate Stats Button
        for (const button of htmlQueryAll(html, "button.generate-stats")) {
            button.addEventListener("click", () => {
                this.#GenerateStatsPopup();
            });
        }
    }

    // This is the function that handles all checks and rolls
    async #onClickRollable(link: HTMLElement, event: MouseEvent): Promise<void> {
        const { attribute, strike } = link?.dataset ?? {};
        const speaker = ChatMessage.getSpeaker({ token: this.token, actor: this.actor });
        let title = "Title Not Found";
        let bonus = 0;
        let parts = ["@bonus"];
        let data = {};

        if (strike === "melee" || strike === "ranged") {
            const proficiencybonus = this.actor.system.weapons.bonus;
            const potencybonus = this.actor.system.weapons[strike].potency;
            data = { proficiencybonus, potencybonus };
            parts = ["@proficiencybonus", "@potencybonus"];
            title = this.actor.system.weapons[strike].name || game.i18n.localize(`PF2E.Actor.Army.Strike${strike}`);
        } else if (attribute === "scouting" || attribute === "morale" || attribute === "maneuver") {
            bonus = this.actor.system.attributes[attribute].bonus;
            title = game.i18n.localize(`PF2E.Actor.Army.Attr${attribute}`);
            data = { bonus };
        }

        await DicePF2e.d20Roll({
            event,
            parts,
            data,
            title,
            speaker,
        });
    }

    // The "Info" buttons call a function that creates chat cards for the embedded gear data (not finished, at the very least all this data needs moving to the values.ts or en.json files)
    async #onClickInfo(link: HTMLElement): Promise<void> {
        const { info } = link?.dataset ?? {};
        const speaker = ChatMessage.getSpeaker({ token: this.token, actor: this.actor });
        let bonus = 0;
        let traits = "";
        let description = "";
        let name = [""];
        let level = [0];
        let price = [0];

        if (info === "melee" || info === "ranged") {
            bonus = this.actor.system.weapons[info].potency;
            name = ["Mundane Weapons", "Magic Weapons", "Greater Magic Weapons", "Major Magic Weapons"];
            traits = "Army, Evocation, Magical";
            description = "The army's weapons are magic. If the army has melee and ranged weapons, choose which one is made magic when this gear is purchased. You can buy this gear twice—once for melee weapons and once for ranged weapons. If you purchase a more powerful version, it replaces the previous version, and the RP cost of the more powerful version is reduced by the RP cost of the replaced weapons.";
            level = [0, 2, 10, 16];
            price = [0, 20, 40, 60];
        } else if (info === "potions") {
            bonus = 0;
            name = ["Healing Potions"];
            traits = "Army, Consumable, Healing, Magical, Necromancy, Potion";
            description = "An army equipped with healing potions (these rules are the same if you instead supply the army with alchemical healing elixirs) can use a single dose as part of any Maneuver action. When an army uses a dose of healing potions, it regains 1 HP. An army can be outfitted with up to 3 doses of healing potions at a time; unlike ranged Strike shots, healing potion doses do not automatically replenish after a war encounter—new doses must be purchased.";
            price = [15];
        } else if (info === "armor") {
            bonus = this.actor.system.attributes.ac.potency;
            name = ["Mundane Armor", "Magic Armor", "Greater Magic Armor", "Major Magic Armor"];
            traits = "Abjuration, Army, Magical";
            description = "Magic armor is magically enchanted to bolster the protection it affords to the soldiers.";
            level = [0, 5, 11, 18];
            price = [0, 25, 50, 75];
        }

        const content = "<h3>" + name[bonus] + "</h3>" + traits + "<hr/>" + description + "<hr/>" + "<p>Level: " + level[bonus] + "</p><p>Price: " + price[bonus] + " RP</p>" ;

        await ChatMessagePF2e.create({
            content,
            speaker,
        });
    }

    // This function is used for creating new armies- it just grabs the "default" values for the army's level
    async #GenerateStatsPopup(): Promise<void> {
        const actor = this.actor; // Should I just move this to the top and use it everywhere
        // Create the input dialogue
        const d = new Dialog({
            title: "Army Stat Generator",
            content: `
            <html>
                <head><style>
                    input#level { width: 3rem; }
                    fieldset {
                        display: flex;
                        justify-content: space-between;
                    }
                    div.dialog-buttons { padding-top: 0.5rem; }
                </style></head>
                <body><form>
                    <p>Generates stats for armies using the default values as defined in the Warfare rules. New statistics will be dependent on the level. Can be used for creating new armies or for leveling up existing ones. Gear, tactics, actions, and traits will not be replaced.</p>
                    <p><strong>Warning: The old statistics will be permanently overwritten.</strong></p>
                    <fieldset><legend>Parameters:</legend>
                        <label for="level">Level: <input required="true" autofocus="true" type="number" id="level" name="level"/></label>
                        <label for="save">Strong save: <select id="save">
                            <option selected="true" value="maneuver">Maneuver</option>
                            <option value="morale">Morale</option>
                        </select></label>
                    </fieldset>
                </form></body>
            </html>
            `,
            buttons: {
                generate: {
                    label: "Generate Stats",
                    callback: (html) => generate(html),
                    icon: `<i class="fas fa-cog"></i>`,
                },
                cancel: {
                    label: "Cancel",
                    callback: close,
                    icon: `<i class="fas fa-times"></i>`,
                },
            },
            default: "cancel",
            render: () => console.log("Rendered"),
            close: () => console.log("Closed"),
        });
        d.render(true);

        async function generate(html: JQuery<HTMLElement>) {
            // Record results of user selection
            const newLevel = Number(html.find("#level").val());
            const chosenSave = String(html.find("#save").val());
            const strongSave = ((chosenSave === "morale") ? "system.attributes.morale.bonus" : "system.attributes.maneuver.bonus")
            const weakSave = ((chosenSave === "morale") ? "system.attributes.maneuver.bonus" : "system.attributes.morale.bonus")
            console.log(newLevel, chosenSave);
            // Update stats with default values
            const newStatistics = {
                "system.details.level.value" : newLevel,
                "system.attributes.scouting.bonus" : ARMY_STATS.scouting[newLevel],
                "system.attributes.standardDC" : ARMY_STATS.standardDC[newLevel],
                "system.attributes.ac.value" : ARMY_STATS.ac[newLevel],
                [strongSave] : ARMY_STATS.strongSave[newLevel],
                [weakSave] : ARMY_STATS.weakSave[newLevel],
                "system.weapons.bonus" : ARMY_STATS.attack[newLevel],
                "system.attributes.maxTactics" : ARMY_STATS.maxTactics[newLevel],
            };
            await actor.update(newStatistics);
        }
    }
}

interface ArmySheetDataPF2e<TActor extends ArmyPF2e> extends ActorSheetDataPF2e<TActor> {}

export { ArmySheetPF2e };
