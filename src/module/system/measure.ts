// Code taken from Furyspark's Pathfinder 1st edition system with permission.
// @ts-nocheck

function degtorad(degrees) {
    return (degrees * Math.PI) / 180;
}

// Use 90 degrees cone in PF2e style
TemplateLayer.prototype._onDragLeftStart = function _onDragLeftStart(event) {
    PlaceablesLayer.prototype._onDragLeftStart.call(this, event);

    // Create the new preview template
    const tool = game.activeTool;
    const origin = event.data.origin;
    let pos;
    if (['cone', 'circle'].includes(tool)) {
        pos = canvas.grid.getSnappedPosition(origin.x, origin.y, 2);
    } else pos = canvas.grid.getSnappedPosition(origin.x, origin.y, 2);
    origin.x = pos.x;
    origin.y = pos.y;

    // Create the template
    const data = {
        user: game.user._id,
        t: tool,
        x: pos.x,
        y: pos.y,
        distance: 0,
        direction: 0,
        fillColor: game.user.data.color || '#FF0000',
    };
    if (tool === 'cone') data.angle = 90;
    else if (tool === 'ray') data.width = 5;

    // Assign the template
    const template = new MeasuredTemplate(data);
    event.data.preview = this.preview.addChild(template);
    template.draw();
};

TemplateLayer.prototype._onDragLeftMove = function _onDragLeftMove(event) {
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
            template.data.direction = toDegrees(
                Math.floor((direction + Math.PI * 0.125) / (Math.PI * 0.25)) * (Math.PI * 0.25),
            );
            const distance = ray.distance / ratio;
            template.data.distance = Math.floor(distance / canvas.dimensions.distance) * canvas.dimensions.distance;
        } else {
            template.data.direction = toDegrees(ray.angle);
            template.data.distance = ray.distance / ratio;
        }

        // Draw the pending shape
        template.refresh();
        event.data.createState = 2;
    }
};

// Highlight grid in PF2e style
const MeasuredTemplateHighlightGrid = MeasuredTemplate.prototype.highlightGrid;
MeasuredTemplate.prototype.highlightGrid = function highlightGrid() {
    if (!['circle', 'cone'].includes(this.data.t)) {
        MeasuredTemplateHighlightGrid.call(this);
        return;
    }

    const grid = canvas.grid;
    const d = canvas.dimensions;
    const bc = this.borderColor;
    const fc = this.fillColor;

    // Only highlight for objects which have a defined shape
    if (!this.id || !this.shape) return;

    // Clear existing highlight
    const hl = grid.getHighlightLayer(`Template.${this.id}`);
    hl.clear();

    // Get number of rows and columns
    const nr = Math.ceil((this.data.distance * 1.5) / d.distance / (d.size / grid.h));
    const nc = Math.ceil((this.data.distance * 1.5) / d.distance / (d.size / grid.w));

    // Get the center of the grid position occupied by the template
    const x = this.data.x;
    const y = this.data.y;

    const [cx, cy] = grid.getCenter(x, y);
    const [col0, row0] = grid.grid.getGridPositionFromPixels(cx, cy);
    const minAngle = (360 + ((this.data.direction - this.data.angle * 0.5) % 360)) % 360;
    const maxAngle = (360 + ((this.data.direction + this.data.angle * 0.5) % 360)) % 360;

    const withinAngle = (min, max, value) => {
        min = (360 + (min % 360)) % 360;
        max = (360 + (max % 360)) % 360;
        value = (360 + (value % 360)) % 360;

        if (min < max) return value >= min && value <= max;
        return value >= min || value <= max;
    };

    const measureDistance = (p0, p1) => {
        const gs = canvas.dimensions.size;
        const ray = new Ray(p0, p1);
        // How many squares do we travel across to get there? If 2.3, we should count that as 3 instead of 2; hence, Math.ceil
        const nx = Math.ceil(Math.abs(ray.dx / gs));
        const ny = Math.ceil(Math.abs(ray.dy / gs));

        // Get the number of straight and diagonal moves
        const nDiagonal = Math.min(nx, ny);
        const nStraight = Math.abs(ny - nx);

        // Diagonals in PF pretty much count as 1.5 times a straight
        const distance = Math.floor(nDiagonal * 1.5 + nStraight);
        const distanceOnGrid = distance * canvas.dimensions.distance;
        return distanceOnGrid;
    };

    const originOffset = { x: 0, y: 0 };
    // Offset measurement for cones
    // Offset is to ensure that cones only start measuring from cell borders, as in https://www.d20pfsrd.com/magic/#Aiming_a_Spell
    if (this.data.t === 'cone') {
        // Degrees anticlockwise from pointing right. In 45-degree increments from 0 to 360
        const dir = (this.data.direction >= 0 ? 360 - this.data.direction : -this.data.direction) % 360;
        // If we're not on a border for X, offset by 0.5 or -0.5 to the border of the cell in the direction we're looking on X axis
        const xOffset =
            this.data.x % d.size !== 0
                ? Math.sign((1 * Math.round(Math.cos(degtorad(dir)) * 100)) / 100) / 2 // /2 turns from 1/0/-1 to 0.5/0/-0.5
                : 0;
        // Same for Y, but cos Y goes down on screens, we invert
        const yOffset =
            this.data.y % d.size !== 0 ? -Math.sign((1 * Math.round(Math.sin(degtorad(dir)) * 100)) / 100) / 2 : 0;
        originOffset.x = xOffset;
        originOffset.y = yOffset;
    }

    // Point we are measuring distances from
    let origin = {
        x: this.data.x + originOffset.x * d.size,
        y: this.data.y + originOffset.y * d.size,
    };

    for (let a = -nc; a < nc; a++) {
        for (let b = -nr; b < nr; b++) {
            // Position of cell's top-left corner, in pixels
            const [gx, gy] = canvas.grid.grid.getPixelsFromGridPosition(col0 + a, row0 + b);
            // Position of cell's center, in pixels
            const [cellCenterX, cellCenterY] = [gx + d.size * 0.5, gy + d.size * 0.5];

            // Determine point of origin
            origin = { x: this.data.x, y: this.data.y };
            origin.x += originOffset.x * d.size;
            origin.y += originOffset.y * d.size;

            const ray = new Ray(origin, { x: cellCenterX, y: cellCenterY });

            const rayAngle = (360 + ((ray.angle / (Math.PI / 180)) % 360)) % 360;
            if (this.data.t === 'cone' && ray.distance > 0 && !withinAngle(minAngle, maxAngle, rayAngle)) {
                continue;
            }

            // Determine point we're measuring the distance to - always in the center of a grid square
            const destination = { x: cellCenterX, y: cellCenterY };

            const distance = measureDistance(destination, origin);
            if (distance <= this.data.distance) {
                grid.grid.highlightGridPosition(hl, { x: gx, y: gy, color: fc, border: bc });
            }
        }
    }
};
