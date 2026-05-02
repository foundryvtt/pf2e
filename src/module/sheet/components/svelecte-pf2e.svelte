<script lang="ts">
    import Svelecte from "svelecte";
    type SvelecteParams = Parameters<Required<Svelecte>["$set"]>[0];

    let { value = $bindable(), ...props }: SvelecteParams = $props();
    const className = $derived(((props.class ?? "") + " pf2e").trim());
    const positionResolver = $derived(props.positionResolver ?? popoverPositionResolver);

    // Promotes dropdown to top layer to escape clipping from ancestor backdrop-filter.
    function popoverPositionResolver(dropdown: HTMLElement) {
        dropdown.popover = "manual";

        const observer = new MutationObserver(() => {
            const shouldOpen = dropdown.classList.contains("is-open");
            const isOpen = dropdown.matches(":popover-open");
            if (shouldOpen && !isOpen) dropdown.showPopover();
            else if (!shouldOpen && isOpen) dropdown.hidePopover();
        });
        observer.observe(dropdown, { attributes: true, attributeFilter: ["class"] });

        return {
            destroy: () => observer.disconnect(),
        };
    }
</script>

<div class="svelecte-pf2e">
    <Svelecte {...props} bind:value class={className} {positionResolver} />
</div>

<style lang="scss">
    .svelecte-pf2e {
        anchor-scope: --svelecte-anchor;
        width: 100%;

        :global(.svelecte.pf2e) {
            anchor-name: --svelecte-anchor;

            /* Inaccessible foundry css vars */
            --button-text-color: light-dark(var(--color-dark-1), var(--color-light-3));
            --input-background-color: light-dark(rgba(0, 0, 0, 0.1), var(--color-cool-4));
            --input-border-color: light-dark(var(--color-dark-6), transparent);

            /** Svelecte Variables */
            --sv-color: var(--color-text-primary);
            --sv-item-btn-color: var(--color-text-trait);
            --sv-item-btn-color-hover: var(--color-text-trait);
            --sv-control-bg: var(--input-background-color);
            --sv-icon-color: var(--button-text-color);
            --sv-item-selected-bg: var(--color-bg-trait);
            --sv-item-btn-bg: var(--color-bg-trait);
            --sv-placeholder-color: var(--color-form-hint);
            --sv-dropdown-bg: light-dark(white, var(--color-cool-4));
            --sv-dropdown-active-bg: light-dark(rgba(0, 0, 0, 0.1), var(--color-text-selection-bg));
            --sv-border: 1px solid var(--input-border-color);
            --sv-selection-multi-wrap-padding: 0.15em;
            --sv-selection-gap: 0.2em;
            --sv-min-height: var(--input-height);

            :global(.sv-input--text) {
                width: auto;
                height: unset;
                line-height: unset;
                padding: 0 0.25em;
                background: none;
                border: none;
                border-radius: unset;
                outline: unset;
                user-select: unset;
                font-size: unset;
                transition: unset;

                &:focus {
                    box-shadow: none;
                    outline: unset;
                }
            }

            :global(.sv_dropdown) {
                position: fixed;
                position-anchor: --svelecte-anchor;
                min-width: anchor-size(width);
                inset: unset;
                top: anchor(bottom);
                left: anchor(left);
            }

            /** Undo foundry overrides */
            :global(button) {
                height: unset;
                min-height: unset;
                border-radius: unset;
            }
        }
    }
</style>
