import CanvasGroupMixin from "./canvas-group-mixin.mts";

export default class RenderedCanvasGroup extends CanvasGroupMixin(PIXI.Container) {
    static override groupName: "rendered";

    static override tearDownChildren: false;
}
