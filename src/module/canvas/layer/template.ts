import type { InteractionLayer } from "@client/canvas/layers/_module.d.mts";
import type { PlaceablesLayerPointerEvent } from "@client/canvas/layers/base/placeables-layer.d.mts";
import type { Point } from "@common/_types.d.mts";
import type { MeasuredTemplatePF2e } from "../measured-template.ts";

class TemplateLayerPF2e<TObject extends MeasuredTemplatePF2e = MeasuredTemplatePF2e> extends fc.layers
    .TemplateLayer<TObject> {
    /** Preview event listeners that can be referenced across methods */
    #previewListeners: TemplatePreviewEventListeners | null = null;

    async createPreview(createData: DeepPartial<TObject["document"]["_source"]>): Promise<TObject> {
        const initialLayer = canvas.activeLayer;
        const preview = await this._createPreview({ ...createData, ...canvas.mousePosition }, { renderSheet: false });
        this.#activatePreviewListeners(preview, initialLayer);
        return preview;
    }

    /** Overriden to snap according to the dragged template's type */
    override getSnappedPoint(point: Point): Point {
        const template = this.preview?.children.at(0);
        if (!template || !canvas.grid.isSquare) return super.getSnappedPoint(point);
        return canvas.grid.getSnappedPoint(point, { mode: template.snappingMode, resolution: 1 });
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void {
        if (!canvas.ready || !canvas.scene || !canvas.grid.isSquare) {
            return super._onDragLeftMove(event);
        }

        const { destination, preview: template, origin } = event.interactionData;
        if (!template || template.destroyed) {
            return;
        } else if (template.document.t === "rect") {
            return super._onDragLeftMove(event);
        }

        const dimensions = canvas.dimensions;

        // Snap the destination to the grid
        const { x, y } = canvas.grid.getSnappedPoint(destination, { mode: template.snappingMode });
        destination.x = x;
        destination.y = y;
        const ray = new fc.geometry.Ray(origin, destination);
        const ratio = dimensions.size / dimensions.distance;
        const document = template.document;

        // Update the shape data
        if (["cone", "circle"].includes(document.t)) {
            const snapAngle = Math.PI / 4;
            document.direction = Math.toDegrees(Math.floor((ray.angle + Math.PI * 0.125) / snapAngle) * snapAngle);
        } else {
            document.direction = Math.toDegrees(ray.angle);
        }

        const increment = Math.max(ray.distance / ratio, dimensions.distance);
        document.distance = Math.ceil(increment / dimensions.distance) * dimensions.distance;

        // Draw the pending shape
        template.refresh();
    }

    protected override _onMouseWheel(event: WheelEvent): Promise<TObject> | void {
        // Abort if there's no hovered template
        const template = this.hover;
        if (!template || !canvas.scene || !canvas.grid.isSquare) {
            return super._onMouseWheel(event);
        }

        // Determine the incremental angle of rotation from event data
        const shapeType = template.document.t;
        const distance = template.document.distance ?? 5;
        const increment = event.shiftKey || distance <= 30 ? 15 : 5;
        const coneMultiplier = shapeType === "cone" ? 3 : 1;
        const snap = increment * coneMultiplier;
        const delta = snap * Math.sign(event.deltaY);

        return template.rotate(template.document.direction + delta, snap);
    }

    protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): void {
        // Prevent normal drag operations when a preview is active
        if (this.#previewListeners) return;
        return super._onDragLeftStart(event);
    }

    protected override _onDragLeftCancel(event: PlaceablesLayerPointerEvent<TObject>): void {
        // Prevent normal drag operations when a preview is active
        if (this.#previewListeners) return;
        return super._onDragLeftCancel(event);
    }

    #activatePreviewListeners(preview: TObject, initialLayer: InteractionLayer | null): void {
        let lastMove = Date.now(); // Throttle 50ms

        const listeners: TemplatePreviewEventListeners = (this.#previewListeners = {
            lockedInPlace: false,
            wheelAbortController: new AbortController(),
            mousemove: (event: PIXI.FederatedPointerEvent): void => {
                event.stopPropagation();
                const now = Date.now();
                if (now - lastMove <= 50) return;

                canvas._onDragCanvasPan(event);
                const destination = event.getLocalPosition(this);

                if (this.#previewListeners?.lockedInPlace) {
                    const origin = preview.position;
                    const ray = new fc.geometry.Ray(origin, destination);
                    if (ray.distance < canvas.grid.size / 4) return;
                    if (preview.document.t === "cone" && !(event.ctrlKey || event.metaKey)) {
                        const snapAngle = Math.PI / (canvas.grid.isHexagonal ? 6 : 4);
                        preview.document.updateSource({
                            direction: Math.toDegrees(Math.floor(ray.angle / snapAngle + 0.5) * snapAngle),
                        });
                    } else if (preview.document.t === "ray" && !(event.ctrlKey || event.metaKey)) {
                        // Snap lines in 5 degree increments
                        const snapAngle = 0.08726646259971647; // = Math.toRadians(5)
                        preview.document.updateSource({
                            direction: Math.toDegrees(Math.floor(ray.angle / snapAngle) * snapAngle),
                        });
                    } else {
                        preview.document.updateSource({ direction: Math.toDegrees(ray.angle) });
                    }
                } else {
                    const dx = destination.x - preview.document.x;
                    const dy = destination.y - preview.document.y;
                    preview.document.updateSource({ x: preview.document.x + dx, y: preview.document.y + dy });
                }
                preview.renderFlags.set({ refresh: true });
                lastMove = now;
            },
            mousedown: (event: PIXI.FederatedPointerEvent): void => {
                event.stopPropagation();
                const point = this.getSnappedPoint(preview.position);
                preview.document.updateSource({ x: point.x, y: point.y });
                if (
                    this.#previewListeners?.lockedInPlace ||
                    event.shiftKey ||
                    !["ray", "cone"].includes(preview.document.t)
                ) {
                    this.#deactivatePreviewListeners(initialLayer, event);
                    canvas.scene?.createEmbeddedDocuments("MeasuredTemplate", [preview.document.toObject()]);
                } else if (this.#previewListeners) {
                    this.#previewListeners.lockedInPlace = true;
                    preview.renderFlags.set({ refresh: true });
                }
            },
            rightdown: (event: PIXI.FederatedPointerEvent): void => {
                event.stopPropagation();
                if (this.#previewListeners?.lockedInPlace) {
                    this.#previewListeners.lockedInPlace = false;
                    preview.document.updateSource({ direction: 0 });
                    this.#previewListeners.mousemove(event);
                } else {
                    this.#deactivatePreviewListeners(initialLayer, event);
                }
            },
            wheel: (event: Event): void => {
                if (!(event instanceof WheelEvent) || this.#previewListeners?.lockedInPlace) return;
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
                    const snap = canvas.grid.isHexagonal ? 60 : 45;
                    preview.document.updateSource({ direction: direction + snap * Math.sign(event.deltaY) });
                    preview.renderFlags.set({ refresh: true });
                }
                lastMove = now;
            },
        });

        canvas.stage.on("mousemove", listeners.mousemove);
        canvas.stage.on("mousedown", listeners.mousedown);
        canvas.stage.on("rightdown", listeners.rightdown);
        canvas.app.view.addEventListener?.("wheel", listeners.wheel, {
            passive: false,
            signal: listeners.wheelAbortController.signal,
        });
    }

    #deactivatePreviewListeners(
        initialLayer: InteractionLayer | null,
        event: PIXI.FederatedPointerEvent | PlaceablesLayerPointerEvent<TObject>,
    ): void {
        if (this.#previewListeners) {
            canvas.stage.off("mousemove", this.#previewListeners.mousemove);
            canvas.stage.off("mousedown", this.#previewListeners.mousedown);
            canvas.stage.off("rightdown", this.#previewListeners.rightdown);
            this.#previewListeners.wheelAbortController.abort();
            this.#previewListeners = null;
        }
        if ("interactionData" in event) this._onDragLeftCancel(event);
        if (initialLayer !== this) initialLayer?.activate();
    }
}

interface TemplatePreviewEventListeners {
    /** Whether the preview position is locked in place on the canvas */
    lockedInPlace: boolean;
    wheelAbortController: AbortController;
    mousemove: (event: PIXI.FederatedPointerEvent) => void;
    mousedown: (event: PIXI.FederatedPointerEvent) => void;
    rightdown: (event: PIXI.FederatedPointerEvent) => void;
    wheel: (event: Event) => void;
}

export { TemplateLayerPF2e };
