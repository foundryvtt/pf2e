export class GhostTemplate extends MeasuredTemplate {
    moveTime = 0;

    private onMouseMove = (event: PIXI.InteractionEvent) => {
        event.stopPropagation();
        const now = Date.now();
        if (now - this.moveTime <= 20) return;
        const center = event.data.getLocalPosition(this.layer);
        const snapped = canvas.grid.getSnappedPosition(center.x, center.y, 2);
        this.data.x = snapped.x;
        this.data.y = snapped.y;
        this.refresh();
        this.moveTime = now;
    };

    private onRightClick = (_event: any) => {
        //event: PIXI.InteractionEvent
        this.layer.preview.removeChildren();
        canvas.stage.off('mousemove', this.onMouseMove);
        canvas.stage.off('mousedown', this.onLeftClick);
        canvas.app.view.oncontextmenu = null;
        canvas.app.view.onwheel = null;
    };

    private onLeftClick = (event: PIXI.InteractionEvent) => {
        this.onRightClick(event);

        const destination = canvas.grid.getSnappedPosition(this.x, this.y, 2);
        this.data._source.x = destination.x;
        this.data._source.y = destination.y;

        if (canvas.scene) {
            canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [this.data]);
        }
    };

    private onMouseWheel = (event: any) => {
        //event: PIXI.InteractionEvent & WheelEvent
        if (event.ctrlKey) {
            event.preventDefault();
            event.stopPropagation();
            const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
            const snap = event.shiftKey ? delta : 5;
            this.data._source.direction += snap * Math.sign(event.deltaY);
            this.data.direction += snap * Math.sign(event.deltaY);
            this.refresh();
        } else if (event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            const snap = 5;
            this.data._source.direction += snap * Math.sign(event.deltaY);
            this.data.direction += snap * Math.sign(event.deltaY);
            this.refresh();
        }
    };

    drawPreview() {
        this.layer.activate();
        this.draw();
        this.layer.preview.addChild(this);
        this.activatePreviewListeners();
    }

    activatePreviewListeners() {
        canvas.stage.on('mousemove', this.onMouseMove);
        canvas.stage.on('mousedown', this.onLeftClick);
        canvas.app.view.oncontextmenu = this.onRightClick;
        canvas.app.view.onwheel = this.onMouseWheel;
    }
}
