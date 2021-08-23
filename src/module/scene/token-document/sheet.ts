import { TokenDocumentPF2e } from ".";

export class TokenConfigPF2e<TDocument extends TokenDocumentPF2e = TokenDocumentPF2e> extends TokenConfig<TDocument> {
    /** Hide token-sight settings when rules-based vision is enabled */
    override activateListeners($html: JQuery): void {
        if (game.settings.get("pf2e", "automation.rulesBasedVision")) {
            $html.find('input[name$="Sight"]').closest(".form-group").val(0).css({ display: "none" });
            $html.find('input[name="sightAngle"]').closest(".form-group").val(360).css({ display: "none" });
        }

        super.activateListeners($html);
    }
}
