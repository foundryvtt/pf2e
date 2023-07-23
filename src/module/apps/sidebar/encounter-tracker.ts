import { combatantAndTokenDoc } from "@module/doc-helpers.ts";
import { CombatantPF2e, EncounterPF2e, RolledCombatant } from "@module/encounter/index.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { ErrorPF2e, createHTMLElement, fontAwesomeIcon, htmlQuery, htmlQueryAll, localizeList } from "@util";
import Sortable, { SortableEvent } from "sortablejs";

export class EncounterTrackerPF2e<TEncounter extends EncounterPF2e | null> extends CombatTracker<TEncounter> {
    declare sortable: Sortable;

    /** Make the combatants sortable */
    override activateListeners($html: JQuery): void {
        const html = $html[0];
        const tracker = htmlQuery(html, "#combat-tracker");
        if (!tracker) throw ErrorPF2e("No tracker found");

        const encounter = this.viewed;
        if (!encounter) return super.activateListeners($html);

        const tokenSetsNameVisibility = game.settings.get("pf2e", "metagame_tokenSetsNameVisibility");
        const allyColor = (c: CombatantPF2e<EncounterPF2e>) =>
            c.actor?.hasPlayerOwner ? CONFIG.Canvas.dispositionColors.PARTY : CONFIG.Canvas.dispositionColors.FRIENDLY;

        const combatantRows = htmlQueryAll(tracker, "li.combatant");
        for (const row of combatantRows) {
            const combatantId = row.dataset.combatantId ?? "";
            const combatant = encounter.combatants.get(combatantId, { strict: true });

            // Set each combatant's initiative as a data attribute for use in drag/drop feature
            row.dataset.initiative = String(combatant.initiative);

            // Highlight the active-turn participant's alliance color
            if (combatant?.actor && this.viewed?.combatant === combatant) {
                const alliance = combatant.actor.alliance;
                const dispositionColor = new foundry.utils.Color(
                    alliance === "party"
                        ? allyColor(combatant)
                        : alliance === "opposition"
                        ? CONFIG.Canvas.dispositionColors.HOSTILE
                        : CONFIG.Canvas.dispositionColors.NEUTRAL
                );
                row.style.background = dispositionColor.toRGBA(0.1);
                row.style.borderColor = dispositionColor.toString();
            }

            // Create section for list of users targeting a combatant's token
            const nameHeader = htmlQuery(row, ".token-name h4")!;
            nameHeader.innerHTML = [
                createHTMLElement("span", { classes: ["name"], children: [nameHeader.innerText] }).outerHTML,
                createHTMLElement("span", { classes: ["users-targeting"] }).outerHTML,
            ].join("");

            // Adjust controls with system extensions
            for (const control of htmlQueryAll(row, "a.combatant-control")) {
                const controlIcon = htmlQuery(control, "i");
                if (!controlIcon) continue;

                // Ensure even spacing between combatant controls
                controlIcon.classList.remove("fas");
                controlIcon.classList.add("fa-solid", "fa-fw");

                if (control.dataset.control === "pingCombatant") {
                    // Use an icon for the `pingCombatant` control that looks less like a targeting reticle
                    controlIcon.classList.remove("fa-bullseye-arrow");
                    controlIcon.classList.add("fa-signal-stream");

                    // Add a `targetCombatant` control after `toggleDefeated`
                    if (game.scenes.viewed?.tokens.has(combatant.token?.id ?? "")) {
                        const targetControl = createHTMLElement("a", {
                            classes: ["combatant-control"],
                            dataset: { control: "toggleTarget", tooltip: "COMBAT.ToggleTargeting" },
                            children: [fontAwesomeIcon("location-crosshairs", { style: "duotone", fixedWidth: true })],
                        });
                        control.before(targetControl);
                    }
                }
            }

            this.refreshTargetDisplay(combatant);

            // Hide names in the tracker of combatants with tokens that have unviewable nameplates
            if (tokenSetsNameVisibility) {
                if (!game.user.isGM && !combatant.playersCanSeeName) {
                    htmlQuery(nameHeader, "span.name")!.innerText = "";
                    row.querySelector<HTMLImageElement>("img.token-image")?.removeAttribute("title");
                }

                if (game.user.isGM && combatant.actor && combatant.actor.alliance !== "party") {
                    const toggleNameVisibility = document.createElement("a");
                    const isActive = combatant.playersCanSeeName;
                    toggleNameVisibility.classList.add(...["combatant-control", isActive ? "active" : []].flat());
                    toggleNameVisibility.dataset.control = "toggleNameVisibility";
                    toggleNameVisibility.dataset.tooltip = game.i18n.localize(
                        isActive ? "PF2E.Encounter.HideName" : "PF2E.Encounter.RevealName"
                    );
                    const icon = fontAwesomeIcon("signature", { fixedWidth: true });
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
                dragClass: "drag-preview",
                dragoverBubble: true,
                easing: "cubic-bezier(1, 0, 0, 1)",
                ghostClass: "drag-gap",
                onEnd: (event) => this.adjustFinalOrder(event),
                onUpdate: (event) => this.#onDropCombatant(event),
            });

            for (const row of combatantRows) {
                row.classList.add("gm-draggable");
            }
        }

        super.activateListeners($html);
    }

