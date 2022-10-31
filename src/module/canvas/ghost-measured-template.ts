import { MeasuredTemplatePF2e } from "./measured-template";

export class GhostTemplate extends MeasuredTemplatePF2e {
    moveTime = 0;
    // Workaround for https://github.com/microsoft/TypeScript/issues/32912
    #wheelListenerOptions: AddEventListenerOptions & EventListenerOptions = { passive: false };

    private _onMouseMove = (event: PIXI.InteractionEvent) => {
        event.stopPropagation();
        const now = Date.now();
        if (now - this.moveTime <= 20) return;
        const center = event.data.getLocalPosition(this.layer);
        const snapped = canvas.grid.getSnappedPosition(center.x, center.y, 2);
        const hexTypes: number[] = [CONST.GRID_TYPES.HEXODDR, CONST.GRID_TYPES.HEXEVENR];
        const direction =
            this.moveTime === 0 && hexTypes.includes(canvas.grid.type)
                ? this.document.direction + 30
                : this.document.direction;
        this.document.updateSource({ ...snapped, direction });

        this.refresh();
        this.moveTime = now;
    };

    private _onLeftClick = () => {
        if (canvas.scene) {
            canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [this.document.toObject()]);
        }
        this.destroy();
    };

    override _onMouseWheel = (event: WheelEvent) => {
        if (event.ctrlKey) {
            event.preventDefault();
            event.stopPropagation();
            const snap = event.shiftKey ? 15 : 5;
            this.document.updateSource({ direction: this.document.direction + snap * Math.sign(event.deltaY) });
            this.refresh();
        } else if (event.shiftKey) {
            event.stopPropagation();
            const snap =
                canvas.grid.type >= CONST.GRID_TYPES.HEXODDR && canvas.grid.type <= CONST.GRID_TYPES.HEXEVENQ ? 60 : 45;
            this.document.updateSource({ direction: this.document.direction + snap * Math.sign(event.deltaY) });
            this.refresh();
        }
    };

    override destroy(options?: boolean | PIXI.IDestroyOptions): void {
        canvas.stage.off("mousemove", this._onMouseMove);
        canvas.stage.off("mousedown", this._onLeftClick);
        canvas.stage.off("rightdown", this.destroy);
        canvas.app.view.removeEventListener("wheel", this._onMouseWheel, this.#wheelListenerOptions);
        canvas.tokens.activate();
        super.destroy(options);
    }

    async drawPreview(): Promise<void> {
        this.layer.activate();
        await this.draw();
        this.layer.preview.addChild(this);
        this.activatePreviewListeners();
    }

    activatePreviewListeners(): void {
        canvas.stage.on("mousemove", this._onMouseMove);
        canvas.stage.on("mousedown", this._onLeftClick);
        canvas.stage.on("rightdown", this.destroy.bind(this));
        canvas.app.view.addEventListener("wheel", this._onMouseWheel, this.#wheelListenerOptions);
    }
}
