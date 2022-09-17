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
        const targetIsDetected = (): boolean =>
            target instanceof TokenPF2e &&
            !target.actor?.isOfType("loot") &&
            !target.actor?.itemTypes.condition.some((c) => ["undetected", "unnoticed"].includes(c.slug));
        return !visionSource.object.actor?.hasCondition("deafened") && targetIsDetected();
    }
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

declare namespace HearingDetectionMode {
    // eslint-disable-next-line no-var
    var _detectionFilter: OutlineOverlayFilter | undefined;
}

function setPerceptionModes(): void {
    CONFIG.Canvas.visionModes.darkvision = darkvision;
    CONFIG.Canvas.detectionModes.hearing = new HearingDetectionMode();
    CONFIG.Canvas.detectionModes.feelTremor = new DetectionModeTremorPF2e();
}

export { setPerceptionModes };