    /** Refresh the list of users targeting a combatant's token as well as the active state of the target toggle */
    refreshTargetDisplay(combatantOrToken: CombatantPF2e | TokenDocumentPF2e): void {
        if (!this.viewed || !canvas.ready) return;

        const { combatant, tokenDoc } = combatantAndTokenDoc(combatantOrToken);
        if (combatant?.encounter !== this.viewed || tokenDoc?.combatant !== combatant) {
            return;
        }

        for (const tracker of htmlQueryAll(document, "#combat, #combat-popout")) {
            const combatantRow = htmlQuery(tracker, `li.combatant[data-combatant-id="${combatant?.id ?? null}"]`);
            if (!combatantRow) return;

            const usersTargetting = game.users.filter((u) =>
                Array.from(u.targets).some((t) => t.document === tokenDoc)
            );

            const userIndicators = usersTargetting.map((user): HTMLElement => {
                const icon = fontAwesomeIcon("location-crosshairs", { style: "duotone", fixedWidth: true });
                icon.style.color = user.color;
                return icon;
            });

            const targetingSection = htmlQuery(combatantRow, ".users-targeting");
            if (targetingSection) {
                targetingSection.innerHTML = userIndicators.map((i) => i.outerHTML).join("");
                targetingSection.dataset.tooltip = game.i18n.format("COMBAT.TargetedBy", {
                    list: localizeList(
                        usersTargetting.map((u) => u.name),
                        { conjunction: "and" }
                    ),
                });
            }

            const targetControlIcon = htmlQuery(combatantRow, "a.combatant-control[data-control=toggleTarget]");
            if (usersTargetting.includes(game.user)) {
                targetControlIcon?.classList.add("active");
            } else {
                targetControlIcon?.classList.remove("active");
            }
        }
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
            const args = eventToRollParams(event);
            await this.viewed[control]({ ...args, messageOptions: { rollMode: args.rollMode } });
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

        switch (control) {
            case "rollInitiative": {
                await this.viewed.rollInitiative([combatant.id], eventToRollParams(event));
                break;
            }
            case "toggleTarget": {
                return this.#onToggleTarget(combatant.token, event.originalEvent);
            }
            case "toggleNameVisibility": {
                return combatant.toggleNameVisibility();
            }
            default:
                return super._onCombatantControl(event);
        }
    }

    /** Replace parent method with system-specific procedure */
    protected override _onToggleDefeatedStatus(combatant: CombatantPF2e<TEncounter>): Promise<void> {
        return combatant.toggleDefeated();
    }

    async #onToggleTarget(tokenDoc: TokenDocumentPF2e | null, event: MouseEvent | undefined): Promise<void> {
        if (!tokenDoc) return;

        const isTargeted = Array.from(game.user.targets).some((t) => t.document === tokenDoc);
        if (!tokenDoc.object?.visible) {
            return ui.notifications.warn("COMBAT.PingInvisibleToken", { localize: true });
        }

        tokenDoc.object.setTarget(!isTargeted, { releaseOthers: !event?.shiftKey });
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
