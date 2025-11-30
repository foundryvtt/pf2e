import type { ApplicationRenderContext } from "@client/applications/_types.d.mts";
import type { HandlebarsRenderOptions } from "@client/applications/api/handlebars-application.d.mts";
import { combatantAndTokenDoc } from "@module/doc-helpers.ts";
import type { CombatantPF2e, EncounterPF2e, RolledCombatant } from "@module/encounter/index.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import type { TokenDocumentPF2e } from "@scene/index.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { ErrorPF2e, createHTMLElement, fontAwesomeIcon, htmlQuery, htmlQueryAll, localizeList, localizer } from "@util";
import Sortable from "sortablejs";
import tabs = fa.sidebar.tabs;

interface EncounterMetricsContext {
    visible: boolean;
    threat: { label: string; tooltip: string };
    award: { label: string; tooltip: string };
}

export class EncounterTracker<TEncounter extends EncounterPF2e | null> extends tabs.CombatTracker<TEncounter> {
    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        actions: {
            toggleTarget: EncounterTracker.#onClickToggleTarget,
            toggleNameVisibility: EncounterTracker.#onClickToggleNameVisibility,
        },
    };

    static override PARTS = {
        ...super.PARTS,
        metrics: { template: `${SYSTEM_ROOT}/templates/sidebar/encounter-tracker/metrics.hbs` },
    };

    #sortable: Sortable | null = null;

    protected override _configureRenderOptions(options: Partial<HandlebarsRenderOptions>): void {
        const parts = options.parts ?? [];
        if (parts.includes("tracker") && !parts.includes("metrics")) parts.push("metrics");
        super._configureRenderOptions(options);
    }

    protected override async _preparePartContext(
        partId: string,
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<ApplicationRenderContext> {
        const partContext = await super._preparePartContext(partId, context, options);
        if (partId === "metrics") Object.assign(partContext, { metrics: this.#prepareMetrics() });
        return partContext;
    }

    /** Inject encounter metrics into the header part. */
    #prepareMetrics(): EncounterMetricsContext {
        const notVisible = { visible: false, threat: { label: "", tooltip: "" }, award: { label: "", tooltip: "" } };
        if (!game.user.isGM) return notVisible;
        const metrics = this.viewed?.metrics;
        if (!metrics) return notVisible;

        const localize = localizer("PF2E.Encounter.Metrics");
        const threat = ((): { label: string; tooltip: string } => {
            const label = game.i18n.localize(`PF2E.Encounter.Budget.Threats.${metrics.threat}`);
            const tempContainer = createHTMLElement("div", { innerHTML: localize("Threat", { threat: label }) });
            TextEditorPF2e.convertXMLNode(tempContainer, "threat", { classes: ["value", metrics.threat] });
            const tooltip = localize("Budget", metrics.budget);
            return { label: tempContainer.innerHTML, tooltip };
        })();

        const award = ((): { label: string; tooltip: string } => {
            const tempContainer = createHTMLElement("div", {
                innerHTML: localize("Award.Label", { xp: metrics.award.xp }),
            });
            TextEditorPF2e.convertXMLNode(tempContainer, "award", { classes: ["value"] });
            const numRecipients = metrics.award.recipients.length;
            const tooltip = localize(
                numRecipients === 1
                    ? "Award.Tooltip.Singular"
                    : numRecipients === 4
                      ? "Award.Tooltip.Four"
                      : "Award.Tooltip.Plural",
                { xpPerFour: metrics.budget.spent, recipients: numRecipients },
            );
            return { label: tempContainer.innerHTML, tooltip };
        })();

        return { visible: true, threat, award };
    }

    protected override async _renderHTML(
        context: object,
        options: HandlebarsRenderOptions,
    ): Promise<Record<string, HTMLElement>> {
        const result = await super._renderHTML(context, options);
        if (result.tracker) this.#onRenderTracker(result.tracker);
        return result;
    }

    /** Show encounter analysis data if obtainable */
    protected override async _onRender(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void> {
        await super._onRender(context, options);
        if (options.parts.includes("header")) {
            const metricsPart = this.parts["metrics"];
            metricsPart.remove();
            this.parts["header"].querySelector("nav")?.after(metricsPart);
        }
        if (game.user.isGM) this.#createSortable();
    }

    #onRenderTracker(tracker: HTMLElement) {
        const encounter = this.viewed;
        if (!encounter || !tracker) return;
        const tokenSetsNameVisibility = game.pf2e.settings.tokens.nameVisibility;
        const nameVisibilityButton = tokenSetsNameVisibility
            ? createHTMLElement("button", {
                  classes: ["inline-control", "combatant-control", "icon", "fa-solid", "fa-signature"],
                  dataset: { action: "toggleNameVisibility", tooltip: true },
              })
            : null;
        if (nameVisibilityButton) nameVisibilityButton.type = "button";

        const allyColor = (c: CombatantPF2e<EncounterPF2e>) =>
            c.actor?.hasPlayerOwner ? CONFIG.Canvas.dispositionColors.PARTY : CONFIG.Canvas.dispositionColors.FRIENDLY;

        const combatantRows = tracker.querySelectorAll("li");
        for (const row of combatantRows) {
            const combatantId = row.dataset.combatantId ?? "";
            const combatant = encounter.combatants.get(combatantId, { strict: true });

            // Set each combatant's initiative as a data attribute for use in drag/drop feature
            if (typeof combatant.initiative === "number") row.dataset.initiative = String(combatant.initiative);

            // Highlight the active-turn participant's alliance color
            if (combatant?.actor && this.viewed?.combatant === combatant) {
                const alliance = combatant.actor.alliance;
                const dispositionColor = new Color(
                    alliance === "party"
                        ? allyColor(combatant)
                        : alliance === "opposition"
                          ? CONFIG.Canvas.dispositionColors.HOSTILE
                          : CONFIG.Canvas.dispositionColors.NEUTRAL,
                );
                row.style.cssText = [
                    `--color-border-disposition: ${dispositionColor.toString()}`,
                    `--entry-active-bg: ${dispositionColor.toRGBA(0.1)}`,
                ].join(";\n");
            }

            // Create section for list of users targeting a combatant's token
            const nameHeader = htmlQuery(row, ".token-name > strong");
            if (!nameHeader) continue;
            nameHeader.innerHTML = [
                createHTMLElement("span", { classes: ["name"], children: [nameHeader.innerText] }).outerHTML,
                createHTMLElement("span", { classes: ["users-targeting"] }).outerHTML,
            ].join("");

            // Adjust controls with system extensions
            for (const button of htmlQueryAll(row, ".combatant-controls button")) {
                if (button.dataset.action === "pingCombatant") {
                    // Use an icon for the `pingCombatant` control that looks less like a targeting reticle
                    button.classList.remove("fa-bullseye-arrow");
                    button.classList.add("fa-signal-stream");

                    // Add a `targetCombatant` control after `toggleDefeated`
                    if (game.scenes.viewed?.tokens.has(combatant.token?.id ?? "")) {
                        const targetButton = button.cloneNode(true) as HTMLButtonElement;
                        targetButton.classList.replace("fa-solid", "fa-duotone");
                        targetButton.classList.replace("fa-signal-stream", "fa-location-crosshairs");
                        targetButton.dataset.action = "toggleTarget";
                        targetButton.ariaLabel = game.i18n.localize("COMBAT.ToggleTargeting");
                        button.before(targetButton);
                    }
                }
            }

            this.refreshTargetDisplay(combatant, [tracker]);

            // Hide names in the tracker of combatants with tokens that have unviewable nameplates
            if (tokenSetsNameVisibility && nameVisibilityButton) {
                const nameElement = htmlQuery(nameHeader, "span.name");
                if (nameElement && !game.user.isGM && !combatant.playersCanSeeName) {
                    nameElement.innerText = "";
                    row.querySelector("img.token-image")?.removeAttribute("title");
                }

                if (game.user.isGM && combatant.actor && combatant.actor.alliance !== "party") {
                    const isActive = combatant.playersCanSeeName;
                    const controlButton = nameVisibilityButton.cloneNode(true) as HTMLButtonElement;
                    controlButton.ariaLabel = game.i18n.localize(`PF2E.Encounter.${isActive ? "Hide" : "Reveal"}Name`);
                    controlButton.classList.toggle("active", isActive);
                    row.querySelector(".combatant-controls button[data-action=toggleHidden]")?.after(controlButton);
                    row.classList.toggle("hidden-name", !isActive);
                }
            }
        }
    }

    /** Refresh the list of users targeting a combatant's token as well as the active state of the target toggle */
    refreshTargetDisplay(combatantOrToken: CombatantPF2e | TokenDocumentPF2e, trackers?: HTMLElement[]): void {
        if (!this.viewed || !canvas.ready) return;

        const { combatant, tokenDoc } = combatantAndTokenDoc(combatantOrToken);
        if (combatant?.encounter !== this.viewed || tokenDoc?.combatant !== combatant) {
            return;
        }

        trackers ??= htmlQueryAll(document, "#combat, #combat-popout");
        for (const tracker of trackers) {
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

    /** For some reason, upstream handles these actions in an override of this method. */
    protected override async _onClickAction(event: PointerEvent, target: HTMLElement): Promise<void> {
        const action = target.dataset.action;
        if ((action === "rollNPC" || action === "rollAll") && this.viewed) {
            event.stopPropagation();
            const args = eventToRollParams(event, { type: "check" });
            await this.viewed[action]({ ...args, messageOptions: { rollMode: args.rollMode } });
            return;
        }
        return super._onClickAction(event, target);
    }

    /** Allow CTRL-clicking to make the roll blind */
    protected override async _onCombatantControl(event: PointerEvent, target: HTMLElement): Promise<void> {
        if (!this.viewed) return;
        const action = target.dataset.action;
        const li = target.closest("li");
        const combatant = this.viewed.combatants.get(li?.dataset.combatantId ?? "", { strict: true });
        if (action === "rollInitiative") {
            await this.viewed.rollInitiative([combatant.id], eventToRollParams(event, { type: "check" }));
            return;
        }
        return super._onCombatantControl(event, target);
    }

    /** Replace parent method with system-specific procedure */
    protected override _onToggleDefeatedStatus(combatant: CombatantPF2e<TEncounter>): Promise<void> {
        return combatant.toggleDefeated();
    }

    static async #onClickToggleTarget(
        this: EncounterTracker<EncounterPF2e>,
        event: PointerEvent,
        target: HTMLElement,
    ): Promise<void> {
        const combatantId = target.closest("li")?.dataset.combatantId;
        const combatant = this.viewed.combatants.get(combatantId, { strict: true });
        const tokenDoc = combatant.token;
        if (!tokenDoc) return;

        const isTargeted = game.user.targets.values().some((t) => t.document === tokenDoc);
        if (!tokenDoc.object?.visible) {
            ui.notifications.warn("COMBAT.PingInvisibleToken", { localize: true });
            return;
        }

        tokenDoc.object.setTarget(!isTargeted, { releaseOthers: !event?.shiftKey });
    }

    static async #onClickToggleNameVisibility(
        this: EncounterTracker<EncounterPF2e>,
        _event: PointerEvent,
        target: HTMLElement,
    ): Promise<void> {
        const combatantId = target?.closest("li")?.dataset.combatantId;
        const combatant = this.viewed.combatants.get(combatantId, { strict: true });
        return combatant.toggleNameVisibility();
    }

    /** Create and bind the Sortable instance to the tracker list. */
    #createSortable(): void {
        this.#sortable?.destroy();
        const listEl = <HTMLOListElement | null>this.element.querySelector("ol.combat-tracker");
        if (!listEl) return;
        this.#sortable = Sortable.create(listEl, {
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
            ui.notifications.error("PF2E.Encounter.HasNoInitiativeScore", { format: { actor: dropped.name } });
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
        const tracker = <HTMLOListElement | null>this.element.querySelector("ol.combat-tracker");
        if (!tracker) throw ErrorPF2e("Unexpected failure to retriever tracker DOM element");
        const rows = tracker.querySelectorAll("li");
        const [oldIndex, newIndex] = [event.oldIndex ?? 0, event.newIndex ?? 0];
        const firstRowWithNoRoll = rows.values().find((r) => Number.isNaN(Number(r.dataset.initiative)));

        if (Number.isNaN(Number(row.dataset.initiative))) {
            // Undo drag/drop of unrolled combatant
            if (newIndex > oldIndex) {
                tracker.insertBefore(row, rows[oldIndex]);
            } else {
                tracker.insertBefore(row, rows[oldIndex + 1]);
            }
        } else if (firstRowWithNoRoll && Array.from(rows).indexOf(firstRowWithNoRoll) < newIndex) {
            // Always place a rolled combatant before all other unrolled combatants
            tracker.insertBefore(row, firstRowWithNoRoll);
        }
    }

    #validateDrop(event: Sortable.SortableEvent): void {
        const encounter = this.viewed;
        if (!encounter) throw ErrorPF2e("Unexpected error retrieving combat");
        const { oldIndex, newIndex } = event;
        if (!(typeof oldIndex === "number" && typeof newIndex === "number")) {
            throw ErrorPF2e("Unexpected error retrieving new index");
        }
    }

    /** Retrieve the (rolled) combatants in the real-time order as seen in the DOM */
    #getCombatantsFromDOM(): RolledCombatant<NonNullable<TEncounter>>[] {
        const encounter = this.viewed;
        if (!encounter) throw ErrorPF2e("Unexpected error retrieving combat");
        const rows = <ArrayIterator<HTMLLIElement>>this.element.querySelectorAll("ol.combat-tracker > li").values();
        return rows
            .map((row) => encounter.combatants.get(row.dataset.combatantId, { strict: true }))
            .filter((c): c is RolledCombatant<NonNullable<TEncounter>> => typeof c.initiative === "number")
            .toArray();
    }
}
