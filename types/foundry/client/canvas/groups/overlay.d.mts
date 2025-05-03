import UnboundContainer from "../containers/advanced/unbound-container.mjs";
import CanvasGroupMixin from "./canvas-group-mixin.mjs";

/**
 * A container group which is not bound to the stage world transform.
 */
export default class OverlayCanvasGroup extends CanvasGroupMixin(UnboundContainer) {
    static override groupName: "overlay";

    static override tearDownChildren: false;
}
