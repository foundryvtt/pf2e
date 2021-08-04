/**
 * A SidebarTab for providing help messages and settings configurations.
 * The Settings sidebar is the furthest-to-right using a triple-cogs icon.
 */
declare class Settings extends SidebarTab {
    /** @override */
    static get defaultOptions(): ApplicationOptions;

    /** @override */
    getData(options?: {}): {
        user: User;
        system: Game["system"];
        coreVersion: string;
        canConfigure: boolean;
        canSetup: boolean;
        coreUpdate: boolean;
        modules: unknown;
    };

    /** @override */
    activateListeners(html: JQuery): void;

    /**
     * Delegate different actions for different settings buttons
     * @param event
     */
    protected _onSettingsButton(event: MouseEvent): void;
}
