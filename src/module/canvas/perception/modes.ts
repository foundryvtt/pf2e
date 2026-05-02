import type { CanvasVisibilityTest } from "@client/_types.d.mts";
import type { TokenDetectionMode } from "@client/canvas/perception/detection-mode.d.mts";
import { TokenPF2e } from "../token/object.ts";

class DarkvisionMode extends fc.perception.VisionMode {
    constructor() {
        super({
            id: "darkvision",
            label: "VISION.ModeDarkvision",
            canvas: {
                shader: fc.rendering.shaders.ColorAdjustmentsSamplerShader,
                uniforms: { contrast: 0, saturation: -1, brightness: 0 },
            },
            lighting: {
                levels: {
                    // from core-bundled darkvision mode: maybe restore?
                    // [VisionMode.LIGHTING_LEVELS.DIM]: VisionMode.LIGHTING_LEVELS.BRIGHT,
                },
                background: { visibility: fc.perception.VisionMode.LIGHTING_VISIBILITY.REQUIRED },
            },
            vision: {
                darkness: { adaptive: true },
                defaults: { attenuation: 0, contrast: 0, saturation: -1, brightness: 0 },
            },
        });
    }
}

class LightDetectionMode extends fc.perception.DetectionModeLightPerception {
    constructor() {
        super({
            id: "lightPerception",
            label: "DETECTION.LightPerception",
            type: fc.perception.DetectionMode.DETECTION_TYPES.SIGHT,
            angle: false,
        });
    }

    protected override _canDetect(
        visionSource: PointVisionSourcePF2e,
        target: object | null,
        level: fd.Level,
    ): boolean {
        if (target instanceof fc.placeables.PlaceableObject) {
            const document = target.document;
            if (document.hidden || document.actor?.hasCondition("hidden", "undetected", "unnoticed")) {
                return false;
            }
        }
        return super._canDetect(visionSource, target, level);
    }
}

class VisionDetectionMode extends fc.perception.DetectionModeDarkvision {
    constructor() {
        super({
            id: "basicSight",
            label: "DETECTION.BasicSight",
            type: fc.perception.DetectionMode.DETECTION_TYPES.SIGHT,
            angle: false,
        });
    }

    protected override _canDetect(visionSource: PointVisionSourcePF2e, target: object | null): boolean {
        if (target instanceof fc.placeables.PlaceableObject) {
            const document = target.document;
            if (document.hidden || document.actor?.hasCondition("hidden", "undetected", "unnoticed")) {
                return false;
            }
        }
        return super._canDetect(visionSource, target);
    }
}

class HearingDetectionMode extends fc.perception.DetectionMode {
    constructor() {
        super({
            id: "hearing",
            label: "PF2E.Actor.Creature.Sense.Type.Hearing",
            type: fc.perception.DetectionMode.DETECTION_TYPES.SOUND,
            angle: false,
        });
    }

    static override getDetectionFilter(): fc.rendering.filters.OutlineOverlayFilter {
        const filter = (this._detectionFilter ??= fc.rendering.filters.OutlineOverlayFilter.create({ wave: true }));
        filter.thickness = 1;
        return filter;
    }

    protected override _canDetect(visionSource: PointVisionSourcePF2e, target: object | null): boolean {
        // Not if the target isn't a token
        if (!(target instanceof TokenPF2e)) return false;

        // Not if the token is GM-hidden
        if (target.document.hidden) return false;

        // Not if the target doesn't emit sound
        if (!target.actor?.emitsSound) return false;

        if (!game.pf2e.settings.rbv) return true;

        // Not if the target is unnoticed or undetected
        if (target.actor?.hasCondition("undetected", "unnoticed")) {
            return false;
        }

        // Only if the subject can hear
        return !visionSource.object?.actor?.hasCondition("deafened");
    }

    /**
     * A vision source is passed due to lack of core support for non-vision-based detection.
     * Retrieve hearing source and test against that.
     */
    protected override _testLOS(
        visionSource: PointVisionSourcePF2e,
        _mode: TokenDetectionMode,
        _target: fc.placeables.PlaceableObject,
        test: CanvasVisibilityTestPF2e,
    ): boolean {
        const edgeDirectionMode = CONST.EDGE_DIRECTION_MODES.REVERSED;
        const config = { type: "sound", edgeDirectionMode, useThreshold: true } as const;
        return !HearingDetectionMode._testCollision(visionSource, test, config);
    }
}

declare namespace HearingDetectionMode {
    // eslint-disable-next-line no-var
    var _detectionFilter: fc.rendering.filters.OutlineOverlayFilter | undefined;
}

type PointVisionSourcePF2e = fc.sources.PointVisionSource<TokenPF2e>;

interface CanvasVisibilityTestPF2e extends CanvasVisibilityTest {
    loh?: Map<PointVisionSourcePF2e, boolean>;
}

class DetectionModeTremorPF2e extends fc.perception.DetectionModeTremor {
    constructor() {
        super({
            id: "feelTremor",
            label: "DETECTION.FeelTremor",
            walls: false,
            type: fc.perception.DetectionMode.DETECTION_TYPES.MOVE,
        });
    }

    static override getDetectionFilter(): fc.rendering.filters.OutlineOverlayFilter {
        const filter = super.getDetectionFilter();
        filter.thickness = 1;
        return filter;
    }

    protected override _canDetect(
        visionSource: PointVisionSourcePF2e,
        target: fc.placeables.PlaceableObject,
        level?: fd.Level,
    ): boolean {
        return (
            super._canDetect(visionSource, target) &&
            target instanceof TokenPF2e &&
            !target.document.hidden &&
            level === canvas.scene?.levels.get(visionSource.object.document.level) &&
            !target.actor?.isOfType("loot") &&
            !target.actor?.hasCondition("undetected", "unnoticed")
        );
    }
}

function setPerceptionModes(): void {
    CONFIG.Canvas.visionModes.darkvision = new DarkvisionMode();
    CONFIG.Canvas.detectionModes.basicSight = new VisionDetectionMode();
    CONFIG.Canvas.detectionModes.lightPerception = new LightDetectionMode();
    CONFIG.Canvas.detectionModes.hearing = new HearingDetectionMode();
    CONFIG.Canvas.detectionModes.feelTremor = new DetectionModeTremorPF2e();
}

export { setPerceptionModes };
