import { TokenDocumentPF2e } from '.';

export class TokenConfigPF2e extends TokenConfig<TokenDocumentPF2e> {
    /** Hide token-sight settings when rules-based vision is enabled */
    override activateListeners($html: JQuery): void {
        if (game.settings.get('pf2e', 'automation.rulesBasedVision')) {
            $html.find('input[name$="Sight"]').closest('.form-group').css({ display: 'none' });
        }
        $html.find('input[name="sightAngle"]').closest('.form-group').css({ display: 'none' });

        super.activateListeners($html);
    }
}
