import { VehiclePF2e } from "@actor";
import { ErrorPF2e } from "@util";
import { TokenDocumentPF2e } from ".";

export class TokenConfigPF2e<TDocument extends TokenDocumentPF2e = TokenDocumentPF2e> extends TokenConfig<TDocument> {
    override get template(): string {
        return "systems/pf2e/templates/scene/token-config.html";
    }

    /** Get this token's dimensions were they linked to its actor's size */
    get dimensionsFromActorSize(): number {
        const actorSize = this.actor?.size ?? "med";
        return {
            tiny: 0.5,
            sm: 1,
            med: 1,
            lg: 2,
            huge: 3,
            grg: 4,
        }[actorSize];
    }

    /** Show token data in config sheet that is unmodified by `TokenDocumentPF2e` */
    override async getData(options?: Partial<FormApplicationOptions>): Promise<TokenConfigData<TDocument>> {
        const data = await super.getData(options);
        const DataConstructor = data.object.constructor as ConstructorOf<TDocument["data"]>;
        data.object = new DataConstructor(data.object.toObject(), data.object.document);

        return data;
    }

    /** Hide token-sight settings when rules-based vision is enabled */
    override activateListeners($html: JQuery): void {
        const $linkToActorSize = $html.find<HTMLInputElement>('input[name="flags.pf2e.linkToActorSize"]');
        if ($linkToActorSize.prop("checked")) {
            this.disableScale($html);
        }

        $linkToActorSize.on("change", (event) => {
            const $sizeInputs = $(event.currentTarget)
                .closest("fieldset")
                .find('input[type="number"], input[type="range"]');
            const newSetting = $linkToActorSize.prop("checked");
            $sizeInputs.prop("disabled", newSetting);
            if (game.settings.get("pf2e", "tokens.autoscale") && newSetting === true) {
                if (this.actor instanceof VehiclePF2e) {
                    const { dimensions } = this.actor;
                    const width = Math.max(Math.round(dimensions.width / 5), 1);
                    const length = Math.max(Math.round(dimensions.length / 5), 1);
                    $sizeInputs.filter('[name="width"]').val(width);
                    $sizeInputs.filter('[name="height"]').val(length);
                } else {
                    $sizeInputs.filter('[name="width"], [name="height"]').val(this.dimensionsFromActorSize);
                }
                this.disableScale($html);
            } else {
                const source = this.token.data._source;
                $sizeInputs.filter('[name="width"]').val(source.width);
                $sizeInputs.filter('[name="height"]').val(source.height);
                $sizeInputs.filter('[name="scale"]').val(source.scale);
                this.enableScale($html);
            }
        });

        const $visionInputs = $html.find(
            ["dimSight", "brightSight", "sightAngle"].map((selector) => `input[name="${selector}"]`).join(", ")
        );

        // Disable vision management if vision is also disabled
        if (!this.token.data.vision) {
            $visionInputs.prop({ disabled: true });
        }
        $html.find<HTMLInputElement>('input[name="vision"]').on("change", (event) => {
            $visionInputs.prop({ disabled: !event.currentTarget.checked });
        });

        // Indicate that this setting is managed by rules-based vision
        const rbvEnabled = game.settings.get("pf2e", "automation.rulesBasedVision");
        if (rbvEnabled && ["character", "familiar"].includes(this.actor?.type ?? "")) {
            for (const selector of ["dimSight", "brightSight", "sightAngle"]) {
                const $input = $html.find(`input[name="${selector}"]`);

                if (selector === "brightSight") {
                    const $managedBy = $("<p>").html(
                        game.i18n.localize("PF2E.SETTINGS.Automation.RulesBasedVision.ManagedBy")
                    );
                    $input.replaceWith($managedBy);
                    $managedBy.closest(".form-group").addClass("managed-by-rbv").find(".form-fields label").remove();

                    $managedBy.find("a").on("click", () => {
                        const menu = game.settings.menus.get("pf2e.automation");
                        if (!menu) throw ErrorPF2e("Automation Settings application not found");
                        const app = new menu.type();
                        app.render(true);
                    });
                } else {
                    $input.remove();
                }
            }
        }

        super.activateListeners($html);
    }

    /** Disable the range input for token scale and style to indicate as much */
    private disableScale($html: JQuery): void {
        // If autoscaling is disabled, keep form input enabled
        if (!game.settings.get("pf2e", "tokens.autoscale")) return;

        const $scale = $html.find(".form-group.scale");
        $scale.addClass("children-disabled");

        const constrainedScale = this.actor?.size === "sm" ? 0.8 : 1;
        $scale.find('input[type="range"]').prop({ disabled: true }).val(constrainedScale);
        $scale.find(".range-value").text(constrainedScale);
    }

    /** Reenable range input for token scale and restore normal styling */
    private enableScale($html: JQuery): void {
        const $scale = $html.find(".form-group.scale");
        $scale.removeClass("children-disabled");
        $scale.find('input[type="range"]').prop({ disabled: false });

        const $range = $scale.find<HTMLInputElement>('input[type="range"]');
        $scale.find(".range-value").text(String($range.val()));
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>) {
        if (formData["flags.pf2e.linkToActorSize"] === true) {
            if (this.actor instanceof VehiclePF2e) {
                const { dimensions } = this.actor;
                const width = Math.max(Math.round(dimensions.width / 5), 1);
                const length = Math.max(Math.round(dimensions.length / 5), 1);
                formData["width"] = width;
                formData["height"] = length;
            } else {
                formData["width"] = formData["height"] = this.dimensionsFromActorSize;
            }
        }
        return super._updateObject(event, formData);
    }
}
