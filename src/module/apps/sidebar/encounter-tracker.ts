import { CombatantPF2e, EncounterPF2e, RolledCombatant } from "@module/encounter";
import { eventToRollParams } from "@scripts/sheet-util";
import { ErrorPF2e, fontAwesomeIcon } from "@util";
import Sortable, { SortableEvent } from "sortablejs";

export class EncounterTrackerPF2e<TEncounter extends EncounterPF2e | null> extends CombatTracker<TEncounter> {
    sortable!: Sortable;

    /** Make the combatants sortable */
    override activateListeners($html: JQuery): void {
        const tracker = $html[0].querySelector<HTMLOListElement>("#combat-tracker");
        if (!tracker) throw ErrorPF2e("No tracker found");

        const encounter = this.viewed;
        if (!encounter) return super.activateListeners($html);

        const tokenSetsNameVisibility = game.settings.get("pf2e", "metagame_tokenSetsNameVisibility");
        for (const row of tracker.querySelectorAll<HTMLLIElement>("li.combatant").values()) {
            const combatantId = row.dataset.combatantId ?? "";
            const combatant = encounter.combatants.get(combatantId, { strict: true });

            // Set each combatant's initiative as a data attribute for use in drag/drop feature
            row.setAttribute("data-initiative", String(combatant.initiative));

            // Hide names in the tracker of combatants with tokens that have unviewable nameplates
            if (tokenSetsNameVisibility) {
                const nameElement = row.querySelector<HTMLHRElement>(".token-name h4");
                if (nameElement && !game.user.isGM && !combatant.playersCanSeeName) {
                    nameElement.innerText = "";
                    row.querySelector<HTMLImageElement>("img.token-image")?.removeAttribute("title");
                }

                if (game.user.isGM && combatant.actor && combatant.actor.alliance !== "party") {
                    const toggleNameVisibility = document.createElement("a");
                    const isActive = combatant.playersCanSeeName;
                    toggleNameVisibility.classList.add(...["combatant-control", isActive ? "active" : []].flat());
                    toggleNameVisibility.dataset.control = "toggle-name-visibility";
                    toggleNameVisibility.dataset.tooltip = game.i18n.localize(
                        isActive ? "PF2E.Encounter.HideName" : "PF2E.Encounter.RevealName"
                    );
                    const icon = fontAwesomeIcon("signature");
                    toggleNameVisibility.append(icon);

                    row.querySelector('.combatant-controls a[data-control="toggleHidden"]')?.after(
                        toggleNameVisibility
                    );

                    if (!isActive) {
                        row.classList.add("hidden-name");
                    }
                }
            }
        }

        // Defer to Combat Enhancements module if in use
        if (game.user.isGM && !game.modules.get("combat-enhancements")?.active) {
            Sortable.create(tracker, {
                animation: 200,
                dataIdAttr: "data-combatant-id",
                direction: "vertical",
                dragoverBubble: true,
                easing: "cubic-bezier(1, 0, 0, 1)",
                ghostClass: "drag-gap",
                onUpdate: (event) => this.#onDropCombatant(event),
                onEnd: (event) => this.adjustFinalOrder(event),
            });
        }

        super.activateListeners($html);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Allow CTRL-clicking to make the rolls blind */
    protected override async _onCombatControl(
        event: JQuery.ClickEvent<HTMLElement, HTMLElement, HTMLElement>
    ): Promise<void> {
        const control = event.currentTarget.dataset.control;
        if ((control === "rollNPC" || control === "rollAll") && this.viewed) {
            event.stopPropagation();
            await this.viewed[control](eventToRollParams(event));
        } else {
            await super._onCombatControl(event);
        }
    }

    /** Allow CTRL-clicking to make the roll blind */
    protected override async _onCombatantControl(
        event: JQuery.ClickEvent<HTMLElement, HTMLElement, HTMLElement>
    ): Promise<void> {
        event.stopPropagation();
        if (!this.viewed) return;

        const control = event.currentTarget.dataset.control;
        const li = event.currentTarget.closest<HTMLLIElement>(".combatant");
        const combatant = this.viewed.combatants.get(li?.dataset.combatantId ?? "", { strict: true });

        if (control === "rollInitiative") {
            await this.viewed.rollInitiative([combatant.id], eventToRollParams(event));
        } else if (control === "toggle-name-visibility") {
            await combatant.toggleNameVisibility();
        } else {
            await super._onCombatantControl(event);
        }
    }

    /** Replace parent method with system-specific procedure */
    protected override _onToggleDefeatedStatus(combatant: CombatantPF2e<TEncounter>): Promise<void> {
        return combatant.toggleDefeated();
    }

    /** Handle the drop event of a dragged & dropped combatant */
    async #onDropCombatant(event: SortableEvent): Promise<void> {
        this.validateDrop(event);

        const encounter = this.viewed;
        if (!encounter) return;

        const droppedId = event.item.getAttribute("data-combatant-id") ?? "";
        const dropped = encounter.combatants.get(droppedId, { strict: true }) as RolledCombatant<
            NonNullable<TEncounter>
        >;
        if (typeof dropped.initiative !== "number") {
            ui.notifications.error(game.i18n.format("PF2E.Encounter.HasNoInitiativeScore", { actor: dropped.name }));
            return;
        }

        const newOrder = this.getCombatantsFromDOM();
        const oldOrder = encounter.turns.filter(
            (c): c is RolledCombatant<NonNullable<TEncounter>> => c.initiative !== null
        );
        // Exit early if the order wasn't changed
        if (newOrder.every((c) => newOrder.indexOf(c) === oldOrder.indexOf(c))) return;

        this.setInitiativeFromDrop(newOrder, dropped);
        await this.saveNewOrder(newOrder);
    }

