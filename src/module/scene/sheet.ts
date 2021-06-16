import { ScenePF2e } from '.';

export class SceneConfigPF2e extends SceneConfig<ScenePF2e> {
    /** Hide Unrestricted Vision Range settings when rules-based vision is enabled */
    override activateListeners($html: JQuery): void {
        if (game.settings.get('pf2e', 'automation.rulesBasedVision')) {
            $html.find('input[name^="globalLight"]').closest('.form-group').css({ display: 'none' });
        }
        super.activateListeners($html);
    }
}
