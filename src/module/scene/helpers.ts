import type { CreaturePF2e } from "@actor/creature/document.ts";
import { PrototypeTokenPF2e } from "@actor/data/base.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene";
import { DetectionModeEntry } from "./token-document/data.ts";

// Prevent concurrent executions of this method in case of network latency
let auraCheckLock = Promise.resolve();

/** Check for auras containing newly-placed or moved tokens */
const checkAuras = foundry.utils.debounce(async function (this: ScenePF2e): Promise<void> {
    if (!(canvas.ready && this.isInFocus && this.grid.type === CONST.GRID_TYPES.SQUARE)) {
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

/** Assigns detection modes and sight settings for either a token or prototype token assuming RBV is enabled. */
function computeSightAndDetectionForRBV(token: TokenDocumentPF2e | PrototypeTokenPF2e<CreaturePF2e>): void {
    const actor = token.actor;
    const scene = "scene" in token ? token.scene : null;
    if (!actor?.isOfType("creature")) return;

    // Reset detection modes if using rules-based vision
    const hasVision = !!actor.perception?.hasVision;
    const lightPerception: DetectionModeEntry = { id: "lightPerception", enabled: hasVision, range: null };
    const basicSight: DetectionModeEntry = { id: "basicSight", enabled: hasVision, range: 0 };
    token.detectionModes = [lightPerception, basicSight];

    // Reset sight defaults and set vision mode.
    // Unlike detection modes, there can only be one, and it decides how the player is currently seeing.
    const visionMode = actor.hasDarkvision ? "darkvision" : "basic";
    token.sight.attenuation = 0.1;
    token.sight.brightness = 0;
    token.sight.contrast = 0;
    token.sight.range = 0;
    token.sight.saturation = 0;
    token.sight.visionMode = visionMode;

    const visionModeDefaults = CONFIG.Canvas.visionModes[visionMode].vision.defaults;
    token.sight.brightness = visionModeDefaults.brightness ?? 0;
    token.sight.saturation = visionModeDefaults.saturation ?? 0;

    // Update basic sight and adjust saturation based on darkvision or light levels
    if (visionMode === "darkvision") {
        token.sight.range = basicSight.range = null;

        if (actor.isOfType("character") && actor.flags.pf2e.colorDarkvision) {
            token.sight.saturation = 1;
        } else if (!game.user.settings.monochromeDarkvision) {
            token.sight.saturation = 0;
        }
    }

    if (actor.perception.senses.has("see-invisibility")) {
        token.detectionModes.push({ id: "seeInvisibility", enabled: true, range: null });
    }

    const tremorsense = actor.perception.senses.get("tremorsense");
    if (tremorsense) {
        token.detectionModes.push({ id: "feelTremor", enabled: true, range: tremorsense.range });
    }

    if (!actor.hasCondition("deafened")) {
        const range = scene?.flags.pf2e.hearingRange ?? null;
        token.detectionModes.push({ id: "hearing", enabled: true, range });
    }
}

export { checkAuras, computeSightAndDetectionForRBV };
