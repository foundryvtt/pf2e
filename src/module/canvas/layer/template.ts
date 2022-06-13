import { MeasuredTemplateDocumentPF2e } from "@scene";
import { MeasuredTemplatePF2e } from "..";

export class TemplateLayerPF2e<
    TTemplate extends MeasuredTemplatePF2e = MeasuredTemplatePF2e
> extends TemplateLayer<TTemplate> {
    /** Can be removed once https://gitlab.com/foundrynet/foundryvtt/-/issues/7132 is closed */
    override async _onDragLeftStart(event: PlaceablesLayerEvent<TTemplate>): Promise<TTemplate | void> {
        if (!canvas.dimensions) return;
        if (!this.options.canDragCreate) {
            delete event.data.createState;
            return;
        }
        event.data.createState = 0;

        // Clear any existing preview
        if (this.preview) this.preview.removeChildren();
        event.data.preview = null;

        // Register the ongoing creation
        event.data.createState = 1;

        // Create the new preview template
        const tool = game.activeTool as MeasuredTemplateType;
        const { origin } = event.data;
        const pos = canvas.grid.getSnappedPosition(origin.x, origin.y, this.gridPrecision);
        origin.x = pos.x;
        origin.y = pos.y;

        // Create the template
        const data: PreCreate<foundry.data.MeasuredTemplateSource> = {
            user: game.user.id,
            t: tool,
            x: pos.x,
            y: pos.y,
            distance: canvas.dimensions.distance,
            direction: 0,
            fillColor: game.user.data.color || "#FF0000",
        };

        if (tool === "cone") {
            data.angle = CONFIG.MeasuredTemplate.defaults.angle;
        } else if (tool === "ray") {
            data.width = canvas.dimensions.distance;
        }

        // Assign the template
        const document = new MeasuredTemplateDocumentPF2e(data, { parent: canvas.scene });
        const template = new MeasuredTemplatePF2e(document) as TTemplate;
        event.data.preview = this.preview.addChild(template);

        return template.draw();
    }

    /** Originally by Furyspark for the PF1e system */
    protected override _onDragLeftMove(event: PlaceablesLayerEvent<TTemplate>): void {
        if (!canvas.dimensions) return;

        // From PlaceablesLayer#_onDragLeftMove
        const preview = event.data.preview;
        if (!preview || preview.destroyed) return;
        if (preview.parent === null) {
            // In theory this should never happen, but rarely does
            this.preview.addChild(preview);
        }
        const createState = event.data.createState ?? 0;

        if (createState >= 1) {
            // Snap the destination to the grid
            const dest = event.data.destination;
            const { x, y } = canvas.grid.getSnappedPosition(dest.x, dest.y, 2);
            dest.x = x;
            dest.y = y;

            // Compute the ray
            const template = event.data.preview;
            if (!template) return;

            const ray = new Ray(event.data.origin, event.data.destination);
            const ratio = canvas.dimensions.size / canvas.dimensions.distance;

            // Update the shape data
            if (["cone", "circle"].includes(template.data.t)) {
                const direction = ray.angle;
                template.data.direction = Math.toDegrees(
                    Math.floor((direction + Math.PI * 0.125) / (Math.PI * 0.25)) * (Math.PI * 0.25)
                );
                const distance = Math.max(ray.distance / ratio, canvas.dimensions.distance);
                template.data.distance = Math.floor(distance / canvas.dimensions.distance) * canvas.dimensions.distance;
            } else {
                template.data.direction = Math.toDegrees(ray.angle);
                template.data.distance = ray.distance / ratio;
            }

            // Draw the pending shape
            template.refresh();
            event.data.createState = 2;
        }
    }

    protected override _onMouseWheel(event: WheelEvent): Promise<TTemplate["document"] | undefined> | void {
        // Abort if there's no hovered template
        const template = this._hover;
        if (!template) return;

        // Determine the incremental angle of rotation from event data
        const snap = template.type === "cone" ? (event.shiftKey ? 45 : 15) : event.shiftKey ? 15 : 5;
        const delta = snap * Math.sign(event.deltaY);
        return template.rotate(template.data.direction + delta, snap);
    }
}
