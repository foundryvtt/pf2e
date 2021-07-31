// Code taken from Furyspark's Pathfinder 1st edition system with permission.
// @ts-nocheck

import { MeasuredTemplatePF2e } from '@module/canvas';
import { MeasuredTemplateDocumentPF2e } from '@module/scene';

function degtorad(degrees: number) {
    return (degrees * Math.PI) / 180;
}

// Use 90 degrees cone in PF2e style
TemplateLayer.prototype._onDragLeftStart = function _onDragLeftStart(event: PIXI.InteractionEvent) {
    PlaceablesLayer.prototype._onDragLeftStart.call(this, event);

    // Create the new preview template
    const tool = game.activeTool;
    const origin = event.data.origin;
    const pos = canvas.grid.getSnappedPosition(origin.x, origin.y, 2);
    origin.x = pos.x;
    origin.y = pos.y;

    // Create the template
    const data: PreCreate<foundry.data.MeasuredTemplateSource> = {
        user: game.user.id,
        t: tool,
        x: pos.x,
        y: pos.y,
        distance: 5,
        direction: 0,
        fillColor: game.user.data.color || '#FF0000',
    };
    if (tool === 'cone') data.angle = 90;
    else if (tool === 'ray') data.width = 5;

    // Assign the template
    const template = new MeasuredTemplatePF2e(new MeasuredTemplateDocumentPF2e(data, { parent: canvas.scene }));
    event.data.preview = this.preview.addChild(template);
    template.draw();
};

TemplateLayer.prototype._onDragLeftMove = function _onDragLeftMove(event: ElementDragEvent) {
    PlaceablesLayer.prototype._onDragLeftMove.call(this, event);
    if (event.data.createState >= 1) {
        // Snap the destination to the grid
        const dest = event.data.destination;
        const { x, y } = canvas.grid.getSnappedPosition(dest.x, dest.y, 2);
        dest.x = x;
        dest.y = y;

        // Compute the ray
        const template = event.data.preview;
        const ray = new Ray(event.data.origin, event.data.destination);
        const ratio = canvas.dimensions.size / canvas.dimensions.distance;

        // Update the shape data
        if (['cone', 'circle'].includes(template.data.t)) {
            const direction = ray.angle;
            template.data.direction = Math.toDegrees(
                Math.floor((direction + Math.PI * 0.125) / (Math.PI * 0.25)) * (Math.PI * 0.25),
            );
            const distance = Math.max(ray.distance / ratio, 5);
            template.data.distance = Math.floor(distance / canvas.dimensions.distance) * canvas.dimensions.distance;
        } else {
            template.data.direction = Math.toDegrees(ray.angle);
            template.data.distance = ray.distance / ratio;
        }

        // Draw the pending shape
        template.refresh();
        event.data.createState = 2;
    }
};
