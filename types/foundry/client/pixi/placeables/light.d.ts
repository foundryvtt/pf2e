import type { PointDarknessSource, PointLightSource } from "../../../client-esm/canvas/sources/module.ts";

declare global {
    class AmbientLight<
        TDocument extends AmbientLightDocument<Scene | null> = AmbientLightDocument<Scene | null>,
    > extends PlaceableObject<TDocument> {
        constructor(document: TDocument);

        /** The area that is affected by this light */
        field: PIXI.Graphics;

        /**
         * A reference to the PointSource object which defines this light or darkness area of effect.
         * This is undefined if the AmbientLight does not provide an active source of light.
         */
        lightSource?: PointDarknessSource<this> | PointLightSource<this>;

        /** A reference to the ControlIcon used to configure this light */
        controlIcon: ControlIcon;

        static override embeddedName: "AmbientLight";

        override get bounds(): PIXI.Rectangle;

        /** A convenience accessor to the LightData configuration object */
        get config(): TDocument["config"];

        /** Test whether a specific AmbientLight source provides global illumination */
        get global(): boolean;

        /** The maximum radius in pixels of the light field */
        get radius(): number;

        /** Get the pixel radius of dim light emitted by this light source */
        get dimRadius(): number;

        /** Get the pixel radius of bright light emitted by this light source */
        get brightRadius(): number;

        /** Is this ambient light is currently visible based on its hidden state and the darkness level of the Scene? */
        get isVisible(): boolean;

        /** Check if the point source is a LightSource instance */
        get isLightSource(): boolean;

        /** Check if the point source is a DarknessSource instance */
        get isDarknessSource(): boolean;

        /** Does this Ambient Light actively emit darkness light given its properties and the current darkness level of the Scene?  */
        get emitsDarkness(): boolean;

        /**
         * Does this Ambient Light actively emit light given its properties and the current darkness level of the Scene?
         */
        get emitsLight(): boolean;

        /* -------------------------------------------- */
        /* Rendering                                    */
        /* -------------------------------------------- */

        protected override _destroy(options?: boolean | PIXI.IDestroyOptions): void;

        protected _draw(): Promise<void>;

        /* -------------------------------------------- */
        /*  Incremental Refresh                         */
        /* -------------------------------------------- */

        protected override _applyRenderFlags(flags: Record<string, boolean>): void;

        /** Draw the ControlIcon for the AmbientLight */
        protected _drawControlIcon(): ControlIcon;

        /** Refresh the display of the ControlIcon for this AmbientLight source */
        refreshControl(): void;

        /* -------------------------------------------- */
        /*  Light Source Management                     */
        /* -------------------------------------------- */

        /**
         * Update the LightSource associated with this AmbientLight object.
         * @param deleted Indicate that this light source has been deleted.
         */
        initializeLightSource({ deleted }?: { deleted?: boolean }): void;

        /** Get the light source data. */
        protected _getLightSourceData(): LightSourceData;

        /** The named identified for the source object associated with this light */
        get sourceId(): `AmbientLight.${string}`;

        /* -------------------------------------------- */
        /*  Socket Listeners and Handlers               */
        /* -------------------------------------------- */

        protected override _onCreate(
            data: TDocument["_source"],
            options: DatabaseCreateOperation<TDocument["parent"]>,
            userId: string,
        ): void;

        protected override _onUpdate(
            changed: DeepPartial<TDocument["_source"]>,
            options: DatabaseUpdateOperation<TDocument["parent"]>,
            userId: string,
        ): void;

        protected override _onDelete(options: DatabaseDeleteOperation<TDocument["parent"]>, userId: string): void;

        /* -------------------------------------------- */
        /*  Mouse Interaction Handlers                  */
        /* -------------------------------------------- */

        protected override _canHUD(user: User, event: PIXI.FederatedEvent): boolean;

        protected override _canConfigure(user: User, event: PIXI.FederatedEvent): boolean;

        protected override _onClickRight(event: PIXI.FederatedEvent): void;

        protected override _onDragLeftStart(event: PIXI.FederatedEvent): void;

        protected override _onDragLeftMove(event: PIXI.FederatedEvent): void;

        protected override _onDragLeftCancel(event: PIXI.FederatedEvent): void;
    }

    interface AmbientLight<TDocument extends AmbientLightDocument<Scene | null> = AmbientLightDocument<Scene | null>>
        extends PlaceableObject<TDocument> {
        get layer(): LightingLayer<this>;
    }
}
