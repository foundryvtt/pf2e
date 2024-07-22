export {};

declare global {
    /**
     * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for Tile objects.
     * The TileHUD implementation can be configured and replaced via {@link CONFIG.Tile.hudClass}.
     */
    class TileHUD<TObject extends Tile | undefined = Tile | undefined> extends BasePlaceableHUD<TObject> {
        static override get defaultOptions(): ApplicationOptions;

        override getData(options?: Partial<ApplicationOptions>): TileHUDData<NonNullable<TObject>>;

        override setPosition(options?: ApplicationPosition): void;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        protected override _onClickControl(event: MouseEvent): void;
    }

    type TileHUDData<TObject extends Tile> = BasePlaceableHUDData<TObject> & {
        isVideo: boolean;
        lockedClass: string;
        visibilityClass: string;
        videoIcon: string;
        videoTitle: string;
    };
}