    private setInitiativeFromDrop(
        newOrder: RolledCombatant<NonNullable<TEncounter>>[],
        dropped: RolledCombatant<NonNullable<TEncounter>>
    ): void {
        const aboveDropped = newOrder.find((c) => newOrder.indexOf(c) === newOrder.indexOf(dropped) - 1);
        const belowDropped = newOrder.find((c) => newOrder.indexOf(c) === newOrder.indexOf(dropped) + 1);

        const hasAboveAndBelow = !!aboveDropped && !!belowDropped;
        const hasAboveAndNoBelow = !!aboveDropped && !belowDropped;
        const hasBelowAndNoAbove = !aboveDropped && !!belowDropped;
        const aboveIsHigherThanBelow = hasAboveAndBelow && belowDropped.initiative < aboveDropped.initiative;
        const belowIsHigherThanAbove = hasAboveAndBelow && belowDropped.initiative < aboveDropped.initiative;
        const wasDraggedUp =
            !!belowDropped && this.viewed?.getCombatantWithHigherInit(dropped, belowDropped) === belowDropped;
        const wasDraggedDown = !!aboveDropped && !wasDraggedUp;

        // Set a new initiative intuitively, according to allegedly commonplace intuitions
        dropped.initiative =
            hasBelowAndNoAbove || (aboveIsHigherThanBelow && wasDraggedUp)
                ? belowDropped.initiative + 1
                : hasAboveAndNoBelow || (belowIsHigherThanAbove && wasDraggedDown)
                ? aboveDropped.initiative - 1
                : hasAboveAndBelow
                ? belowDropped.initiative
                : dropped.initiative;

        const withSameInitiative = newOrder.filter((c) => c.initiative === dropped.initiative);
        if (withSameInitiative.length > 1) {
            for (let priority = 0; priority < withSameInitiative.length; priority++) {
                withSameInitiative[priority].flags.pf2e.overridePriority[dropped.initiative] = priority;
            }
        }
    }

    /** Save the new order, or reset the viewed order if no change was made */
    private async saveNewOrder(newOrder: RolledCombatant<NonNullable<TEncounter>>[]): Promise<void> {
        await this.viewed?.setMultipleInitiatives(
            newOrder.map((c) => ({ id: c.id, value: c.initiative, overridePriority: c.overridePriority(c.initiative) }))
        );
    }

    /** Adjust the final order of combatants if necessary, keeping unrolled combatants at the bottom */
    private adjustFinalOrder(event: SortableEvent): void {
        const row = event.item;
        const tracker = this.element[0].querySelector<HTMLOListElement>("#combat-tracker");
        if (!tracker) throw ErrorPF2e("Unexpected failure to retriever tracker DOM element");
        const rows = Array.from(tracker.querySelectorAll<HTMLElement>("li.combatant"));

        const [oldIndex, newIndex] = [event.oldIndex ?? 0, event.newIndex ?? 0];
        const firstRowWithNoRoll = rows.find((row) => Number.isNaN(Number(row.dataset.initiative)));

        if (Number.isNaN(Number(row.dataset.initiative))) {
            // Undo drag/drop of unrolled combatant
            if (newIndex > oldIndex) {
                tracker.insertBefore(row, rows[oldIndex]);
            } else {
                tracker.insertBefore(row, rows[oldIndex + 1]);
            }
        } else if (firstRowWithNoRoll && rows.indexOf(firstRowWithNoRoll) < newIndex) {
            // Always place a rolled combatant before all other unrolled combatants
            tracker.insertBefore(row, firstRowWithNoRoll);
        }
    }

    private validateDrop(event: SortableEvent): void {
        const { combat } = game;
        if (!combat) throw ErrorPF2e("Unexpected error retrieving combat");

        const { oldIndex, newIndex } = event;
        if (!(typeof oldIndex === "number" && typeof newIndex === "number")) {
            throw ErrorPF2e("Unexpected error retrieving new index");
        }
    }

    /** Retrieve the (rolled) combatants in the real-time order as seen in the DOM */
    private getCombatantsFromDOM(): RolledCombatant<NonNullable<TEncounter>>[] {
        const { combat } = game;
        if (!combat) throw ErrorPF2e("Unexpected error retrieving combat");

        const tracker = this.element[0].querySelector<HTMLOListElement>("#combat-tracker");
        if (!tracker) throw ErrorPF2e("Unexpected failure to retriever tracker DOM element");

        return Array.from(tracker.querySelectorAll<HTMLLIElement>("li.combatant"))
            .map((row) => row.getAttribute("data-combatant-id") ?? "")
            .map((id) => combat.combatants.get(id, { strict: true }))
            .filter((c): c is RolledCombatant<NonNullable<TEncounter>> => typeof c.initiative === "number");
    }
}
