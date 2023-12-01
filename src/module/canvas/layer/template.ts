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
        const snaps: Record<string, number | undefined> = { burst: 1 };
        this.#gridPrecision = snaps[areaType ?? ""] ?? 2;
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
        if (!canvas.scene || !canvas.dimensions) return;
        const interaction = event.interactionData;
        const { destination, layerDragState, preview: template, origin } = interaction;

        if (!template || template.destroyed) return;
        if (template.parent === null) {
            // In theory this should never happen, but rarely does
            this.preview.addChild(template);
        }
        const dragState = layerDragState ?? 0;

        if (dragState >= 1) {
            // Snap the destination to the grid
            const { x, y } = canvas.grid.getSnappedPosition(destination.x, destination.y, 2);
            destination.x = x;
            destination.y = y;
            const ray = new Ray(origin, destination);
            const ratio = canvas.dimensions.size / canvas.dimensions.distance;

            // Update the shape data
            if (["cone", "circle"].includes(template.document.t)) {
                const direction = ray.angle;
                const snapAngle = Math.PI / (canvas.scene.hasHexGrid ? 6 : 4);
                template.document.direction = Math.toDegrees(
                    Math.floor((direction + Math.PI * 0.125) / snapAngle) * snapAngle,
                );
                const distance = Math.max(ray.distance / ratio, canvas.dimensions.distance);
                template.document.distance =
                    Math.floor(distance / canvas.dimensions.distance) * canvas.dimensions.distance;
            } else {
                template.document.direction = Math.toDegrees(ray.angle);
                template.document.distance = ray.distance / ratio;
            }

            // Draw the pending shape
            template.refresh();
            event.interactionData.layerDragState = 2;
        }
    }

    protected override _onMouseWheel(event: WheelEvent): Promise<TObject["document"] | undefined> | void {
        // Abort if there's no hovered template
        const template = this.hover;
        if (!(template && canvas.scene)) return;

        // Determine the incremental angle of rotation from event data
        const increment = event.shiftKey ? 15 : 5;
        const coneMultiplier = template.document.t === "cone" ? (canvas.scene.hasHexGrid ? 2 : 3) : 1;
        const snap = increment * coneMultiplier;
        const delta = snap * Math.sign(event.deltaY);

        return template.rotate(template.document.direction + delta, snap);
    }

    #activatePreviewListeners(preview: TObject, initialLayer: CanvasLayer | null): void {
        const listeners: TemplatePreviewEventListeners = (this.#previewListeners = {
            mousemove: (event: PIXI.FederatedPointerEvent): void => {
                event.stopPropagation();
                canvas._onDragCanvasPan(event);
                const destination = event.getLocalPosition(this);
                const dx = destination.x - preview.document.x;
                const dy = destination.y - preview.document.y;
                preview.document.updateSource({ x: preview.document.x + dx, y: preview.document.y + dy });
                preview.renderFlags.set({ refresh: true });
            },
            wheel: (event: Event): void => {
                if (!(event instanceof WheelEvent)) return;
                event.stopPropagation();
                const { direction } = preview.document;

                if (event.ctrlKey || !event.shiftKey) {
                    event.preventDefault();
                    const snap = event.shiftKey ? 15 : 5;
                    preview.document.updateSource({ direction: direction + snap * Math.sign(event.deltaY) });
                    preview.renderFlags.set({ refresh: true });
                } else if (event.shiftKey) {
                    event.preventDefault();
                    const snap =
                        canvas.grid.type >= CONST.GRID_TYPES.HEXODDR && canvas.grid.type <= CONST.GRID_TYPES.HEXEVENQ
                            ? 60
                            : 45;
                    preview.document.updateSource({ direction: direction + snap * Math.sign(event.deltaY) });
                    preview.renderFlags.set({ refresh: true });
                }
            },
            mousedown: (event: PIXI.FederatedPointerEvent): void => {
                event.stopPropagation();
                const { position } = preview;
                preview.snapForShape();
                preview.document.updateSource(canvas.grid.getSnappedPosition(position.x, position.y));
                this.#deactivatePreviewListeners(preview, initialLayer);
                canvas.scene?.createEmbeddedDocuments("MeasuredTemplate", [preview.document.toObject()]);
            },
            rightdown: (event: PIXI.FederatedPointerEvent): void => {
                event.stopPropagation();
                this.#deactivatePreviewListeners(preview, initialLayer);
            },
        });

        canvas.stage.on("mousemove", listeners.mousemove);
        canvas.app.view.addEventListener?.("wheel", listeners.wheel);
        canvas.stage.once("mousedown", listeners.mousedown);
        canvas.stage.once("rightdown", listeners.rightdown);
    }

    #deactivatePreviewListeners(preview: TObject, initialLayer: CanvasLayer | null): void {
        if (this.#previewListeners) {
            canvas.stage.off("mousemove", this.#previewListeners.mousemove);
            canvas.stage.removeEventListener?.("wheel", this.#previewListeners.wheel);
            canvas.stage.off("mousedown", this.#previewListeners.mousedown);
            canvas.stage.off("rightdown", this.#previewListeners.rightdown);
        }
        preview.destroy();
        initialLayer?.activate();
    }
}

interface TemplatePreviewEventListeners {
    mousemove: (event: PIXI.FederatedPointerEvent) => void;
    wheel: (event: Event) => void;
    mousedown: (event: PIXI.FederatedPointerEvent) => void;
    rightdown: (event: PIXI.FederatedPointerEvent) => void;
}
