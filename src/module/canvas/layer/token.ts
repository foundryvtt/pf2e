import { TokenPF2e } from "../token";

export class TokenLayerPF2e<TToken extends TokenPF2e = TokenPF2e> extends TokenLayer<TToken> {
    /** Whether the Token Auras module is active */
    kimsNaughtyModule: boolean;

    constructor() {
        super();
        this.kimsNaughtyModule = game.modules.get("token-auras")?.active ?? false;
    }

    /** Cycle Z indices of a hovered token stack */
    cycleStack(): boolean {
        const hovered = this._hover;
        if (!hovered) return false;

        const stack = this.placeables.filter((t) => hovered.distanceTo(t) === 0);
        if (stack.length < 2) return false;

        const last = stack.pop();
        if (!last) return false;
        stack.unshift(last);

        for (let i = 0; i < stack.length; i++) {
            stack[i].zIndex = -1 * (stack.length - i);
        }

        return true;
    }
}
