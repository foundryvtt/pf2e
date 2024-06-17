import * as R from "remeda";

class EnvironmentCanvasGroupPF2e extends EnvironmentCanvasGroup {
    /** Ensure prepared values are passed in initialization (upstream retrieves source values). */
    override initialize(config: EnvironmentInitializeConfig = {}): void {
        const scene = canvas.scene;
        if (!scene?.initialized) return super.initialize(config);

        config.environment = fu.mergeObject(config.environment ?? {}, {
            globalLight: R.pick(scene.environment.globalLight, ["enabled", "darkness"]),
        });

        return super.initialize(config);
    }
}

export { EnvironmentCanvasGroupPF2e };
