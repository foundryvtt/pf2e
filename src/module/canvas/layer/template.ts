import { MeasuredTemplatePF2e } from "..";

export class TemplateLayerPF2e<
    TTemplate extends MeasuredTemplatePF2e = MeasuredTemplatePF2e
> extends TemplateLayer<TTemplate> {
    /** Originally by Furyspark for the PF1e system */
    protected override _onDragLeftMove(event: PlaceablesLayerEvent<TTemplate>): void {
        if (!canvas.scene || !canvas.dimensions) return;

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
            if (["cone", "circle"].includes(template.type)) {
                const direction = ray.angle;
                const snapAngle = Math.PI / (canvas.scene.hasHexGrid ? 6 : 4);
                template.document.direction = Math.toDegrees(
                    Math.floor((direction + Math.PI * 0.125) / snapAngle) * snapAngle
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
            event.data.createState = 2;
        }
    }

    protected override _onMouseWheel(event: WheelEvent): Promise<TTemplate["document"] | undefined> | void {
        // Abort if there's no hovered template
        const template = this.hover;
        if (!(template && canvas.scene)) return;

        // Determine the incremental angle of rotation from event data
        const increment = event.shiftKey ? 15 : 5;
        const coneMultiplier = Number(template.type === "cone") * (canvas.scene.hasHexGrid ? 2 : 3);
        const snap = increment * coneMultiplier;
        const delta = snap * Math.sign(event.deltaY);

        return template.rotate(template.document.direction + delta, snap);
    }
}
