import type { PlaceablesLayerPointerEvent } from "@client/canvas/layers/base/placeables-layer.d.mts";
import type { Point } from "@common/_types.d.mts";
import type { TokenPF2e } from "../index.ts";

class TokenLayerPF2e<TObject extends TokenPF2e> extends fc.layers.TokenLayer<TObject> {
    /** A line drawn between two tokens when checking distance */
    #hoverDistanceLine = new PIXI.Graphics();

    /** Prevent redirection of event to `Ruler` when ctrl key is pressed. */
    protected override _onClickLeft(event: PlaceablesLayerPointerEvent<TObject>): void {
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

    clearDistanceLine(): void {
        const line = this._rulerPaths.removeChild(this.#hoverDistanceLine) ?? this.#hoverDistanceLine;
        line.clear();
    }

    renderDistanceLine(from: TObject, to: TObject): void {
        const centers = { from: from.center, to: to.center };
        const footprints = {
            from: from.footprint
                .map((o) => canvas.grid.getCenterPoint(o))
                .sort(
                    (a, b) =>
                        Math.sqrt(Math.pow(a.x - centers.to.x, 2) + Math.pow(a.y - centers.to.y, 2)) -
                        Math.sqrt(Math.pow(b.x - centers.to.x, 2) + Math.pow(b.y - centers.to.y, 2)),
                ),
            to: to.footprint
                .map((o) => canvas.grid.getCenterPoint(o))
                .sort(
                    (a, b) =>
                        Math.sqrt(Math.pow(a.x - centers.from.x, 2) + Math.pow(a.y - centers.from.y, 2)) -
                        Math.sqrt(Math.pow(b.x - centers.from.x, 2) + Math.pow(b.y - centers.from.y, 2)),
                ),
        };
        const closest = { from: footprints.from[0], to: footprints.to[0] };
        const line = this.#hoverDistanceLine;
        const colors = { outline: 0, fill: 0x999999 };
        line.moveTo(closest.from.x, closest.from.y)
            .lineStyle({
                width: 6 * canvas.dimensions.uiScale,
                color: colors.outline,
                join: PIXI.LINE_JOIN.ROUND,
                cap: PIXI.LINE_CAP.ROUND,
            })
            .lineTo(closest.to.x, closest.to.y)
            .moveTo(closest.from.x, closest.from.y)
            .lineStyle({
                width: 4 * canvas.dimensions.uiScale,
                color: colors.fill,
                join: PIXI.LINE_JOIN.ROUND,
                cap: PIXI.LINE_CAP.ROUND,
            })
            .lineTo(closest.to.x, closest.to.y);
        this.#drawCap(line, closest.from, colors);
        this.#drawCap(line, closest.to, colors);
        this._rulerPaths.addChild(line);
    }

    #drawCap(line: PIXI.Graphics, p: Point, colors: { outline: number; fill: number }): PIXI.Graphics {
        const radius = 6;
        return line
            .lineStyle(0)
            .beginFill(colors.outline)
            .drawCircle(p.x, p.y, radius + 1)
            .endFill()
            .beginFill(colors.fill)
            .drawCircle(p.x, p.y, radius)
            .endFill();
    }

    protected override _activate(): void {
        super._activate();
        if (this.#hoverDistanceLine.destroyed) this.#hoverDistanceLine = new PIXI.Graphics();
    }

    protected override _deactivate(): void {
        super._deactivate();
        this.#hoverDistanceLine.clear();
    }

    protected override _tearDown(options?: object): Promise<void> {
        this.#hoverDistanceLine.destroy();
        return super._tearDown(options);
    }
}

export { TokenLayerPF2e };
