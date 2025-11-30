import { ActorPF2e } from "@actor";
import { PrototypeTokenPF2e } from "@actor/data/base.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene";

// Prevent concurrent executions of this method in case of network latency
let auraCheckLock = Promise.resolve();

/** Check for auras containing newly-placed or moved tokens */
const checkAuras = fu.debounce(async function (this: ScenePF2e): Promise<void> {
    if (!(canvas.ready && this.isInFocus && this.canHaveAuras)) {
        return;
    }

    await auraCheckLock;
    const lock: { release: () => void } = { release: () => {} };
    auraCheckLock = new Promise((resolve) => {
        lock.release = resolve;
    });

    try {
        // Get all tokens in the scene, excluding additional tokens linked to a common actor
        const tokens = this.tokens.reduce((list: TokenDocumentPF2e<ScenePF2e>[], token) => {
            if (token.isLinked && list.some((t) => t.actor === token.actor)) {
                return list;
            }
            list.push(token);
            return list;
        }, []);

        // Wait for any token animation to finish
        for (const token of tokens) {
            await token.object?.animation;
        }

        for (const aura of tokens.flatMap((t) => Array.from(t.auras.values()))) {
            await aura.notifyActors();
        }

        const sceneActors = new Set(tokens.flatMap((t) => (t.actor?.primaryUpdater === game.user ? t.actor : [])));
        for (const actor of sceneActors) {
            actor.checkAreaEffects();
        }
    } finally {
        lock.release();
    }
}, 100);

/** Returns true if this token has the default actor image or the default image for its actor type */
function isDefaultTokenImage(token: TokenDocumentPF2e | PrototypeTokenPF2e<ActorPF2e>): boolean {
    const defaultIcons = [ActorPF2e.DEFAULT_ICON, `${SYSTEM_ROOT}/icons/default-icons/${token.actor?.type}.svg`];
    return defaultIcons.some((path) => token.texture.src?.endsWith(path));
}

export { checkAuras, isDefaultTokenImage };
