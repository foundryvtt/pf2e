import { ActorPF2e } from "@actor";
import { SIZE_LINKABLE_ACTOR_TYPES } from "@actor/values.ts";
import { ApplicationRenderContext } from "@client/applications/_types.mjs";
import { DocumentSheetConfiguration } from "@client/applications/api/document-sheet.mjs";
import { HandlebarsRenderOptions } from "@client/applications/api/handlebars-application.mjs";
import FormDataExtended from "@client/applications/ux/form-data-extended.mjs";
import { DatabaseCreateOperation, DatabaseUpdateOperation } from "@common/abstract/_types.mjs";
import { createHTMLElement, ErrorPF2e, htmlQuery } from "@util";
import type { TokenDocumentPF2e } from "./index.ts";

class TokenConfigPF2e extends fa.sheets.TokenConfig {
    static #SIGHT_INPUT_NAMES = (["angle", "brightness", "range", "saturation", "visionMode"] as const).map(
        (n) => `sight.${n}` as const,
    );

    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration> = {
        sheetConfig: false,
        actions: {
            openAutomationSettings: TokenConfigPF2e.#onClickOpenAutomationSettings,
            toggleAutoscale: TokenConfigPF2e.#onClickToggleAutoscale,
            toggleSizeLink: TokenConfigPF2e.#onClickToggleSizeLink,
        },
    };

    static override PARTS = (() => {
        const parts = { ...super.PARTS };
        parts["appearance"].template = "systems/pf2e/templates/scene/token/appearance.hbs";
        return parts;
    })();

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

    get rulesBasedVision(): boolean {
        const isCreature = !!this.actor?.isOfType("creature");
        return isCreature && (this.token.rulesBasedVision || (this.isPrototype && game.pf2e.settings.rbv));
    }

    override async _prepareContext(options: HandlebarsRenderOptions): Promise<TokenConfigContext> {
        const context = await super._prepareContext(options);
        const actor = this.actor;
        const sizeLinkable = !!actor && SIZE_LINKABLE_ACTOR_TYPES.has(actor.type);
        const linkToActorSize = sizeLinkable && this.token.flags.pf2e.linkToActorSize;
        return Object.assign(context, {
            sizeLinkable,
            linkToActorSize,
            autoscale: sizeLinkable && this.token.flags.pf2e.autoscale,
            linkToSizeTitle: linkToActorSize ? "Unlink" : "Link",
            autoscaleTitle: this.token.flags.pf2e.autoscale ? "Unlink" : "Link",
        });
    }

    /** Hide token-sight settings when rules-based vision is enabled */
    override async _onRender(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void> {
        await super._onRender(context, options);

        if (options.parts.includes("identity")) {
            this.#swapDispositionField();
            // Disable un-linking for certain actor types we prefer not to become synthetics
            if (this.actor?.allowSynthetics === false) {
                const control = htmlQuery<HTMLInputElement>(this.element, "input[name=actorLink]");
                if (control && control.checked) {
                    control.disabled = true;
                    const typeLocalization = game.i18n.localize(`TYPES.Actor.${this.actor.type}`);
                    control.dataset.tooltip = game.i18n.format("PF2E.Token.ActorLinkForced", {
                        type: typeLocalization,
                    });
                }
            }
        }
        if (options.parts.includes("vision")) this.#disableVisionInputs();
    }

    #swapDispositionField(): void {
        const input = this.form?.elements.namedItem("disposition");
        if (input instanceof HTMLSelectElement) {
            const formGroup = input.closest<HTMLElement>(".form-group");
            if (!formGroup) return;
            const label = formGroup.querySelector("label");
            if (label) label.innerText = game.i18n.localize("PF2E.Token.SecretDisposition.Label");
            const pEl = document.createElement("p");
            pEl.className = "hint";
            pEl.innerText = game.i18n.localize("PF2E.Token.SecretDisposition.Hint");
            formGroup.append(pEl);
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.name = input.name;
            checkbox.id = input.id;
            checkbox.value = String(CONST.TOKEN_DISPOSITIONS.SECRET);
            checkbox.dataset.dtype = "Number";
            checkbox.defaultChecked = this.token._source.disposition === CONST.TOKEN_DISPOSITIONS.SECRET;
            input.replaceWith(checkbox);
        }
        // <div class="form-group">
        //     <label>{{localize "PF2E.Token.SecretDisposition.Label"}}</label>
        //     <input type="checkbox" name="disposition" value="-2" data-dtype="Number" {{checked (eq object.disposition -2)}} />
        //     <p class="hint">{{localize "PF2E.Token.SecretDisposition.Hint"}}</p>
        // </div>
    }

    #disableVisionInputs(): void {
        if (!this.rulesBasedVision) return;

        const html = this.element;
        const sightInputs = Array.from(
            html.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
                TokenConfigPF2e.#SIGHT_INPUT_NAMES.map((n) => `[name="${n}"]`).join(", "),
            ),
        );

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

        // Indicate that vision settings are managed by rules-based vision
        for (const input of sightInputs) {
            input.disabled = true;
        }

        // Disable detection-mode tab link
        const addModeButton = html.querySelector<HTMLButtonElement>("button[data-action=addDetectionMode]");
        if (addModeButton) addModeButton.disabled = true;

        const managedBy = createHTMLElement("button", {
            classes: ["inline-control", "icon", "fa-solid", "fa-robot"],
            dataset: { action: "openAutomationSettings", tooltip: true },
        });
        managedBy.type = "button";
        managedBy.disabled = !game.user.isGM;
        managedBy.ariaLabel = game.i18n
            .localize("PF2E.SETTINGS.Automation.RulesBasedVision.ManagedBy")
            .replace(/<\/?rbv>/g, "");
        for (const sightInput of sightInputs) {
            const button = managedBy.cloneNode(true);
            const label = sightInput.closest(".form-group")?.querySelector("label");
            label?.classList.add("managed-by-rbv", "flexrow");
            label?.append(button);
        }
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    static async #onClickOpenAutomationSettings(): Promise<void> {
        const MenuCls = game.settings.menus.get("pf2e.automation")?.type;
        if (MenuCls) await new MenuCls().render(true);
    }

    /** Disable the range input for token scale and style to indicate as much */
    static async #onClickToggleAutoscale(this: TokenConfigPF2e): Promise<void> {
        await this.submit({ operation: { render: false } });
        await this.token.update({ "flags.pf2e.autoscale": !this.token.flags.pf2e.autoscale });
    }

    static async #onClickToggleSizeLink(this: TokenConfigPF2e): Promise<void> {
        await this.submit({ operation: { render: false } });
        await this.token.update({ "flags.pf2e.linkToActorSize": !this.token.flags.pf2e.linkToActorSize });
    }

    /* -------------------------------------------- */
    /*  Form Submission                             */
    /* -------------------------------------------- */

    protected override _processFormData(
        event: SubmitEvent | null,
        form: HTMLFormElement,
        formData: FormDataExtended,
    ): Record<string, unknown> {
        const data = super._processFormData(event, form, formData);

        // Readd scale property to form data if input is disabled: necessary for mirroring checkboxes to function
        const scaleInput = form.elements.namedItem("scale");
        if (scaleInput instanceof HTMLElement && scaleInput.getAttribute("disabled") === "true") {
            data["scale"] = Math.abs(this.token._source.texture.scaleX);
        }
        // Change `null` disposition (not secret) back to numeric value
        if (data["disposition"] === null) {
            data["disposition"] = this.token.disposition === -2 ? -1 : this.token.disposition;
        }
        return data;
    }

    protected override async _processSubmitData(
        event: SubmitEvent,
        form: HTMLFormElement,
        submitData: Record<string, unknown>,
        options?: Partial<DatabaseCreateOperation<Scene | null>> | Partial<DatabaseUpdateOperation<Scene | null>>,
    ): Promise<void> {
        if (this.token.linkToActorSize) {
            if (this.actor?.isOfType("vehicle")) {
                const { dimensions } = this.actor;
                const width = Math.max(Math.round(dimensions.width / 5), 1);
                const length = Math.max(Math.round(dimensions.length / 5), 1);
                submitData["width"] = width;
                submitData["height"] = length;
            } else {
                submitData["width"] = submitData["height"] = this.dimensionsFromActorSize;
            }
        }
        return super._processSubmitData(event, form, submitData, options);
    }
}

interface TokenConfigPF2e extends fa.sheets.TokenConfig {
    get token(): TokenDocumentPF2e;
    get actor(): ActorPF2e | null;
}

interface TokenConfigContext extends ApplicationRenderContext {
    /** Whether the token can be linked to its actor's size */
    sizeLinkable: boolean;
    linkToSizeTitle: string;
    autoscaleTitle: string;
}

export { TokenConfigPF2e };
