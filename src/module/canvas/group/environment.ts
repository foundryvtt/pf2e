import * as R from "remeda";

class EnvironmentCanvasGroupPF2e extends fc.groups.EnvironmentCanvasGroup {
    /** Ensure prepared values are passed in initialization (upstream retrieves source values). */
    override initialize(config: fc.groups.EnvironmentInitializeConfig = {}): void {
        const scene = game.scenes.viewed;
        if (scene) {
            config.environment = fu.mergeObject(config.environment ?? {}, {
                globalLight: R.pick(scene.environment.globalLight, ["enabled", "darkness"]),
            });
        }
        return super.initialize(config);
    }
}

export { EnvironmentCanvasGroupPF2e };
