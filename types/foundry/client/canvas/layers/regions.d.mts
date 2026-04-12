import { RegionDocument, RegionSource, Scene } from "@client/documents/_module.mjs";
import User from "@client/documents/user.mjs";
import { Point } from "@common/_types.mjs";
import { DatabaseCreateOperation } from "@common/abstract/_types.mjs";
import { BaseShapeData } from "@common/data/data.mjs";
import { SceneControl } from "../../applications/ui/scene-controls.mjs";
import Region from "../placeables/region.mjs";
import { CanvasHistoryEvent, PlaceablesLayerOptions, RegionPlacementOptions } from "./_types.mjs";
import PlaceablesLayer, { PlaceablesLayerPointerEvent } from "./base/placeables-layer.mjs";
import TokenLayer from "./tokens.mjs";

/**
 * The Regions Container.
 * @category Canvas
 */
export default class RegionLayer<TObject extends Region = Region> extends PlaceablesLayer<TObject> {
    static override get layerOptions(): PlaceablesLayerOptions;

    static override documentName: "Region";

    override get hookName(): string;

    /**
     * The highlight meshes of the Regions.
     * @internal
     */
    _highlights: PIXI.Container;

    /**
     * The shape clipboard.
     * @internal
     */
    _shapeClipboard: { shape: BaseShapeData | null; cut: boolean };

    /**
     * The placement context.
     * @internal
     */
    _placementContext: {
        data: RegionSource;
        layer: RegionLayer | TokenLayer;
        regionIndex: number;
        regionCount: number;
        preview: Region;
        shapes: BaseShapeData[];
        shape: BaseShapeData;
        create: boolean;
        createOptions: Partial<Omit<DatabaseCreateOperation<null>, "parent">>;
        destroyPreview: boolean;
        allowRotation: boolean;
        allowEmpty: boolean;
        attachToToken: boolean;
        onMove: {
            event: PIXI.FederatedEvent;
            preview: Region;
            document: RegionDocument<Scene>;
            shape: BaseShapeData;
            index: number;
            count: number;
            position: Point;
            snap: boolean;
        };
    };

    /**
     * Is Measured Template Mode enabled?
     */
    get templateMode(): boolean;

    set templateMode(value: boolean);

    /**
     * Is the palette toggle visible?
     * @internal
     */
    _togglePaletteVisible: boolean;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    protected override _deactivate(): void;

    override storeHistory(type: CanvasHistoryEvent["type"], data: object, options: object): void;

    override copyObjects(): TObject[];

    override getZIndex(): number;

    protected override _draw(options?: object): Promise<void>;

    protected override _tearDown(options?: object): Promise<void>;

    /**
     * Highlight the shape or clear the highlight.
     * @param data  The shape to highlight, or null to clear the highlight
     * @internal
     */
    _highlightShape(data: BaseShapeData | null): void;

