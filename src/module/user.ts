import { CreaturePF2e } from '@actor';
import { ActorPF2e } from '@actor/base';
import { VisionLevels } from '@actor/creature/data';
import { TokenPF2e } from './canvas';
import { LightLevels } from './scene';

export class UserPF2e extends User<ActorPF2e> {
    /** Set this user's the perceived scene light levels */
    setPerceivedLightLevel({ defer = true } = {}): void {
        if (!(canvas.ready && canvas.scene && canvas.sight.rulesBasedVision)) return;

        const controlleds = canvas.tokens.controlled.filter(
            (token): token is TokenPF2e & { actor: CreaturePF2e } =>
                token.hasSight && token.observer && token.actor instanceof CreaturePF2e,
        );
        const lightLevel = canvas.scene.getLightLevel();
        for (const token of controlleds) {
            const perceivedBrightness = {
                [VisionLevels.BLINDED]: 0,
                [VisionLevels.NORMAL]: lightLevel,
                [VisionLevels.LOWLIGHT]: lightLevel > LightLevels.DARKNESS ? 1 : lightLevel,
                [VisionLevels.DARKVISION]: 1,
            }[token.actor.visionLevel];

            token.data.brightSight = perceivedBrightness > lightLevel ? 1000 : 0;
        }

        const lightEmitters = [
            ...canvas.tokens.placeables.filter((token) => token.visible && token.emitsLight),
            ...canvas.lighting.placeables.filter((light) => light.visible && !light.isDarkness),
        ];

        if (!defer) {
            for (const emitter of lightEmitters) emitter.updateSource({ defer: true });
            this.refreshSight(true);
        }
    }

    /** Instruct the perception manager to refresh the sight and lighting layers */
    refreshSight(immediate = false): void {
        if (!(canvas.ready && canvas.sight.rulesBasedVision)) return;
        const options = { lighting: { refresh: true }, sight: { refresh: true } };
        immediate ? canvas.perception.update(options) : canvas.perception.schedule(options);
    }
}

export interface UserPF2e extends User<ActorPF2e> {
    getFlag(
        scope: 'pf2e',
        key: 'settings',
    ): {
        uiTheme: 'blue' | 'red' | 'original' | 'ui';
        showEffectPanel: boolean;
        showRollDialogs: boolean;
    };
    getFlag(scope: 'pf2e', key: 'settings.uiTheme'): 'blue' | 'red' | 'original' | 'ui';
    getFlag(scope: 'pf2e', key: 'settings.showEffectPanel'): boolean;
    getFlag(scope: 'pf2e', key: 'settings.showRollDialogs'): boolean;
    getFlag(scope: 'pf2e', key: `compendiumFolders.${string}.expanded`): boolean | undefined;
}
