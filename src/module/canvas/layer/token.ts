import { TokenPF2e } from "../token/index.ts";

export class TokenLayerPF2e<TToken extends TokenPF2e = TokenPF2e> extends TokenLayer<TToken> {
    /** Cycle Z indices of a hovered token stack */
    cycleStack(): boolean {
        const hovered = this.hover;
        if (!hovered) return false;

        const stack = this.placeables
            .filter((t) => hovered.distanceTo(t) === 0 && hovered.document.elevation === t.document.elevation)
            .sort((a, b) => a.mesh.sort - b.mesh.sort);
        if (stack.length < 2) return false;

        const first = stack.shift()!;
        stack.push(first);

        for (let i = stack.length; i > 0; i--) {
            stack[i - 1].mesh.data.sort = i - 1;
        }
        canvas.primary.sortChildren();

        return true;
    }
}
