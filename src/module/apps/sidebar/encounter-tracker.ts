import { combatantAndTokenDoc } from "@module/doc-helpers.ts";
import type { CombatantPF2e, EncounterPF2e, RolledCombatant } from "@module/encounter/index.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import type { TokenDocumentPF2e } from "@scene/index.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import {
    ErrorPF2e,
    createHTMLElement,
    fontAwesomeIcon,
    htmlQuery,
    htmlQueryAll,
    localizeList,
    localizer,
    parseHTML,
} from "@util";
import Sortable from "sortablejs";
import tabs = fa.sidebar.tabs;

export class EncounterTrackerPF2e<TEncounter extends EncounterPF2e | null> extends tabs.CombatTracker<TEncounter> {
    #sortable: Sortable | null = null;

    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        actions: {
            toggleTarget: EncounterTrackerPF2e.#onToggleTarget,
        },
    };

    protected override async _renderHTML(
        context: object,
        options: fa.api.HandlebarsRenderOptions,
    ): Promise<Record<string, HTMLElement>> {
        const rendered = await super._renderHTML(context, options);

        if (rendered["header"]) {
            rendered["header"].dataset.combatId = this.viewed?.id;
        }

        const metrics = this.viewed?.metrics;
        if (options.parts.includes("header") && game.user.isGM && metrics) {
            const localize = localizer("PF2E.Encounter.Metrics");
            const threat = ((): { label: string; tooltip: string } => {
                const label = game.i18n.localize(`PF2E.Encounter.Budget.Threats.${metrics.threat}`);
                const tooltip = localize("Budget", metrics.budget);
                const tempContainer = createHTMLElement("div", { innerHTML: localize("Threat", { threat: label }) });
                TextEditorPF2e.convertXMLNode(tempContainer, "threat", { classes: ["value", metrics.threat] });
                return { label: tempContainer.innerHTML, tooltip };
            })();

            const award = ((): { label: string; tooltip: string } => {
                const label = localize("Award.Label", { xp: metrics.award.xp });
                const numRecipients = metrics.award.recipients.length;
                const tooltip = localize(
                    numRecipients === 1
                        ? "Award.Tooltip.Singular"
                        : numRecipients === 4
                          ? "Award.Tooltip.Four"
                          : "Award.Tooltip.Plural",
                    { xpPerFour: metrics.budget.spent, recipients: numRecipients },
                );
                return { label, tooltip };
            })();

            const templatePath = "systems/pf2e/templates/sidebar/encounter-tracker/threat-award.hbs";
            const threatAward = parseHTML(await fa.handlebars.renderTemplate(templatePath, { threat, award }));
            htmlQuery(rendered["header"], "nav.encounters")?.after(threatAward);
        }

        const encounter = this.viewed;
        if (options.parts.includes("tracker") && encounter) {
            const tracker = rendered["tracker"];

            const tokenSetsNameVisibility = game.pf2e.settings.tokens.nameVisibility;
            const allyColor = (c: CombatantPF2e<EncounterPF2e>) =>
                c.actor?.hasPlayerOwner
                    ? CONFIG.Canvas.dispositionColors.PARTY
                    : CONFIG.Canvas.dispositionColors.FRIENDLY;

            const combatantRows = htmlQueryAll(tracker, "li.combatant");
            for (const row of combatantRows) {
                const combatantId = row.dataset.combatantId ?? "";
                const combatant = encounter.combatants.get(combatantId, { strict: true });

                // Set each combatant's initiative as a data attribute for use in drag/drop feature
                row.dataset.initiative = String(combatant.initiative);

                // Highlight the active-turn participant's alliance color
                if (combatant?.actor && this.viewed?.combatant === combatant) {
                    const alliance = combatant.actor.alliance;
                    const dispositionColor = new fu.Color(
                        alliance === "party"
                            ? allyColor(combatant)
                            : alliance === "opposition"
                              ? CONFIG.Canvas.dispositionColors.HOSTILE
                              : CONFIG.Canvas.dispositionColors.NEUTRAL,
                    );
                    row.style.cssText = `--color-border-highlight: ${dispositionColor.toString()}`;
                    row.style.background = dispositionColor.toRGBA(0.1);
                }

                // Create section for list of users targeting a combatant's token
                const nameHeader = htmlQuery(row, ".token-name > .name");
                if (!nameHeader) continue;
                const container = createHTMLElement("div", {
                    classes: ["name-container"],
                    children: [
                        createHTMLElement("span", { classes: ["name"], children: [nameHeader.innerText] }),
                        createHTMLElement("span", { classes: ["users-targeting"] }),
                    ],
                });
                nameHeader.replaceWith(container);

                // Adjust controls with system extensions
                for (const control of htmlQueryAll(row, "button.combatant-control")) {
                    if (control.dataset.action === "pingCombatant") {
                        // Use an icon for the `pingCombatant` control that looks less like a targeting reticle
                        control.classList.remove("fa-bullseye-arrow");
                        control.classList.add("fa-signal-stream");

                        // Add a `targetCombatant` control after `toggleDefeated`
                        if (game.scenes.viewed?.tokens.has(combatant.token?.id ?? "")) {
                            const targetControl = createHTMLElement("button", {
                                classes: [
                                    "inline-control",
                                    "combatant-control",
                                    "icon",
                                    "fa-duotone",
                                    "fa-location-crosshairs",
                                ],
                                dataset: { action: "toggleTarget", tooltip: "COMBAT.ToggleTargeting" },
                            });
                            control.before(targetControl);
                        }
                    }
                }

                EncounterTrackerPF2e.refreshTargetDisplay(combatant, [tracker]);

                // Hide names in the tracker of combatants with tokens that have unviewable nameplates
                if (tokenSetsNameVisibility) {
                    const nameElement = htmlQuery(nameHeader, "span.name");
                    if (nameElement && !game.user.isGM && !combatant.playersCanSeeName) {
                        nameElement.innerText = "";
                        row.querySelector("img.token-image")?.removeAttribute("title");
                    }

                    if (game.user.isGM && combatant.actor && combatant.actor.alliance !== "party") {
                        const toggleNameVisibility = document.createElement("a");
                        const isActive = combatant.playersCanSeeName;
                        toggleNameVisibility.classList.add(...["combatant-control", isActive ? "active" : []].flat());
                        toggleNameVisibility.dataset.control = "toggleNameVisibility";
                        toggleNameVisibility.dataset.tooltip = game.i18n.localize(
                            isActive ? "PF2E.Encounter.HideName" : "PF2E.Encounter.RevealName",
                        );
                        const icon = fontAwesomeIcon("signature", { fixedWidth: true });
                        toggleNameVisibility.append(icon);

                        row
                            .querySelector('.combatant-controls a[data-control="toggleHidden"]')
                            ?.after(toggleNameVisibility);

                        if (!isActive) {
                            row.classList.add("hidden-name");
                        }
                    }
                }
            }

            // Defer to Combat Enhancements module if in use
            if (game.user.isGM && !game.modules.get("combat-enhancements")?.active) {
                this.#sortable?.destroy();
                this.#sortable = Sortable.create(tracker, {
                    animation: 200,
                    dataIdAttr: "data-combatant-id",
                    direction: "vertical",
                    dragClass: "drag-preview",
                    dragoverBubble: true,
                    easing: "cubic-bezier(1, 0, 0, 1)",
                    ghostClass: "drag-gap",
                    onEnd: this.#adjustFinalOrder.bind(this),
                    onUpdate: this.#onDropCombatant.bind(this),
                });

                for (const row of combatantRows) {
                    row.classList.add("gm-draggable");
                }
            }
        }

        return rendered;
    }

    /** Refresh the list of users targeting a combatant's token as well as the active state of the target toggle */
    static refreshTargetDisplay(combatantOrToken: CombatantPF2e | TokenDocumentPF2e, trackers?: HTMLElement[]): void {
        if (!canvas.ready) return;

        const { combatant, tokenDoc } = combatantAndTokenDoc(combatantOrToken);
        trackers ??= htmlQueryAll(document, "#combat, #combat-popout");
        for (const tracker of trackers) {
            const combat = game.combats.get(htmlQuery(tracker, ".combat-tracker-header")?.dataset.combatId ?? "");
            if (!combat || combatant?.encounter !== combat || tokenDoc?.combatant !== combatant) continue;
            const combatantRow = htmlQuery(tracker, `li.combatant[data-combatant-id="${combatant?.id ?? null}"]`);
            if (!combatantRow) return;

            const usersTargetting = game.users.filter((u) =>
                Array.from(u.targets).some((t) => t.document === tokenDoc),
            );

            const userIndicators = usersTargetting.map((user): HTMLElement => {
                const icon = fontAwesomeIcon("location-crosshairs", { style: "duotone", fixedWidth: true });
                icon.style.color = user.color.toString();
                return icon;
            });

            const targetingSection = htmlQuery(combatantRow, ".users-targeting");
            if (targetingSection) {
                targetingSection.innerHTML = userIndicators.map((i) => i.outerHTML).join("");
                targetingSection.dataset.tooltip = game.i18n.format("COMBAT.TargetedBy", {
                    list: localizeList(
                        usersTargetting.map((u) => u.name),
                        { conjunction: "and" },
                    ),
                });
            }

            const targetControlButton = htmlQuery(combatantRow, "button.combatant-control[data-action=toggleTarget]");
            if (usersTargetting.includes(game.user)) {
                targetControlButton?.classList.add("active");
            } else {
                targetControlButton?.classList.remove("active");
            }
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _onClickAction(event: PointerEvent, button: HTMLElement): Promise<void> {
        const action = button.dataset.action;
        // Allow CTRL-clicking to make the rolls blind
        if ((action === "rollNPC" || action === "rollAll") && this.viewed) {
            event.stopPropagation();
            const args = eventToRollParams(event, { type: "check" });
            await this.viewed[action]({ ...args, messageOptions: { rollMode: args.rollMode } });
            return;
        }
        return super._onClickAction(event, button);
    }

    protected override async _onCombatantControl(event: PointerEvent, button: HTMLElement): Promise<void> {
        event.stopPropagation();
        if (!this.viewed) return;

        const action = button.dataset.action;
        const li = button.closest<HTMLLIElement>(".combatant");
        const combatant = this.viewed.combatants.get(li?.dataset.combatantId ?? "", { strict: true });

        switch (action) {
            case "rollInitiative": {
                await this.viewed.rollInitiative([combatant.id], eventToRollParams(event, { type: "check" }));
                break;
            }
            case "toggleNameVisibility": {
                return combatant.toggleNameVisibility();
            }
            default:
                return super._onCombatantControl(event, button);
        }
    }

    /** Replace parent method with system-specific procedure */
    protected override _onToggleDefeatedStatus(combatant: CombatantPF2e<TEncounter>): Promise<void> {
        return combatant.toggleDefeated();
    }

    static async #onToggleTarget(event: PointerEvent, button: HTMLElement): Promise<void> {
        const tracker = button.closest<HTMLElement>("#combat, #combat-popout");
        if (!tracker) return;
        const combat = game.combats.get(htmlQuery(tracker, ".combat-tracker-header")?.dataset.combatId, {
            strict: true,
        });
        const li = button.closest<HTMLLIElement>(".combatant");
        const combatant = combat.combatants.get(li?.dataset.combatantId ?? "", { strict: true });
        const tokenDoc = combatant.token;
        if (!tokenDoc) return;

        const isTargeted = Array.from(game.user.targets).some((t) => t.document === tokenDoc);
        if (!tokenDoc.object?.visible) {
            ui.notifications.warn("COMBAT.PingInvisibleToken", { localize: true });
            return;
        }

        tokenDoc.object.setTarget(!isTargeted, { releaseOthers: !event?.shiftKey });
    }

    /** Handle the drop event of a dragged & dropped combatant */
    async #onDropCombatant(event: Sortable.SortableEvent): Promise<void> {
        this.#validateDrop(event);

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

        const newOrder = this.#getCombatantsFromDOM();
        const oldOrder = encounter.turns.filter(
            (c): c is RolledCombatant<NonNullable<TEncounter>> => c.initiative !== null,
        );
        // Exit early if the order wasn't changed
        if (newOrder.every((c) => newOrder.indexOf(c) === oldOrder.indexOf(c))) return;

        this.#setInitiativeFromDrop(newOrder, dropped);
        await this.#saveNewOrder(newOrder);
    }

    #setInitiativeFromDrop(
        newOrder: RolledCombatant<NonNullable<TEncounter>>[],
        dropped: RolledCombatant<NonNullable<TEncounter>>,
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
    async #saveNewOrder(newOrder: RolledCombatant<NonNullable<TEncounter>>[]): Promise<void> {
        await this.viewed?.setMultipleInitiatives(
            newOrder.map((c) => ({
                id: c.id,
                value: c.initiative,
                overridePriority: c.overridePriority(c.initiative),
            })),
        );
    }

    /** Adjust the final order of combatants if necessary, keeping unrolled combatants at the bottom */
    #adjustFinalOrder(event: Sortable.SortableEvent): void {
        const row = event.item;
        const tracker = this.element.querySelector<HTMLOListElement>("ol[data-application-part=tracker]");
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

    #validateDrop(event: Sortable.SortableEvent): void {
        const { combat } = game;
        if (!combat) throw ErrorPF2e("Unexpected error retrieving combat");

        const { oldIndex, newIndex } = event;
        if (!(typeof oldIndex === "number" && typeof newIndex === "number")) {
            throw ErrorPF2e("Unexpected error retrieving new index");
        }
    }

    /** Retrieve the (rolled) combatants in the real-time order as seen in the DOM */
    #getCombatantsFromDOM(): RolledCombatant<NonNullable<TEncounter>>[] {
        const { combat } = game;
        if (!combat) throw ErrorPF2e("Unexpected error retrieving combat");

        const tracker = this.element.querySelector<HTMLOListElement>("ol[data-application-part=tracker]");
        if (!tracker) throw ErrorPF2e("Unexpected failure to retriever tracker DOM element");

        return Array.from(tracker.querySelectorAll<HTMLLIElement>("li.combatant"))
            .map((row) => row.getAttribute("data-combatant-id") ?? "")
            .map((id) => combat.combatants.get(id, { strict: true }))
            .filter((c): c is RolledCombatant<NonNullable<TEncounter>> => typeof c.initiative === "number");
    }
}
