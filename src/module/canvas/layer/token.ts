import type { PlaceablesLayerPointerEvent } from "@client/canvas/layers/base/placeables-layer.d.mts";
import type { TokenPF2e } from "../index.ts";

class TokenLayerPF2e<TObject extends TokenPF2e> extends fc.layers.TokenLayer<TObject> {
    /** Prevent redirection of event to `Ruler` when ctrl key is pressed. */
    protected override _onClickLeft(event: PlaceablesLayerPointerEvent<TObject>): void {
        // @todo fixme
        // Following a z-cycle (see below), token click listeners sometimes aren't available until mouse movement.
        const localPosition = event.getLocalPosition(this);
        if (
            !canvas.controls.ruler?.active &&
            this.hover?.canControl(game.user, event) &&
            this.hover.bounds.contains(localPosition.x, localPosition.y)
        ) {
            this.hover.control();
            return;
        }

        return super._onClickLeft(event);
    }

    /** Cycle Z indices of a hovered token stack. */
    cycleStack(): boolean {
        const hovered = this.hover;
        if (!hovered) return false;
        const bounds = hovered.mechanicalBounds;
        const rectangle = new PIXI.Rectangle(bounds.x + 1, bounds.y + 1, bounds.width - 2, bounds.height - 2);
        const stack = [...this.quadtree.getObjects(rectangle)]
            .filter((t) => t.visible && !t.document.isSecret && t.document.elevation === hovered.document.elevation)
            .sort((a, b) => b.document.sort - a.document.sort);
        if (stack.length < 2) return false;

        const first = stack.shift();
        if (first) stack.push(first);

        if (game.user.isGM || stack.every((t) => t.document.canUserModify(game.user, "update"))) {
            const updates = stack.map((t, i) => ({ _id: t.document.id, sort: stack.length - (1 + i) }));
            hovered.scene?.updateEmbeddedDocuments("Token", updates);
        } else {
            // The user isn't able to update every token: perform the cycling locally
            for (let sort = stack.length - 1; sort >= 0; sort--) {
                const token = stack[sort];
                token.document.sort = sort;
                token._onUpdate({ _id: token.document.id, sort }, { broadcast: false }, game.user.id);
            }
        }

        // Update which token is hovered after rotating the stack
        const newTop = stack.at(-1);
        this.hover = (newTop ?? null) as TObject;
        for (const token of stack) {
            token.hover = token === newTop;
        }

        return true;
    }
}

export { TokenLayerPF2e };
