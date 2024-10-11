/**
 * A SidebarTab for providing help messages and settings configurations.
 * The Settings sidebar is the furthest-to-right using a triple-cogs icon.
 */
declare class Settings extends SidebarTab {
    static override get defaultOptions(): ApplicationOptions;

    override getData(options?: Record<string, unknown>): {
        user: User;
        system: object;
        coreVersion: string;
        canConfigure: boolean;
        canSetup: boolean;
        coreUpdate: boolean;
        modules: unknown;
    };

    override activateListeners(html: JQuery): void;

    /** Delegate different actions for different settings buttons */
    protected _onSettingsButton(event: MouseEvent): void;
}
