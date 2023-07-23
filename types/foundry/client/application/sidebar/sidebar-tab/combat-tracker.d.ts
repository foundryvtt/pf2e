declare interface CombatTrackerOptions extends ApplicationOptions {
    id: "combat";
}

declare interface CombatTrackerTurn {
    id: string;
    name: string;
    img: string;
    active: boolean;
    owner: boolean;
    defeated: boolean;
    hidden: boolean;
    initiative: number | null;
    hasRolled: boolean;
    hasResource: boolean;
    resource: object | null;
}

declare interface CombatTrackerData {
    user: User;
    combats: Combat[];
    currentIndex: number;
    combatCount: number;
    hasCombat: boolean;
    combat: Combat | null;
    turns: CombatTrackerTurn[];
    previousId: number | null;
    nextId: number;
    started: boolean;
    control: boolean;
    settings: object;
}

/** The combat and turn order tracker tab */
declare class CombatTracker<
    TCombat extends Combat | null,
    TOptions extends CombatTrackerOptions = CombatTrackerOptions
> extends SidebarTab<TOptions> {
    static override get defaultOptions(): CombatTrackerOptions;

    /** Record a reference to the currently highlighted Token */
    protected _highlighted: CollectionValue<NonNullable<TCombat>["combatants"]>["token"];

    /** Record the currently tracked Combat encounter */
    viewed: TCombat;

    constructor(options?: Partial<TOptions>);

    /** Return an array of Combat encounters which occur within the current Scene. */
    get combats(): NonNullable<TCombat>[];

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    createPopout(): ChatPopout;

    /**
     * Initialize the combat tracker to display a specific combat encounter.
     * If no encounter is provided, the tracker will be initialized with the first encounter in the viewed scene.
     * @param combat The combat encounter to initialize
     * @param render Whether to re-render the sidebar after initialization
     */
    initialize({ combat, render }?: { combat?: Combat | null; render?: boolean }): void;

    /** Scroll the combat log container to ensure the current Combatant turn is centered vertically */
    scrollToTurn(): void;

    override getData(options: CombatTrackerOptions): CombatTrackerData;

    override activateListeners(html: JQuery): void;

    /**
     * Handle new Combat creation request
     * @param event
     */
    protected _onCombatCreate(event: Event): Promise<void>;

    /**
     * Handle a Combat deletion request
     * @param event
     */
    protected _onCombatDelete(event: Event): Promise<void>;

    /**
     * Handle a Combat cycle request
     * @param event
     */
    protected _onCombatCycle(event: Event): Promise<void>;

    /**
     * Handle click events on Combat control buttons
     * @param event The originating mousedown event
     */
    protected _onCombatControl(event: JQuery.ClickEvent<HTMLElement, HTMLElement, HTMLElement>): Promise<void>;

    /**
     * Handle a Combatant control toggle
     * @param event The originating mousedown event
     */
    protected _onCombatantControl(event: JQuery.ClickEvent<HTMLElement, HTMLElement, HTMLElement>): Promise<void>;

    /**
     * Handle toggling the defeated status effect on a combatant Token
     * @param combatant The combatant data being modified
     * @return A Promise that resolves after all operations are complete
     */
    protected _onToggleDefeatedStatus(combatant: Combatant<TCombat>): Promise<void>;

    /**
     * Handle mouse-down event on a combatant name in the tracker
     * @param event The originating mousedown event
     * @return A Promise that resolves once the pan is complete
     */
    protected _onCombatantMouseDown(event: MouseEvent): Promise<void>;

    /** Handle mouse-hover events on a combatant in the tracker */
    protected _onCombatantHoverIn(event: MouseEvent): Promise<void>;

    /**
     * Handle mouse-unhover events for a combatant in the tracker
     */
    protected _onCombatantHoverOut(event: MouseEvent): void;

    /**
     * Attach context menu options to elements in the tracker
     * @param html The HTML element to which context options are attached
     */
    protected _contextMenu(html: HTMLElement): void;

    /**
     * Get the sidebar directory entry context options
     * @return The sidebar entry context options
     * @override
     */
    protected override _getEntryContextOptions(): EntryContextOption[];

    /**
     * Display a dialog which prompts the user to enter a new initiative value for a Combatant
     * @param li
     */
    protected _onConfigureCombatant(li: JQuery<HTMLLIElement>): void;
}
