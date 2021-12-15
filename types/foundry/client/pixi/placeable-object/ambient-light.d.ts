declare class AmbientLight<
    TDocument extends AmbientLightDocument = AmbientLightDocument
> extends PlaceableObject<TDocument> {
    constructor(document: TDocument);

    /** A reference to the PointSource object which defines this light source area of effect */
    source: LightSource<this>;

    /** A reference to the ControlIcon used to configure this light */
    controlIcon: ControlIcon;

    static override embeddedName: "AmbientLight";

    override get bounds(): NormalizedRectangle;

    /** A convenience accessor to the LightData configuration object */
    get config(): foundry.data.LightData;

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

    /* -------------------------------------------- */
    /* Rendering                                    */
    /* -------------------------------------------- */

    override draw(): Promise<this>;

    /** Draw the ControlIcon for the AmbientLight */
    protected _drawControlIcon(): ControlIcon;

    override refresh(): this;

    /** Refresh the display of the ControlIcon for this AmbientLight source */
    refreshControl(): void;

    /* -------------------------------------------- */
    /*  Light Source Management                     */
    /* -------------------------------------------- */

    /** The named identified for the source object associated with this light */
    get sourceId(): `Light.${string}`;

    /**
     * Update the source object associated with this light
     * @param defer   Defer refreshing the LightingLayer to manually call that refresh later.
     * @param deleted Indicate that this light source has been deleted.
     */
    updateSource({ defer, deleted }?: { defer?: boolean; deleted?: boolean }): void;

    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */
    /* -------------------------------------------- */

    protected override _onCreate(
        data: this["document"]["data"]["_source"],
        options: DocumentModificationContext,
        userId: string
    ): void;

    protected override _onUpdate(
        changed: DocumentUpdateData<this["document"]>,
        options: DocumentModificationContext,
        userId: string
    ): void;

    protected override _onDelete(options: DocumentModificationContext, userId: string): void;

    /* -------------------------------------------- */
    /*  Mouse Interaction Handlers                  */
    /* -------------------------------------------- */

    protected override _canHUD(user: User, event: PIXI.InteractionEvent): boolean;

    protected override _canConfigure(user: User, event: PIXI.InteractionEvent): boolean;

    protected override _onClickRight(event: PIXI.InteractionEvent): void;

    protected override _onDragLeftStart(event: PIXI.InteractionEvent): void;

    protected override _onDragLeftMove(event: PIXI.InteractionEvent): void;

    protected override _onDragLeftCancel(event: PIXI.InteractionEvent): void;
}

declare interface AmbientLight {
    get layer(): LightingLayer<this>;
}
