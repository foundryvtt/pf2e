import { TokenPF2e } from "../token/index.ts";

export class TokenLayerPF2e<TToken extends TokenPF2e = TokenPF2e> extends TokenLayer<TToken> {
    /** Cycle Z indices of a hovered token stack */
    cycleStack(): boolean {
        const hovered = this.hover;
        if (!hovered) return false;

        const stack = [...this.quadtree.getObjects(hovered.bounds)]
            .filter((t) => hovered.document.elevation === t.document.elevation)
            .sort((a, b) => a.document.sort - b.document.sort);
        if (stack.length < 2) return false;

        const first = stack.shift()!;
        stack.push(first);

        const updates: { _id: string; sort: number }[] = [];
        for (let sort = stack.length - 1; sort >= 0; sort--) {
            const token = stack[sort];
            updates.push({ _id: token.document.id, sort });
        }
        canvas.scene?.updateEmbeddedDocuments("Token", updates);

        return true;
    }
}
