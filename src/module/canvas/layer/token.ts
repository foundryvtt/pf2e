import { TokenPF2e } from "../token";

export class TokenLayerPF2e<TToken extends TokenPF2e = TokenPF2e> extends TokenLayer<TToken> {
    /** Cycle Z indices of a hovered token stack */
    cycleStack(): boolean {
        const top = this._hover;
        if (!top) return false;

        const stack = this.placeables.filter((t) => top.distanceTo(t) === 0);
        if (stack.length < 2) return false;

        const last = stack.pop();
        if (last !== top) return false;
        stack.unshift(last);

        for (let i = 0; i < stack.length; i++) {
            stack[i].zIndex = -1 * (stack.length - i);
        }

        return true;
    }
}
