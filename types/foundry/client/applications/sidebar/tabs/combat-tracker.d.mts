import { ApplicationConfiguration, ApplicationRenderContext } from "@client/applications/_types.mjs";
import { ContextMenuEntry } from "@client/applications/ux/context-menu.mjs";
import { Token } from "@client/canvas/placeables/_module.mjs";
import { Combat, Combatant } from "@client/documents/_module.mjs";
import HandlebarsApplicationMixin, {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../../api/handlebars-application.mjs";
import AbstractSidebarTab from "../sidebar-tab.mjs";

/**
 * An Application that manages switching between Combats and tracking the Combatants in those Combats.
 * @extends {AbstractSidebarTab}
 * @mixes HandlebarsApplication
 */
export default class CombatTracker<TCombat extends Combat | null = Combat | null> extends HandlebarsApplicationMixin(
    AbstractSidebarTab,
) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override tabName: "combat";

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The list combats applicable to the active Scene.
     */
    get combats(): NonNullable<TCombat>[];

    /**
     * Record the currently tracked combat encounter.
     */
    get viewed(): TCombat;

    set viewed(combat);

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _configureRenderOptions(options: Partial<HandlebarsRenderOptions>): void;

    /**
     * Format a tooltip for displaying overflowing effects.
     * @param effects The effect names and icons.
     */
    protected _formatEffectsTooltip(effects: { img: string; name: string }[]): string;

    /**
     * Retrieve a source image for a combatant. If it is a video, use the first frame.
     * @param combatant The Combatant.
     * @returns The image URL.
     * @protected
     */
    protected _getCombatantThumbnail(combatant: Combatant): Promise<string>;

    protected override _onFirstRender(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    protected override _preparePartContext(
        partId: string,
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<ApplicationRenderContext>;

    /**
     * Prepare render context for the footer part.
     */
    protected _prepareCombatContext(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    /**
     * Prepare render context for the tracker part.
     */
    protected _prepareTrackerContext(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    /**
     * Prepare render context for a single entry in the combat tracker.
     * @param combat The active combat.
     * @param combatant The Combatant whose turn is being prepared.
     * @param index The index of this entry in the turn order.
     */
    protected _prepareTurnContext(combat: NonNullable<TCombat>, combatant: Combatant, index: number): Promise<object>;

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    protected override _attachFrameListeners(): void;

    /**
     * Get context menu entries for Combatants in the tracker.
     */
    protected _getEntryContextOptions(): ContextMenuEntry[];

    /**
     * Get context menu entries for Combat in the tracker.
     */
    protected _getCombatContextOptions(): ContextMenuEntry[];

    protected override _onClickAction(event: PointerEvent, target: HTMLElement): Promise<void>;

    /**
     * Cycle to a different combat encounter in the tracker.
     * @param event The triggering event.
     * @param target The action target element.
     */
    protected _onCombatCycle(event: PointerEvent, target: HTMLElement): Promise<Combat>;

    /**
     * Create a new combat.
     * @param event The triggering event.
     * @param target The action target element.
     */
    protected _onCombatCreate(event: PointerEvent, target: HTMLElement): Promise<void>;

    /**
     * Handle performing some action for an individual combatant.
     * @param event The triggering event.
     * @param target The action target element.
     */
    protected _onCombatantControl(event: PointerEvent, target: HTMLElement): Promise<void>;

    /**
     * Handle hovering over a combatant in the tracker.
     * @param event The triggering event.
     */
    protected _onCombatantHoverIn(event: PointerEvent): void;

    /**
     * Handle hovering out a combatant in the tracker.
     * @param event The triggering event.
     */
    protected _onCombatantHoverOut(event: PointerEvent): void;

    /**
     * Handle activating a combatant in the tracker.
     * @param event The triggering event.
     * @param target The action target element.
     */
    protected _onCombatantMouseDown(event: PointerEvent, target: HTMLElement): void;

    /**
     * Handle panning to a combatant's token.
     * @param combatant The combatant.
     */
    protected _onPanToCombatant(combatant: Combatant): Promise<boolean>;

    /**
     * Handle pinging a combatant's token.
     * @param combatant The combatant.
     */
    protected _onPingCombatant(combatant: Combatant): Promise<boolean>;

    /**
     * Handle rolling initiative for a single combatant.
     * @param combatant The combatant.
     */
    protected _onRollInitiative(combatant: Combatant): Promise<Combat>;

    /**
     * Handle toggling the defeated status effect on a combatant token.
     * @param combatant The combatant.
     */
    protected _onToggleDefeatedStatus(combatant: Combatant): Promise<void>;

    /**
     * Toggle a combatant's hidden state in the tracker.
     * @param combatant The combatant.
     */
    protected _onToggleHidden(combatant: Combatant): Promise<Combatant | undefined>;

    /**
     * Handle updating a combatant's initiative in-sheet.
     * @param event The triggering change event.
     */
    protected _onUpdateInitiative(event: Event): Promise<Combatant<Combat> | undefined> | undefined;

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    /**
     * Highlight a hovered combatant in the tracker.
     * @param combatant The Combatant.
     * @param hover Whether they are being hovered in or out.
     */
    hoverCombatant(combatant: Combatant, hover: boolean): void;

    /**
     * Is the token of the combatant visible?
     * @param token The token of the combatant
     * @returns Is the token visible?
     */
    protected _isTokenVisible(token: Token): boolean;

    /**
     * Scroll to the current combatant in the combat log.
     */
    scrollToTurn(): void;
}
