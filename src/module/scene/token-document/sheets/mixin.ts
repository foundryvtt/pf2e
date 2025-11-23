import type { ActorPF2e } from "@actor";
import { SIZE_LINKABLE_ACTOR_TYPES } from "@actor/values.ts";
import type { ApplicationRenderContext } from "@client/applications/_module.d.mts";
import type { DocumentSheetConfiguration, DocumentSheetRenderContext } from "@client/applications/api/_module.d.mts";
import type { HandlebarsRenderOptions } from "@client/applications/api/handlebars-application.d.mts";
import type { TokenApplicationMixin } from "@client/applications/sheets/_module.d.mts";
import type { DocumentFlags } from "@common/data/_module.d.mts";
import type { SettingsMenuOptions } from "@system/settings/menu.ts";
import { createHTMLElement, ErrorPF2e, htmlQuery } from "@util";
import type { TokenDocumentPF2e } from "../document.ts";
import type { PrototypeTokenConfigPF2e } from "./prototype-config.ts";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function TokenConfigMixinPF2e<TBase extends ReturnType<typeof TokenApplicationMixin>>(Base: TBase) {
    abstract class TokenConfigMixin extends Base {
        static #SIGHT_INPUT_NAMES = (["angle", "brightness", "range", "saturation", "visionMode"] as const).map(
            (n) => `sight.${n}` as const,
        );

        static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration> = {
            sheetConfig: false,
            actions: {
                openAutomationSettings: TokenConfigMixin.#onClickOpenAutomationSettings,
                toggleAutoscale: TokenConfigMixin.#onClickToggleAutoscale,
                toggleSizeLink: TokenConfigMixin.#onClickToggleSizeLink,
            },
        };

        static override PARTS = fu.mergeObject(super.PARTS, {
            appearance: { template: `${SYSTEM_ROOT}/templates/scene/token/appearance.hbs` },
        });

        abstract get linkToActorSize(): boolean;

        abstract get autoscale(): boolean;

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
            if ("rulesBasedVision" in this.token) {
                const isCreature = !!this.actor?.isOfType("creature");
                return isCreature && this.token.rulesBasedVision;
            }
            return game.pf2e.settings.rbv;
        }

        protected override async _prepareContext(options: HandlebarsRenderOptions): Promise<TokenConfigContext> {
            const context = (await super._prepareContext(options)) as DocumentSheetRenderContext;
            const actor = this.actor;
            const sizeLinkable = !!actor && SIZE_LINKABLE_ACTOR_TYPES.has(actor.type);
            const linkToActorSize = sizeLinkable && this.linkToActorSize;
            const autoscale = this.autoscale;
            return Object.assign(context, {
                sizeLinkable,
                linkToActorSize,
                autoscale: sizeLinkable && autoscale,
                linkToSizeTitle: linkToActorSize ? "Unlink" : "Link",
                autoscaleTitle: autoscale ? "Unlink" : "Link",
            });
        }

        /** Hide token-sight settings when rules-based vision is enabled */
        protected override async _onRender(
            context: ApplicationRenderContext,
            options: HandlebarsRenderOptions,
        ): Promise<void> {
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
            if (!(input instanceof HTMLSelectElement)) return;
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

        #disableVisionInputs(): void {
            if (!this.rulesBasedVision) return;

            const html = this.element;
            const sightInputs = Array.from(
                html.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
                    TokenConfigMixin.#SIGHT_INPUT_NAMES.map((n) => `[name="${n}"]`).join(", "),
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
                aria: { label: game.i18n.localize("PF2E.SETTINGS.Automation.RulesBasedVision.ManagedBy") },
            });
            managedBy.type = "button";
            managedBy.disabled = !game.user.isGM;
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

        static async #onClickOpenAutomationSettings(this: PrototypeTokenConfigPF2e): Promise<void> {
            const menu = game.settings.menus.get("pf2e.automation");
            if (menu) {
                const options: Partial<SettingsMenuOptions> = { highlightSetting: "rulesBasedVision" };
                const app = new menu.type(undefined, options);
                app.render(true);
            }
        }

        /** Disable the range input for token scale and style to indicate as much */
        static async #onClickToggleAutoscale(this: PrototypeTokenConfigPF2e): Promise<void> {
            await this.submit({ operation: { render: false } });
            await this.token.update({ "flags.pf2e.autoscale": !this.autoscale });
        }

        static async #onClickToggleSizeLink(this: PrototypeTokenConfigPF2e): Promise<void> {
            await this.submit({ operation: { render: false } });
            await this.token.update({ "flags.pf2e.linkToActorSize": !this.linkToActorSize });
        }

        /* -------------------------------------------- */
        /*  Form Submission                             */
        /* -------------------------------------------- */

        protected processFormData(data: Record<string, unknown>, form: HTMLFormElement): Record<string, unknown> {
            // Readd scale property to form data if input is disabled: necessary for mirroring checkboxes to function
            const scaleInput = form.elements.namedItem("scale");
            if (scaleInput instanceof fa.elements.HTMLRangePickerElement && scaleInput.disabled) {
                data["scale"] = Math.abs(this.token._source.texture.scaleX);
            }
            // Change `null` disposition (not secret) back to numeric value
            if (data["disposition"] === null) {
                data["disposition"] = this.token.disposition === -2 ? -1 : this.token.disposition;
            }
            return data;
        }

        protected async processSubmitData(submitData: Record<string, unknown>): Promise<void> {
            if (this.linkToActorSize) {
                if (this.actor?.isOfType("vehicle")) {
                    const dimensions = this.actor.dimensions;
                    const width = Math.max(Math.round(dimensions.width / 5), 1);
                    const length = Math.max(Math.round(dimensions.length / 5), 1);
                    submitData["width"] = width;
                    submitData["height"] = length;
                } else {
                    submitData["width"] = submitData["height"] = this.dimensionsFromActorSize;
                }
            }
        }
    }

    interface TokenConfigMixin extends ReturnType<typeof TokenApplicationMixin> {
        get actor(): ActorPF2e | null;
        get token(): TokenDocumentPF2e | PrototypeTokenPF2e;
    }

    return TokenConfigMixin;
}

interface PrototypeTokenPF2e extends foundry.data.PrototypeToken<ActorPF2e> {
    flags: DocumentFlags & {
        pf2e: {
            autoscale?: boolean;
            linkToActorSize?: boolean;
            rulesBasedVision?: boolean;
        };
    };
}

interface TokenConfigContext extends DocumentSheetRenderContext {
    /** Whether the token can be linked to its actor's size */
    sizeLinkable: boolean;
    linkToSizeTitle: string;
    autoscaleTitle: string;
}

export { TokenConfigMixinPF2e };
export type { TokenConfigContext };
