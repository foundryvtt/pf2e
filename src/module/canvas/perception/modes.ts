import { pick } from "@util";
import { TokenPF2e } from "../token";

const darkvision = new VisionMode({
    id: "darkvision",
    label: "VISION.ModeDarkvision",
    canvas: {
        shader: ColorAdjustmentsSamplerShader,
        uniforms: { enable: true, contrast: 0, saturation: -1.0, brightness: 0 },
    },
    lighting: {
        levels: {
            // from core-bundled darkvision mode: maybe restore?
            // [VisionMode.LIGHTING_LEVELS.DIM]: VisionMode.LIGHTING_LEVELS.BRIGHT,
        },
        background: { visibility: VisionMode.LIGHTING_VISIBILITY.REQUIRED },
    },
    vision: {
        darkness: { adaptive: true },
        defaults: { attenuation: 0, contrast: 0, saturation: -1.0, brightness: 0.75, range: Infinity },
    },
});

class VisionDetectionMode extends DetectionModeBasicSight {
    constructor() {
        super({
            id: "basicSight",
            label: "DETECTION.BasicSight",
            type: DetectionMode.DETECTION_TYPES.SIGHT,
        });
    }

    protected override _canDetect(visionSource: VisionSource<TokenPF2e>, target: PlaceableObject): boolean {
        if (!super._canDetect(visionSource, target)) return false;
        const targetIsUndetected =
            target instanceof TokenPF2e &&
            !!target.actor?.itemTypes.condition.some((c) => ["undetected", "unnoticed"].includes(c.slug));
        return !targetIsUndetected;
    }
}

class HearingDetectionMode extends DetectionMode {
    constructor() {
        super({
            id: "hearing",
            label: "PF2E.Actor.Creature.Sense.Type.Hearing",
            type: DetectionMode.DETECTION_TYPES.SOUND,
        });
    }

    static override getDetectionFilter(): OutlineOverlayFilter {
        const filter = (this._detectionFilter ??= OutlineOverlayFilter.create({
            wave: true,
            knockout: false,
        }));
        filter.thickness = 1;
        return filter;
    }

    protected override _canDetect(visionSource: VisionSource<TokenPF2e>, target: PlaceableObject): boolean {
        if (!(target instanceof TokenPF2e && target.actor)) return false;

        // Not if the target doesn't emit sound
        if (!target.actor.emitsSound) {
            return false;
        }

        // Not if the target is unnoticed or undetected
        if (target.actor.itemTypes.condition.some((c) => ["undetected", "unnoticed"].includes(c.slug))) {
            return false;
        }

        // Only if the subject can hear
        return !visionSource.object.actor?.hasCondition("deafened");
    }

    protected override _testLOS(
        visionSource: VisionSource<TokenPF2e>,
        _mode: TokenDetectionMode,
        _target: PlaceableObject,
        test: CanvasVisibilityTestPF2e
    ): boolean {
        if (test.los.get(visionSource)) return true;

        test.loh ??= new Map();
        const hasLOH =
            test.loh.get(visionSource) ??
            !CONFIG.Canvas.losBackend.testCollision(pick(visionSource, ["x", "y"]), test.point, {
                type: "sound",
                mode: "any",
                source: visionSource,
            });
        test.loh.set(visionSource, hasLOH);

        return hasLOH;
    }
}

declare namespace HearingDetectionMode {
    // eslint-disable-next-line no-var
    var _detectionFilter: OutlineOverlayFilter | undefined;
}

interface CanvasVisibilityTestPF2e extends CanvasVisibilityTest {
    loh?: Map<VisionSource<TokenPF2e>, boolean>;
}

class DetectionModeTremorPF2e extends DetectionModeTremor {
    constructor() {
        super({
            id: "feelTremor",
            label: "DETECTION.FeelTremor",
            walls: false,
            type: DetectionMode.DETECTION_TYPES.MOVE,
        });
    }

    static override getDetectionFilter(): OutlineOverlayFilter {
        const filter = super.getDetectionFilter();
        filter.thickness = 1;
        return filter;
    }

    protected override _canDetect(visionSource: VisionSource<TokenPF2e>, target: PlaceableObject): boolean {
        return (
            super._canDetect(visionSource, target) &&
            target instanceof TokenPF2e &&
            !target.actor?.isOfType("loot") &&
            !target.actor?.itemTypes.condition.some((c) => ["undetected", "unnoticed"].includes(c.slug))
        );
    }
}

function setPerceptionModes(): void {
    CONFIG.Canvas.visionModes.darkvision = darkvision;
    CONFIG.Canvas.detectionModes.basicSight = new VisionDetectionMode();
    CONFIG.Canvas.detectionModes.hearing = new HearingDetectionMode();
    CONFIG.Canvas.detectionModes.feelTremor = new DetectionModeTremorPF2e();
}

export { setPerceptionModes };
