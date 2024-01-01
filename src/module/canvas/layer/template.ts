import type { EffectAreaType } from "@item/spell/types.ts";
import type { MeasuredTemplatePF2e } from "../measured-template.ts";

export class TemplateLayerPF2e<
    TObject extends MeasuredTemplatePF2e = MeasuredTemplatePF2e,
> extends TemplateLayer<TObject> {
    /** Preview event listeners that can be referenced across methods */
    #previewListeners: TemplatePreviewEventListeners | null = null;

    #gridPrecision = 2;

    override get gridPrecision(): number {
        return this.#gridPrecision;
    }

    /** Set a grid-snapping precision appropriate for an effect area type */
    snapFor(areaType: EffectAreaType | null): void {
        if (areaType && canvas.grid.type === CONST.GRID_TYPES.SQUARE) {
            this.#gridPrecision = areaType === "burst" ? 1 : 2;
        } else {
            this.#gridPrecision = 2;
        }
    }

    async createPreview(createData: Record<string, unknown>): Promise<TObject> {
        const initialLayer = canvas.activeLayer;
        const preview = await this._createPreview({ ...createData, ...canvas.mousePosition }, { renderSheet: false });
        this.#activatePreviewListeners(preview, initialLayer);
        return preview;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void {
        if (!canvas.ready || !canvas.scene || canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) {
            return super._onDragLeftMove(event);
        }

        const { destination, layerDragState, preview: template, origin } = event.interactionData;
        const dragState = layerDragState ?? 0;
        if (!template || template.destroyed || dragState === 0) return;

        this.snapFor(template.areaType);
        const dimensions = canvas.dimensions;

        // Snap the destination to the grid
        const { x, y } = canvas.grid.getSnappedPosition(destination.x, destination.y, this.gridPrecision);
        destination.x = x;
        destination.y = y;
        const ray = new Ray(origin, destination);
        const ratio = dimensions.size / dimensions.distance;
        const { document } = template;

        // Update the shape data
        if (["cone", "circle"].includes(document.t)) {
            const snapAngle = Math.PI / (canvas.scene.hasHexGrid ? 6 : 4);
            document.direction = Math.toDegrees(Math.floor((ray.angle + Math.PI * 0.125) / snapAngle) * snapAngle);
        } else {
            document.direction = Math.toDegrees(ray.angle);
        }

        const increment = Math.max(ray.distance / ratio, dimensions.distance);
        document.distance = Math.ceil(increment / dimensions.distance) * dimensions.distance;

        // Draw the pending shape
        template.refresh();
        event.interactionData.layerDragState = 2;
    }

    protected override _onMouseWheel(event: WheelEvent): Promise<TObject["document"] | undefined> | void {
        // Abort if there's no hovered template
        const template = this.hover;
        if (!template || !canvas.scene || canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) {
            return super._onMouseWheel(event);
        }

        // Determine the incremental angle of rotation from event data
        const shapeType = template.document.t;
        const distance = template.document.distance ?? 5;
        const increment = event.shiftKey || distance <= 30 ? 15 : 5;
        const coneMultiplier = shapeType === "cone" ? (canvas.scene.hasHexGrid ? 2 : 3) : 1;
        const snap = increment * coneMultiplier;
        const delta = snap * Math.sign(event.deltaY);

        return template.rotate(template.document.direction + delta, snap);
    }

    #activatePreviewListeners(preview: TObject, initialLayer: InteractionLayer | null): void {
        let lastMove = Date.now(); // Throttle 25ms

        const listeners: TemplatePreviewEventListeners = (this.#previewListeners = {
            mousemove: (event: PIXI.FederatedPointerEvent): void => {
                event.stopPropagation();
                const now = Date.now();
                if (now - lastMove <= 25) return;

                canvas._onDragCanvasPan(event);
                const destination = event.getLocalPosition(this);
                const dx = destination.x - preview.document.x;
                const dy = destination.y - preview.document.y;
                preview.document.updateSource({ x: preview.document.x + dx, y: preview.document.y + dy });
                preview.renderFlags.set({ refresh: true });
                lastMove = now;
            },
            wheel: (event: Event): void => {
                if (!(event instanceof WheelEvent)) return;
                event.preventDefault();
                event.stopPropagation();
                const now = Date.now();
                if (now - lastMove <= 25) return;

                const { direction } = preview.document;
                const distance = preview.document.distance ?? 5;

                if (event.ctrlKey) {
                    const snap = event.shiftKey || distance <= 30 ? 15 : 5;
                    preview.document.updateSource({ direction: direction + snap * Math.sign(event.deltaY) });
                    preview.renderFlags.set({ refresh: true });
                } else if (event.shiftKey) {
                    const snap =
                        canvas.grid.type >= CONST.GRID_TYPES.HEXODDR && canvas.grid.type <= CONST.GRID_TYPES.HEXEVENQ
                            ? 60
                            : 45;
                    preview.document.updateSource({ direction: direction + snap * Math.sign(event.deltaY) });
                    preview.renderFlags.set({ refresh: true });
                }
                lastMove = now;
            },
            wheelAbortController: new AbortController(),
            mousedown: (event: PIXI.FederatedPointerEvent): void => {
                event.stopPropagation();
                preview.snapForShape();
                const { document, position } = preview;
                this.#deactivatePreviewListeners(initialLayer, event);
                document.updateSource(canvas.grid.getSnappedPosition(position.x, position.y, this.gridPrecision));
                canvas.scene?.createEmbeddedDocuments("MeasuredTemplate", [document.toObject()]);
            },
            rightdown: (event: PIXI.FederatedPointerEvent): void => {
                event.stopPropagation();
                this.#deactivatePreviewListeners(initialLayer, event);
            },
        });

        canvas.stage.on("mousemove", listeners.mousemove);
        canvas.app.view.addEventListener?.("wheel", listeners.wheel, {
            passive: false,
            signal: listeners.wheelAbortController.signal,
        });
        canvas.stage.once("mousedown", listeners.mousedown);
        canvas.stage.once("rightdown", listeners.rightdown);
    }

    #deactivatePreviewListeners(initialLayer: InteractionLayer | null, event: PIXI.FederatedPointerEvent): void {
        this._onDragLeftCancel(event);
        if (this.#previewListeners) {
            canvas.stage.off("mousemove", this.#previewListeners.mousemove);
            canvas.stage.off("mousedown", this.#previewListeners.mousedown);
            canvas.stage.off("rightdown", this.#previewListeners.rightdown);
            this.#previewListeners.wheelAbortController.abort();
            this.#previewListeners = null;
        }
        if (initialLayer !== this) initialLayer?.activate();
    }
}

interface TemplatePreviewEventListeners {
    mousemove: (event: PIXI.FederatedPointerEvent) => void;
    wheel: (event: Event) => void;
    wheelAbortController: AbortController;
    mousedown: (event: PIXI.FederatedPointerEvent) => void;
    rightdown: (event: PIXI.FederatedPointerEvent) => void;
}
