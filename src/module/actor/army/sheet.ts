import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { ArmyPF2e } from "./document.ts";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { htmlQueryAll, localizer } from "@util";
import { DicePF2e } from "@scripts/dice.ts";
import { fetchArmyGearData, ARMY_STATS } from "./values.ts";
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
            const action = Array.from(button.classList).find((c) =>
                ["melee", "ranged", "potion", "armor", "ammunition"].includes(c)
            );
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
                            return [
                                "system.weapons.ammunition.value",
                                actor.system.weapons.ammunition.value,
                                actor.system.weapons.ammunition.max,
                            ];
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
                if (buttonclass.includes("editLock")) {
                    console.log("Toggling Sheet Lock");
                    const property = actor.system.details.editLock;
                    actor.update({ "system.details.editLock": !property });
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

        // Army Builder Buttons
        for (const button of htmlQueryAll(html, "button.generate-stats")) {
            button.addEventListener("click", () => {
                this.#generateStats(button);
            });
        }
    }

    // This is the function that handles all checks and rolls
    async #onClickRollable(link: HTMLElement, event: MouseEvent): Promise<void> {
        const { actor, token } = this;
        const { attribute, weapon, attack } = link?.dataset ?? {};
        let title = "Title Not Found";
        let bonus = 0;
        let parts = ["@bonus"];
        let data = {};

        if (weapon === "melee" || weapon === "ranged") {
            const proficiencybonus = this.actor.system.weapons.bonus;
            const potencybonus = this.actor.system.weapons[weapon].potency;
            const multipleattackpenalties = [0, -5, -10];
            const multipleattackpenalty = multipleattackpenalties[Number(attack)];
            data = { proficiencybonus, potencybonus, multipleattackpenalty };
            parts = ["@proficiencybonus", "@potencybonus", "@multipleattackpenalty"];
            title = this.actor.system.weapons[weapon].name || game.i18n.localize(`PF2E.Actor.Army.Strike${weapon}`);
        } else if (attribute === "scouting" || attribute === "morale" || attribute === "maneuver") {
            bonus = this.actor.system.attributes[attribute].bonus;
            title = game.i18n.localize(`PF2E.Warfare.Army.${attribute}`);
            data = { bonus };
        }

        await DicePF2e.d20Roll({
            event,
            parts,
            data,
            title,
            speaker: ChatMessagePF2e.getSpeaker({ actor, token }),
        });
    }

    // The "Info" buttons call a function that creates chat cards for the embedded gear data
    async #onClickInfo(link: HTMLElement): Promise<void> {
        const { actor, token } = this;
        const { info } = link?.dataset ?? {};

        const template = "./systems/pf2e/templates/actors/army/gear-card.hbs";
        const data = fetchArmyGearData(String(info));

        await ChatMessagePF2e.create({
            content: await renderTemplate(template, data),
            speaker: ChatMessagePF2e.getSpeaker({ actor, token }),
        });
    }

    // This function is used for creating new army stat blocks- it just grabs the "default" values for the army's level
    async #generateStats(button: HTMLElement): Promise<void> {
        const actor = this.actor; // Should I just move this to the top and use it everywhere? Why does it not work without it?
        const action = Array.from(button.classList).find((c) => ["level-up", "popup"].includes(c));
        const localize = localizer("PF2E.Warfare.ArmySheet.StatGenerator");

        async function processForm(html: JQuery<HTMLElement>) {
            // Record results of user selection
            const newLevel = Number(html.find("#level").val());
            const strongSave = String(html.find("#save").val());
            replaceStats(newLevel, strongSave);
        }

        // The full "build" popup which queries for the desired level and weak/strong save
        if (action === "popup") {
            // Create the input form
            const d = new Dialog({
                title: localize("title"),
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
                        <p>${localize("desc")}</p>
                        <p><strong>${localize("warning")}</strong></p>
                        <fieldset><legend>${localize("parametersHeader")}</legend>
                            <label>${localize("levelLabel")}<input required="true" type="number"/></label>
                            <label>${localize("saveLabel")}<select>
                                <option value="maneuver">${game.i18n.localize("PF2E.Warfare.Army.maneuver")}</option>
                                <option value="morale">${game.i18n.localize("PF2E.Warfare.Army.morale")}</option>
                            </select></label>
                        </fieldset>
                    </form></body>
                </html>
                `,
                buttons: {
                    generate: {
                        label: localize("confirmButton"),
                        callback: (html) => processForm(html),
                        icon: `<i class="fas fa-cog"></i>`,
                    },
                },
            });
            d.render(true);
        } else if (action === "level-up") {
            // We already know the values, the form is just a confirmation
            Dialog.confirm({
                title: localize("levelUpTitle"),
                content: `
                <html>
                    <head><style>
                        div.dialog-buttons { padding-top: 0.5rem; }
                    </style></head>
                    <body><form>
                        <p>${localize("levelUpDesc")}</p>
                        <p><strong>${localize("warning")}</strong></p>
                    </form></body>
                </html>
                `,
                yes: () => {
                    const newLevel = Number(actor.system.details.level.value + 1);
                    const strongSave = String(actor.system.details.strongSave || "morale");
                    replaceStats(newLevel, strongSave);
                },
                defaultYes: false,
            });
        }

        // Function that updates stats with default values
        async function replaceStats(newLevel: number, strongSave: string) {
            const strongSaveMod =
                strongSave === "morale" ? "system.attributes.morale.bonus" : "system.attributes.maneuver.bonus";
            const weakSaveMod =
                strongSave === "morale" ? "system.attributes.maneuver.bonus" : "system.attributes.morale.bonus";
            const newStatistics = {
                "system.details.level.value": newLevel,
                "system.attributes.scouting.bonus": ARMY_STATS.scouting[newLevel],
                "system.attributes.standardDC": ARMY_STATS.standardDC[newLevel],
                "system.attributes.ac.value": ARMY_STATS.ac[newLevel],
                "system.details.strongSave": strongSave,
                [strongSaveMod]: ARMY_STATS.strongSave[newLevel],
                [weakSaveMod]: ARMY_STATS.weakSave[newLevel],
                "system.weapons.bonus": ARMY_STATS.attack[newLevel],
                "system.attributes.maxTactics": ARMY_STATS.maxTactics[newLevel],
            };
            await actor.update(newStatistics);
        }
    }
}

type ArmySheetDataPF2e<TActor extends ArmyPF2e> = ActorSheetDataPF2e<TActor>;

export { ArmySheetPF2e };
