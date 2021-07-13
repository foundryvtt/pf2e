export class GhostTemplate extends MeasuredTemplate {
    handlers: any = {};
    moveTime = 0;

    drawPreview() {
        this.layer.activate();
        const initialLayer = canvas.activeLayer;
        this.draw();
        this.layer.preview.addChild(this);
        this.activatePreviewListeners(initialLayer);
    }

    kill(){
        console.log("killed template");
        this.handlers.RightClick(event);
    }

    activatePreviewListeners(initialLayer) {

        this.handlers.MouseMove = event => {
            event.stopPropagation();
            let now = Date.now();
            if (now - this.moveTime <= 20) return;
            const center = event.data.getLocalPosition(this.layer);
            const snapped = canvas.grid.getSnappedPosition(center.x, center.y, 2);
            this.data.x = snapped.x;
            this.data.y = snapped.y;
            this.refresh();
            this.moveTime = now;
        }

        this.handlers.RightClick = (_event) => {
            this.layer.preview.removeChildren();
            canvas.stage.off("mousemove", this.handlers.MouseMove);
            canvas.stage.off("mousedown", this.handlers.LeftClick);
            canvas.app.view.oncontextmenu = null;
            canvas.app.view.onwheel = null;
            initialLayer.activate();
        }

        this.handlers.LeftClick = event => {
            this.handlers.RightClick(event);
            
            const destination = canvas.grid.getSnappedPosition(this.x,this.y,2);
            this.data._source.x=destination.x;
            this.data._source.y=destination.y;

            canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [this.data]);

        }

        this.handlers.MouseWheel = event => {
            if (event.ctrlKey ) event.preventDefault();
            event.stopPropagation();
            let delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
            let snap = event.shiftKey ? delta : 5;
            this.data._source.direction += (snap * Math.sign(event.deltaY));
            this.data.direction += (snap * Math.sign(event.deltaY));
            this.refresh();
        }

        canvas.stage.on("mousemove", this.handlers.MouseMove);
        canvas.stage.on("mousedown", this.handlers.LeftClick);
        canvas.app.view.oncontextmenu = this.handlers.RightClick;
        canvas.app.view.onwheel = this.handlers.MouseWheel;
    }
}
