import { CombatPF2e } from "@module/combat";
import { RolledCombatant } from "@module/combatant";
import { ErrorPF2e } from "@util";
import Sortable from "sortablejs";
import type { SortableEvent } from "sortablejs";

export class EncounterTrackerPF2e extends CombatTracker<CombatPF2e> {
    sortable!: Sortable;

    /** Fix Foundry setting the title to "Combat Tracker" unlocalized */
    static override get defaultOptions(): CombatTrackerOptions {
        const options = super.defaultOptions;
        options.title = "SIDEBAR.TabCombat";
        return options;
    }

    /** Make the combatants sortable */
    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        // Defer to Combat Enhancements module if in use
        if (game.modules.get("combat-enhancements")?.active) return;

        const tracker = document.querySelector<HTMLOListElement>("#combat-tracker");
        if (!tracker) throw ErrorPF2e("No tracker found");

        Sortable.create(tracker, {
            animation: 200,
            dataIdAttr: "data-combatant-id",
            direction: "vertical",
            dragoverBubble: true,
            easing: "cubic-bezier(1, 0, 0, 1)",
            ghostClass: "drag-gap",
            onUpdate: (event) => this.onDropCombatant(event),
            onEnd: () => this.saveNewOrder(),
        });
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Allow CTRL-clicking to make the rolls blind */
    protected override async _onCombatControl(
        event: JQuery.ClickEvent<HTMLElement, HTMLElement, HTMLElement>
    ): Promise<void> {
        const control = event.currentTarget.dataset.control;
        if ((control === "rollNPC" || control === "rollAll") && this.viewed && event.ctrlKey) {
            await this.viewed[control]({ secret: true });
        } else {
            await super._onCombatControl(event);
        }
    }

    /** Allow CTRL-clicking to make the roll blind */
    protected override async _onCombatantControl(
        event: JQuery.ClickEvent<HTMLElement, HTMLElement, HTMLElement>
    ): Promise<void> {
        const control = event.currentTarget.dataset.control;
        if (control === "rollInitiative" && this.viewed && event.ctrlKey) {
            const li = event.currentTarget.closest<HTMLLIElement>(".combatant");
            const combatant = this.viewed.combatants.get(li?.dataset.combatantId ?? "", { strict: true });
            await this.viewed.rollInitiative([combatant.id], { secret: true });
        } else {
            await super._onCombatantControl(event);
        }
    }

    /** Handle the drop event of a dragged & dropped combatant */
    private async onDropCombatant(event: SortableEvent): Promise<void> {
        this.validateDrop(event);

        const combat = this.viewed!;
        const droppedId = event.item.getAttribute("data-combatant-id") ?? "";
        const dropped = combat.combatants.get(droppedId, { strict: true }) as RolledCombatant;
        if (typeof dropped.initiative !== "number") {
            ui.notifications.error(game.i18n.format("PF2E.Encounter.HasNoInitiativeScore", { actor: dropped.name }));
            return;
        }

        const newOrder = this.getCombatantsFromDOM();
        const aboveDropped = newOrder.find((c) => newOrder.indexOf(c) === newOrder.indexOf(dropped) - 1);
        const belowDropped = newOrder.find((c) => newOrder.indexOf(c) === newOrder.indexOf(dropped) + 1);
        if (belowDropped && !aboveDropped) {
            // Combatant was dropped to the top: set its initiative to be just above the former highest
            this.setRelativeInitiative({ higher: dropped, lower: belowDropped, adjust: dropped });
        } else if (aboveDropped && !belowDropped) {
            // Combatant was dropped to the bottom: set its initiative to be just below the former lowest
            this.setRelativeInitiative({ higher: aboveDropped, lower: dropped });
        } else if (aboveDropped && belowDropped) {
            for (const combatant of newOrder) {
                // Use find instead of index access so that the type will be RolledCombatant | undefined
                const currentAbove = newOrder.find((c) => newOrder.indexOf(c) === newOrder.indexOf(combatant) - 1);
                const currentBelow = newOrder.find((c) => newOrder.indexOf(c) === newOrder.indexOf(combatant) + 1);
                if (currentAbove) this.setRelativeInitiative({ higher: currentAbove, lower: combatant });
                if (currentBelow) this.setRelativeInitiative({ higher: combatant, lower: currentBelow });
            }
        }
    }

    /** Save the new order, or reset the viewed order if no change was made */
    private async saveNewOrder(): Promise<void> {
        const newOrder = this.getCombatantsFromDOM();
        const oldOrder = this.viewed?.turns.filter((c) => c.initiative !== null) ?? [];
        const orderWasChanged = newOrder.some((c) => newOrder.indexOf(c) !== oldOrder.indexOf(c));
        if (orderWasChanged) {
            await this.viewed?.setMultipleInitiatives(newOrder.map((c) => ({ id: c.id, value: c.initiative })));
        } else {
            console.debug("No order change!?");
            this.render();
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
    private getCombatantsFromDOM(): RolledCombatant[] {
        const { combat } = game;
        if (!combat) throw ErrorPF2e("Unexpected error retrieving combat");

        const tracker = document.querySelector<HTMLOListElement>("#combat-tracker");
        if (!tracker) throw ErrorPF2e("Unexpected failure to retriever tracker DOM element");

        return Array.from(tracker.querySelectorAll<HTMLLIElement>("li.combatant"))
            .map((row) => row.getAttribute("data-combatant-id") ?? "")
            .map((id) => combat.combatants.get(id, { strict: true }))
            .filter((c): c is RolledCombatant => typeof c.initiative === "number");
    }

    /** Set the relative initiatives between two combatants so that `higher` has a higher initiative than `lower` */
    private setRelativeInitiative({
        higher,
        lower,
        adjust = lower,
    }: {
        higher: RolledCombatant;
        lower: RolledCombatant;
        adjust?: RolledCombatant;
    }): void {
        if (higher.hasHigherInitiative({ than: lower })) return;
        if (adjust === higher) {
            higher.data.initiative = lower.initiative;
            if (lower.hasHigherInitiative({ than: higher })) {
                higher.data.initiative = lower.initiative + 1;
            }
        } else if (adjust === lower) {
            lower.data.initiative = higher.initiative;
            if (lower.hasHigherInitiative({ than: higher })) {
                lower.data.initiative = higher.initiative - 1;
            }
        }
    }
}
