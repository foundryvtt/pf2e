export {};

declare global {
    /**
     * The UI element which displays the list of Users who are currently playing within the active World.
     */
    class PlayerList extends Application {
        constructor(options: ApplicationOptions);

        /** An internal toggle for whether to show offline players or hide them */
        protected _showOffline: boolean;

        static override get defaultOptions(): ApplicationOptions;

        /* -------------------------------------------- */
        /*  Application Rendering                       */
        /* -------------------------------------------- */

        override render(force?: boolean, options?: RenderOptions): this;

        override getData(options: ApplicationOptions): PlayerListData;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        override activateListeners(html: JQuery): void;

        /** Return the default context options available for the Players application */
        protected _getUserContextOptions(): ContextMenuEntry[];

        /**
         * Toggle display of the Players hud setting for whether or not to display offline players
         * @param event The originating click event
         */
        protected _onToggleOfflinePlayers(event: Event): void;
    }
}

interface PlayerListData {
    users: UserTemplateData[];
    hide: boolean;
    showOffline: boolean;
}

interface UserTemplateData {
    active: boolean;
    isGM: boolean;
    isSelf: boolean;
    charname: string;
    color: HexColorString;
    border: HexColorString;
}
