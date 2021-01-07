/**
 * The combat and turn order tracker tab
 */
declare class CombatTracker extends SidebarTab {
    //@TODO Declare Classes

    combat: Combat | null;

    /**
     * Handle click events on Combat control buttons
     * @private
     * @param event   The originating mousedown event
     */
    protected _onCombatControl(event: JQuery.ClickEvent): Promise<void>;
}
