import * as R from "remeda";

/**
 * A HTML Element that handles `Tagify` data and always has a `value` of `string[]`.
 * `Tagify` must be bound to the child input element that can be accessed at `HTMLTagifyTagsElement#input`
 */
class HTMLTagifyTagsElement extends foundry.applications.elements.AbstractFormInputElement<string[], string> {
    static override tagName = "tagify-tags";

    /** The input elmement that the `Tagify` instance is bound to */
    declare input: HTMLInputElement;

    constructor() {
        super();
        // Set the initial value
        this._setValue(this.getAttribute("value") || "[]");
    }

    protected override _buildElements(): HTMLElement[] {
        this.input = document.createElement("input") as HTMLInputElement;
        this.input.type = "text";
        this._applyInputAttributes(this.input);

        return [this.input];
    }

    protected override _setValue(value: string): void {
        try {
            const parsed = JSON.parse(value) as TagifySelection[] | string[];
            // The initial value might already be a string array
            if (parsed.every((s): s is string => typeof s === "string")) {
                this._value = parsed;
                return;
            }
            // Otherwise extract tagify values
            this._value = parsed
                .filter((s) => !s.readonly)
                .map((s) => s.id ?? s.value)
                .filter(R.isTruthy);
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
            this.input.setAttribute(attribute.name, attribute.value);
            // Remove transfered attributes, expect class, from this element
            if (attribute.name !== "class") {
                this.removeAttribute(attribute.name);
            }
        }
        this.input.setAttribute("data-tagify-tags-name", this.name);
        this.input.value = JSON.stringify(this._value);
    }

    protected override _toggleDisabled(disabled: boolean): void {
        this.input.disabled = disabled;
    }

    override _activateListeners(): void {
        this.input.addEventListener("change", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            this.value = target.value || "[]";
        });
    }
}

type TagifySelection = { id?: string; value?: string; readonly?: boolean };

export { HTMLTagifyTagsElement };
