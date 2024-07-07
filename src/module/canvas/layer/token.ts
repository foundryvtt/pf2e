import type { TokenPF2e } from "../index.ts";

class TokenLayerPF2e<TObject extends TokenPF2e> extends TokenLayer<TObject> {
    /** Prevent redirection of event to `Ruler` when ctrl key is pressed. */
    protected override _onClickLeft(event: PlaceablesLayerPointerEvent<TObject>): void {
        if (
            game.pf2e.settings.dragMeasurement &&
            game.activeTool !== "ruler" &&
            game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.CONTROL)
        ) {
            return;
        }

        return super._onClickLeft(event);
    }

    /** Cycle Z indices of a hovered token stack */
    cycleStack(): boolean {
        const scene = canvas.scene;
        const hovered = this.hover;
        if (!scene || !hovered) return false;

        const stack = [...this.quadtree.getObjects(hovered.bounds)]
            .filter((t) => hovered.document.elevation === t.document.elevation)
            .sort((a, b) => a.document.sort - b.document.sort);
        if (stack.length < 2) return false;

        const first = stack.shift();
        if (first) stack.push(first);

        if (stack.every((t) => t.document.canUserModify(game.user, "update"))) {
            const updates: { _id: string; sort: number }[] = [];
            for (let sort = stack.length - 1; sort >= 0; sort--) {
                const token = stack[sort];
                updates.push({ _id: token.document.id, sort });
            }
            scene.updateEmbeddedDocuments("Token", updates);
        } else {
            // The user isn't able to update every token: perform the resorting locally
            for (let sort = stack.length - 1; sort >= 0; sort--) {
                const token = stack[sort];
                token.document.sort = sort;
                token._onUpdate(
                    { _id: token.document.id, sort },
                    { broadcast: false, parent: scene, updates: [] },
                    game.user.id,
                );
            }
        }

        return true;
    }
}

export { TokenLayerPF2e };
