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
        defaults: { attenuation: 0, contrast: 0, saturation: -1.0, brightness: 0.75, range: 1250 },
    },
});

function setPerceptionModes(): void {
    CONFIG.Canvas.visionModes.darkvision = darkvision;
}

export { setPerceptionModes };
