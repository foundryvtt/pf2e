export class GhostTemplate extends MeasuredTemplate {
    handlers: any = {};
    moveTime = 0;

    drawPreview() {
        this.layer.activate();
        this.draw();
        this.layer.preview.addChild(this);
        this.activatePreviewListeners();
    }

    kill() {
        console.log('killed template');
        this.handlers.RightClick(MouseEvent);
    }

    activatePreviewListeners() {
        this.handlers.MouseMove = (event: any) => {
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

        this.handlers.RightClick = (_event: any) => {
            this.layer.preview.removeChildren();
            canvas.stage.off('mousemove', this.handlers.MouseMove);
            canvas.stage.off('mousedown', this.handlers.LeftClick);
            canvas.app.view.oncontextmenu = null;
            canvas.app.view.onwheel = null;
        };

        this.handlers.LeftClick = (event: any) => {
            this.handlers.RightClick(event);

            const destination = canvas.grid.getSnappedPosition(this.x, this.y, 2);
            this.data._source.x = destination.x;
            this.data._source.y = destination.y;

            if (canvas.scene) {
                canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [this.data]);
            }
        };

        this.handlers.MouseWheel = (event: any) => {
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

        canvas.stage.on('mousemove', this.handlers.MouseMove);
        canvas.stage.on('mousedown', this.handlers.LeftClick);
        canvas.app.view.oncontextmenu = this.handlers.RightClick;
        canvas.app.view.onwheel = this.handlers.MouseWheel;
    }
}
