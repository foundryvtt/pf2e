import type { MeasuredTemplatePF2e } from "../measured-template.ts";

export class TemplateLayerPF2e<
    TObject extends MeasuredTemplatePF2e = MeasuredTemplatePF2e,
> extends TemplateLayer<TObject> {
    /** Preview event listeners that can be referenced across methods */
    #previewListeners: TemplatePreviewEventListeners | null = null;

    async createPreview(createData: Record<string, unknown>): Promise<TObject> {
        const initialLayer = canvas.activeLayer;
        const preview = await this._createPreview({ ...createData, ...canvas.mousePosition }, { renderSheet: false });
        this.#activatePreviewListeners(preview, initialLayer);
        return preview;
    }

    /** Overriden to snap according to the dragged template's type */
    override getSnappedPoint(point: Point): Point {
        const template = this.preview.children.at(0);
        if (!template || !canvas.grid.isSquare) {
            return super.getSnappedPoint(point);
        }

        return canvas.grid.getSnappedPoint(point, {
            mode: template.snappingMode,
            resolution: 1,
        });
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void {
        if (!canvas.ready || !canvas.scene || !canvas.grid.isSquare) {
            return super._onDragLeftMove(event);
        }

        const { destination, preview: template, origin } = event.interactionData;
        if (!template || template.destroyed) return;

        const dimensions = canvas.dimensions;

        // Snap the destination to the grid
        const { x, y } = canvas.grid.getSnappedPoint(destination, { mode: template.snappingMode });
        destination.x = x;
        destination.y = y;
        const ray = new Ray(origin, destination);
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
        const coneMultiplier = shapeType === "cone" ? (canvas.grid.isHexagonal ? 2 : 3) : 1;
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
                    const snap = canvas.grid.isHexagonal ? 60 : 45;
                    preview.document.updateSource({ direction: direction + snap * Math.sign(event.deltaY) });
                    preview.renderFlags.set({ refresh: true });
                }
                lastMove = now;
            },
            wheelAbortController: new AbortController(),
            mousedown: (event: PIXI.FederatedPointerEvent): void => {
                event.stopPropagation();
                const { document, position } = preview;
                this.#deactivatePreviewListeners(initialLayer, event);
                document.updateSource(
                    canvas.grid.isSquare
                        ? canvas.grid.getSnappedPoint(position, {
                              mode: preview.snappingMode,
                          })
                        : super.getSnappedPoint(position),
                );
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
