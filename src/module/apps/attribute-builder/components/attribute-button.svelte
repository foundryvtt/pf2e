<script lang="ts" generics="TAttribute extends BuilderAttribute">
    import type { BuilderAttribute, BuilderButton } from "../helpers.ts";
    import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
    import { setHasElement } from "@util";

    type AttributeButtonType = "boost" | "flaw" | "apex" | "key";

    interface SecondFlaw {
        button: BuilderButton;
        onclick: (attribute: TAttribute) => void;
    }

    interface Props {
        type: AttributeButtonType;
        attribute: TAttribute;
        button: BuilderButton;
        onclick: (attribute: TAttribute) => void;
        secondFlaw?: SecondFlaw;
    }

    const { type, attribute, button, onclick, secondFlaw }: Props = $props();

    const label = $derived.by(() => {
        if (type === "flaw") {
            return game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.Flaw");
        } else if (type === "key") {
            return game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.KeyIcon");
        } else if (button.partial) {
            return game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.Partial");
        } else if (type === "apex") {
            return game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.Increase");
        } else {
            return game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.Boost");
        }
    });

    const attrName = $derived(
        setHasElement(ATTRIBUTE_ABBREVIATIONS, attribute)
            ? game.i18n.localize(CONFIG.PF2E.abilities[attribute])
            : game.i18n.localize(`PF2E.Kingmaker.Abilities.${attribute}`),
    );

    function buildAriaLabel(buttonState: BuilderButton, isSecond = false): string {
        const action = isSecond ? game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.DoubleFlaw") : label;
        const parts = [action, attrName];

        if (buttonState.locked) {
            parts.push(`(${game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.Locked")})`);
        }

        return parts.join(" ");
    }

    const ariaLabel = $derived(buildAriaLabel(button));
    const secondAriaLabel = $derived(secondFlaw ? buildAriaLabel(secondFlaw.button, true) : "");
</script>

{#if secondFlaw}
    <div class="flaw-buttons" role="group" aria-label={ariaLabel}>
        <button
            type="button"
            class="attribute-button {type} first"
            class:selected={button.selected}
            class:partial={button.partial}
            class:locked={button.locked}
            disabled={button.disabled && !button.selected}
            aria-label={ariaLabel}
            aria-pressed={button.selected}
            onclick={() => onclick(attribute)}
        >
            {#if button.locked}<i class="fa-solid fa-lock" aria-hidden="true"></i>{/if}
            <span>{label}</span>
        </button>
        <button
            type="button"
            class="attribute-button {type} second"
            class:selected={secondFlaw.button.selected}
            disabled={secondFlaw.button.disabled && !secondFlaw.button.selected}
            aria-label={secondAriaLabel}
            aria-pressed={secondFlaw.button.selected}
            onclick={() => secondFlaw.onclick(attribute)}
        >
            <span aria-hidden="true">x2</span>
        </button>
    </div>
{:else}
    <button
        type="button"
        class="attribute-button {type}"
        class:selected={button.selected}
        class:partial={button.partial}
        class:locked={button.locked}
        disabled={button.disabled && !button.selected}
        aria-label={ariaLabel}
        aria-pressed={button.selected}
        onclick={() => onclick(attribute)}
    >
        {#if button.locked}<i class="fa-solid fa-lock" aria-hidden="true"></i>{/if}
        {#if type === "key"}<i class="fa-solid fa-fw fa-key" aria-hidden="true"></i>{/if}
        <span>{label}</span>
    </button>
{/if}

<style lang="scss">
    button {
        --color-boost: var(--color-level-success-border);
        --color-boost-dark: color-mix(in srgb, var(--color-level-success-border) 70%, black);
        --color-flaw: var(--color-level-error);
        --color-flaw-dark: color-mix(in srgb, var(--color-level-error) 70%, black);
        --button-color: var(--color-boost);
        --button-locked-color: var(--color-boost-dark);

        background: rgba(0, 0, 0, 0.1);
        border: 1px solid var(--button-color);
        border-radius: var(--space-4);
        color: var(--button-color);
        font-size: var(--font-size-12);
        outline: none;
        padding: 0.1em 0 0;
        position: relative;
        text-transform: uppercase;
        width: 6em;
        transition: all 0.2s ease-out;

        &.boost,
        &.apex,
        &.key {
            margin-top: auto;
        }

        &.flaw {
            --button-color: var(--color-flaw);
            --button-locked-color: var(--color-flaw-dark);
        }

        &.selected {
            background: var(--button-color);
            color: white;

            &.partial {
                background: var(--color-boost-dark);
                border-color: var(--color-boost-dark);
            }
        }

        &:hover:not(:disabled),
        &:focus:not(:disabled) {
            box-shadow: 0 0 var(--space-5) var(--button-color);
            cursor: pointer;
        }

        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        &.locked {
            background: var(--button-locked-color);
            border-color: var(--button-locked-color);
            pointer-events: none;
            color: white;
        }

        /* Key attribute button */
        &.key {
            > i {
                font-size: 0.7em;
                left: var(--space-5);
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
            }

            &.selected:hover {
                box-shadow: none;
                cursor: default;
            }
        }

        /* Double flaw button layout */
        &.first {
            border-bottom-right-radius: 0;
            border-right: none;
            border-top-right-radius: 0;
            width: 4em;
        }

        &.second {
            border-bottom-left-radius: 0;
            border-top-left-radius: 0;
            width: 2em;
            text-transform: none;

            &.selected {
                border-left-color: rgba(255, 255, 255, 0.5);
            }
        }
    }

    .flaw-buttons {
        display: flex;
        flex-direction: row;
        margin-bottom: auto;
    }
</style>
