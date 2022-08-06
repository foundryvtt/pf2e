import { VehiclePF2e } from "@actor";
import { ErrorPF2e, objectHasKey } from "@util";
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

    /** Hide token-sight settings when rules-based vision is enabled */
    override activateListeners($html: JQuery): void {
        const html = $html[0]!;
        const linkToActorSize = html.querySelector<HTMLInputElement>('input[name="flags.pf2e.linkToActorSize"]');
        if (!linkToActorSize) throw ErrorPF2e("");
        if (linkToActorSize.checked) {
            this.disableScale(html);
        }

        linkToActorSize.addEventListener("change", (event) => {
            if (!(event.currentTarget instanceof HTMLInputElement)) {
                throw ErrorPF2e("Input element not found");
            }

            const sizeInputs = Array.from(
                event.currentTarget
                    .closest("fieldset")
                    ?.querySelectorAll<HTMLInputElement>("input[type=number], input[type=range]") ?? []
            );

            for (const input of sizeInputs) {
                input.disabled = linkToActorSize.checked;
            }

            if (this.token.autoscale && linkToActorSize.checked) {
                if (this.actor instanceof VehiclePF2e) {
                    const { dimensions } = this.actor;
                    const dimensionValues: Record<string, number> = {
                        width: Math.max(Math.round(dimensions.width / 5), 1),
                        height: Math.max(Math.round(dimensions.length / 5), 1),
                    };
                    for (const input of ["width", "height"].flatMap(
                        (n) => sizeInputs.find((i) => i.name === n) ?? []
                    )) {
                        input.value = dimensionValues[input.name].toString();
                    }
                } else {
                    for (const input of sizeInputs.filter((i) => ["width", "height"].includes(i.name))) {
                        input.value = this.dimensionsFromActorSize.toString();
                    }
                }
                this.disableScale(html);
            } else {
                const source = this.token._source;
                const nameToValue = {
                    width: source.width,
                    height: source.height,
                    "texture.scaleX": source.texture.scaleX,
                    "texture.scaleY": source.texture.scaleY,
                };
                for (const input of sizeInputs) {
                    if (objectHasKey(nameToValue, input.name)) {
                        input.value = nameToValue[input.name].toString();
                    }
                }
                this.enableScale(html);
            }
        });

        const sightInputNames = [
            "angle",
            "range",
            "visionMode",
            "color",
            "attenuation",
            "brightness",
            "saturation",
            "contrast",
        ].map((n) => `sight.${n}`);
        const sightInputs = Array.from(
            html.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
                sightInputNames.map((n) => `[name="${n}"]`).join(", ")
            )
        );

        // Disable vision management if vision is also disabled
        if (!this.token.sight.enabled) {
            for (const input of sightInputs) {
                input.disabled = true;
                if (input.type === "range") {
                    input.closest(".form-group")?.classList.add("children-disabled");
                } else if (input.name === "sight.color") {
                    const colorInput = input.parentElement?.querySelector<HTMLInputElement>("input[type=color]");
                    if (colorInput) colorInput.disabled = true;
                }
            }
        }

        const sightEnabledInput = html.querySelector<HTMLInputElement>('input[name="sight.enabled"]');
        if (!sightEnabledInput) throw ErrorPF2e("sight.enabled input not found");
        sightEnabledInput.addEventListener("change", () => {
            for (const input of sightInputs) {
                input.disabled = !sightEnabledInput.checked;
                if (input.type === "range") {
                    if (!sightEnabledInput.checked) {
                        input.closest(".form-group")?.classList.add("children-disabled");
                    } else {
                        input.closest(".form-group")?.classList.remove("children-disabled");
                    }
                } else if (input.name === "sight.color") {
                    const colorInput = input.parentElement?.querySelector<HTMLInputElement>("input[type=color]");
                    if (colorInput) colorInput.disabled = !sightEnabledInput.checked;
                }
            }
        });

        const rbvEnabled = game.settings.get("pf2e", "automation.rulesBasedVision");
        if (!(rbvEnabled && ["character", "familiar"].includes(this.actor?.type ?? ""))) {
            return super.activateListeners($html);
        }

        // Indicate that these settings are managed by rules-based vision
        const message = game.i18n.localize("PF2E.SETTINGS.Automation.RulesBasedVision.ManagedBy");
        for (const input of sightInputs) {
            if (["sight.visionMode", "sight.brightness", "sight.saturation"].includes(input.name)) {
                const managedBy = document.createElement("p");
                managedBy.innerHTML = message;
                input.replaceWith(managedBy);
                const group = managedBy.closest(".form-group");
                group?.classList.add("managed-by-rbv");
                group?.querySelector(".form-fields label")?.remove();

                managedBy.querySelector("a")?.addEventListener("click", () => {
                    const menu = game.settings.menus.get("pf2e.automation");
                    if (!menu) throw ErrorPF2e("Automation Settings application not found");
                    const app = new menu.type();
                    app.render(true);
                });
            } else {
                input.remove();
            }
        }

        super.activateListeners($html);
    }

    /** Disable the range input for token scale and style to indicate as much */
    private disableScale(html: HTMLElement): void {
        // If autoscaling is disabled, keep form input enabled
        if (!game.settings.get("pf2e", "tokens.autoscale")) return;

        const scale = html.querySelector(".form-group.scale");
        if (!scale) throw ErrorPF2e("Scale form group missing");
        scale.classList.add("children-disabled");

        const constrainedScale = String(this.actor?.size === "sm" ? 0.8 : 1);
        const rangeInput = scale.querySelector<HTMLInputElement>("input[type=range]");
        if (rangeInput) {
            rangeInput.disabled = true;
            rangeInput.value = constrainedScale;
            const rangeDisplayValue = scale.querySelector(".range-value");
            if (rangeDisplayValue) rangeDisplayValue.innerHTML = constrainedScale;
        }
    }

    /** Reenable range input for token scale and restore normal styling */
    private enableScale(html: HTMLElement): void {
        const scale = html.querySelector(".form-group.scale");
        if (!scale) throw ErrorPF2e("Scale form group missing");
        scale.classList.remove("children-disabled");
        const rangeInput = scale.querySelector<HTMLInputElement>("input[type=range]");
        if (rangeInput) {
            rangeInput.disabled = false;
            const rangeDisplayValue = scale.querySelector(".range-value");
            if (rangeDisplayValue) rangeDisplayValue.innerHTML = rangeInput.value;
        }
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
