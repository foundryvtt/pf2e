import { TokenDocumentPF2e } from ".";

export class TokenConfigPF2e<TDocument extends TokenDocumentPF2e = TokenDocumentPF2e> extends TokenConfig<TDocument> {
    override get template(): string {
        return "systems/pf2e/templates/scene/token-config.html";
    }

    /** Get this token's dimensions were they linked to its actor's size */
    get dimensionsFromActorSize(): number {
        const actorSize = this.token.actor?.size ?? "med";
        return {
            tiny: 0.5,
            sm: 1,
            med: 1,
            lg: 2,
            huge: 3,
            grg: 4,
        }[actorSize];
    }

    /** Hide token-sight settings when rules-based vision is enabled */
    override activateListeners($html: JQuery): void {
        $html.find<HTMLInputElement>('input[name="flags.pf2e.linkToActorSize"]').on("change", (event) => {
            const $dimensions = $(event.currentTarget).closest("fieldset").find('input[type="number"]');
            const newSetting = !$dimensions.prop("disabled");
            $dimensions.prop("disabled", newSetting);
            if (newSetting === true) {
                $dimensions.val(this.dimensionsFromActorSize);
            }
        });

        if (game.settings.get("pf2e", "automation.rulesBasedVision")) {
            $html.find('input[name$="Sight"]').closest(".form-group").val(0).css({ display: "none" });
            $html.find('input[name="sightAngle"]').closest(".form-group").val(360).css({ display: "none" });
        }

        super.activateListeners($html);
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>) {
        if (formData["flags.pf2e.linkToActorSize"] === true) {
            formData["width"] = formData["height"] = this.dimensionsFromActorSize;
        }
        return super._updateObject(event, formData);
    }
}