    static override prepareSceneControls(): SceneControl;

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    /**
     * Place a Region at the cursor.
     * The Region can have multiple shapes but must have at least one.
     * Each shape is placed one after the other in the given order.
     * Only one Region can be placed at a time.
     * The placed Region shapes can be rotated with the mouse wheel unless `allowRotation` is false.
     * Left-click confirms the placement of a shape. Right-click skips the placement of a shape.
     * The Region layer is activated unless the Token layer is active.
     * @param data The data of the Region to place
     * @param options Additional options
     * @returns The Region document that was placed or null if
     *   - the placements of all shapes were skipped unless `allowEmpty` is true,
     *   - the dismiss key was pressed,
     *   - the game was paused, the user is not a GM, and the `create` option is true, or
     *   - the Region creation was rejected by preCreate.
     * @example Place four 40-foot radius circles.
     * ```js
     * const radius = 40 * canvas.dimensions.distancePixels;
     * const shapes = [];
     * for ( let i = 0; i < 4; i++ ) shapes.push({type: "circle", x: 0, y: 0, radius, gridBased: true});
     * await canvas.regions.placeRegion({
     *   name: "Meteor Swarm",
     *   shapes,
     *   color: game.user.color,
     *   restriction: {enabled: true},
     *   levels: [canvas.level.id],
     *   highlightMode: "coverage",
     *   displayMeasurements: true,
     *   visibility: CONST.REGION_VISIBILITY.OBSERVER,
     *   ownership: {[game.user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER}
     * });
     * ```
     * @example Spawn 10 tokens with random actor and random rotation in a placed circle with 30 grid units radius.
     * ```js
     * ui.notifications.info("Choose the placement for the spawn area.");
     * const spawnArea = await canvas.regions.placeRegion({
     *   name: "Spawn Area",
     *   shapes: [{
     *     type: "circle",
     *     x: 0,
     *     y: 0,
     *     radius: canvas.dimensions.distancePixels * 30
     *   }],
     *   restriction: {enabled: true},
     *   levels: [canvas.level.id]
     * }, {create: false});
     * if ( spawnArea ) {
     *   const {count: numTokensToSpawn=0} = await foundry.applications.api.DialogV2.input({
     *    window: {
     *       title: "How many tokens to you want to spawn?"
     *    },
     *    content: `<input type="number" name="count" min="0" step="1" value="10">`
     *   }) ?? {};
     *   const actors = game.actors.contents;
     *   const tokensToSpawn = [];
     *   for ( let i = 0; i < numTokensToSpawn; i++ ) {
     *     const actor = actors[Math.floor(Math.random() * actors.length)];
     *     const token = await actor.getTokenDocument({
     *       rotation: Math.random() * 360
     *     }, {parent: spawnArea.parent});
     *     tokensToSpawn.push(token);
     *   }
     *   const spawnedTokens = await spawnArea.spawnTokens(tokensToSpawn);
     * }
     * ```
     */
    placeRegion(
        data: DeepPartial<RegionSource>,
        options?: RegionPlacementOptions<TObject>,
    ): Promise<TObject["document"] | null>;

    /**
     * Place one or multiple Regions at the cursor.
     * The Region can have multiple shapes but must have at least one.
     * Each Region is placed one after the other in the given order.
     * Each shape of a Region is placed one after the other in the given order.
     * The placed Region shapes can be rotated with the mouse wheel unless `allowRotation` is false.
     * Left-click confirms the placement of a shape. Right-click skips the placement of a shape.
     * @param data The data of the Regions to place
     * @param options Additional options
     * @returns The Region documents that were placed and not rejected by preCreate,
     *   or null if
     *   - the placements of all shapes were skipped unless `allowEmpty` is true,
     *   - the dismiss key was pressed, or
     *   - the game was paused, the user is not a GM, and the `create` option is true.
     * @example Place three 20-foot token emanations.
     * ```js
     * const data = [];
     * for ( let i = 0; i < 3; i++ ) data.push({
     *   name: `Emanation (${i + 1})`,
     *   shapes: [{
     *     type: "emanation",
     *     base: {
     *       type: "token",
     *       x: 0,
     *       y: 0,
     *       width: 1,
     *       height: 1,
     *       shape: CONST.TOKEN_SHAPES.ELLIPSE_1
     *     },
     *     radius: 20 * canvas.dimensions.distancePixels,
     *     gridBased: true
     *   }],
     *   restriction: {enabled: true},
     *   levels: [canvas.level.id],
     *   displayMeasurements: true,
     *   visibility: CONST.REGION_VISIBILITY.OBSERVER,
     *   ownership: {[game.user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER}
     * });
     * await canvas.regions.placeRegions(data, {attachToToken: true});
     */
    placeRegions(
        data: Iterable<DeepPartial<RegionSource>>,
        options?: RegionPlacementOptions<TObject>,
    ): Promise<TObject["document"][] | null>;

    protected override _onClickLeft(event: PlaceablesLayerPointerEvent<TObject>): Promise<void>;

    protected override _onClickLeft2(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _canDragLeftStart(user: User, event: PlaceablesLayerPointerEvent<TObject>): boolean;

    protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftDrop(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftCancel(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onClickRight(event: PlaceablesLayerPointerEvent<TObject>): void;
}
