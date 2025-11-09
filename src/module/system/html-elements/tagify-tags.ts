import { TagifyEntry } from "@module/sheet/helpers.ts";
import * as R from "remeda";

/**
 * A HTML Element that handles `Tagify` data and always has a `value` of `string[]`.
 * `Tagify` must be bound to the child input element that can be accessed at `HTMLTagifyTagsElement#input`
 */
class HTMLTagifyTagsElement extends foundry.applications.elements.AbstractFormInputElement<
    TagifyEntry[] | string[],
    string
> {
    static override tagName = "tagify-tags";

    constructor() {
        super();
        // Set the initial value
        this._setValue(this.getAttribute("value") || "[]");
    }

    protected override _primaryInput: HTMLInputElement = document.createElement("input");

    get input(): HTMLInputElement {
        return this._primaryInput;
    }

    protected override _buildElements(): HTMLElement[] {
        this._primaryInput.type = "text";
        this._applyInputAttributes(this._primaryInput);
        return [this._primaryInput];
    }

    /** Overwritten so that submit data receives a string array */
    protected override _getValue(): string[] {
        const value = super._getValue();

        // The initial value might already be a string array
        if (value.every((s): s is string => typeof s === "string")) {
            return value;
        }

        // Otherwise extract tagify values
        return value
            .filter((s) => !s.readonly)
            .map((s) => s.id ?? s.value)
            .filter(R.isTruthy);
    }

    protected override _setValue(value: string): void {
        try {
            this._value = JSON.parse(value) || [];
        } catch (error) {
            if (error instanceof Error) {
                console.error(
                    new Error(`PF2e System | Invalid value for HTMLTagifyTagsElement: ${value}`, {
                        cause: error,
                    }),
                );
            }
        }
    }

    override _applyInputAttributes(input: HTMLInputElement): void {
        super._applyInputAttributes(input);

        // Transfer all attributes, except name and value, to the input element
        for (const attribute of this.attributes) {
            if (attribute.name === "name" || attribute.name === "value") continue;
            this._primaryInput.setAttribute(attribute.name, attribute.value);
            // Remove transfered attributes except class and disabled from this element
            if (attribute.name !== "class" && attribute.name !== "disabled") {
                this.removeAttribute(attribute.name);
            }
        }
        this._primaryInput.setAttribute("data-tagify-tags-name", this.name);
        this._primaryInput.value = JSON.stringify(this._value);
    }

    protected override _toggleDisabled(disabled: boolean): void {
        this._primaryInput.disabled = disabled;
    }

    override _activateListeners(): void {
        this._primaryInput.addEventListener("change", (event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement) {
                this.value = target.value || "[]";
            }
        });
    }
}

export { HTMLTagifyTagsElement };
