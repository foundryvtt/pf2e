export class GhostTemplate extends MeasuredTemplate {
    moveTime = 0;

    private _onMouseMove = (event: PIXI.InteractionEvent) => {
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

    override _onClickRight = (_event: PIXI.InteractionEvent) => {
        this.layer.preview.removeChildren();
        canvas.stage.off("mousemove", this._onMouseMove);
        canvas.stage.off("mousedown", this._onLeftClick);
        canvas.stage.off("rightdown", this._onClickRight);
        canvas.app.view.onwheel = null;
    };

    private _onLeftClick = (event: PIXI.InteractionEvent) => {
        this._onClickRight(event);
        const destination = canvas.grid.getSnappedPosition(this.x, this.y, 2);
        this.data._source.x = destination.x;
        this.data._source.y = destination.y;

        if (canvas.scene) {
            canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [this.data]);
        }
    };

    override _onMouseWheel = (event: WheelEvent) => {
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
        canvas.stage.on("mousemove", this._onMouseMove);
        canvas.stage.on("mousedown", this._onLeftClick);
        canvas.stage.on("rightdown", this._onClickRight);
        canvas.app.view.onwheel = this._onMouseWheel;
    }
}
