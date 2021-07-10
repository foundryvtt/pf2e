import { CreaturePF2e } from '@actor';
import { ActorPF2e } from '@actor/base';
import { TokenPF2e } from './canvas';

export class UserPF2e extends User<ActorPF2e> {
    getPerceivedLightLevel(): number {
        if (!(canvas.ready && canvas.scene && canvas.sight.rulesBasedVision)) {
            return canvas.scene?.data.darkness ?? 0;
        }

        return Math.max(...canvas.tokens.controlled.map((token) => token.actor?.visionLevel ?? 0));
    }

    /** Set this user's the perceived scene light levels */
    setPerceivedLightLevel({ defer = true } = {}): void {
        if (!(canvas.ready && canvas.scene && canvas.sight.rulesBasedVision)) return;

        const controlled = canvas.tokens.controlled.filter(
            (token): token is TokenPF2e & { actor: CreaturePF2e } =>
                token.hasSight && token.observer && token.actor instanceof CreaturePF2e,
        );
        for (const token of controlled) {
            if (!token.isMoving) token.updateSource();
        }

        if (!defer) {
            const lightEmitters = [
                ...canvas.tokens.placeables.filter((token) => token.visible && token.emitsLight),
                ...canvas.lighting.placeables.filter((light) => light.visible && !light.isDarkness),
            ];
            for (const emitter of lightEmitters) emitter.updateSource({ defer: true });
            this.refreshSight();
        }
    }

    /** Instruct the perception manager to refresh the sight and lighting layers */
    refreshSight({ initialize = false } = {}): void {
        if (!(canvas.ready && canvas.sight.rulesBasedVision)) return;
        const options = { lighting: { initialize, refresh: true }, sight: { initialize, refresh: true } };
        canvas.perception.update(options);
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
