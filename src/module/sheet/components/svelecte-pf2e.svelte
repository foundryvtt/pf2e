<script lang="ts">
    import Svelecte from "svelecte";
    type SvelecteParams = Parameters<Required<Svelecte>["$set"]>[0];
    let { value = $bindable(), ...props }: SvelecteParams = $props();

    // Svelecte position resolver that puts it on the body
    function popoutPositionResolver(node: HTMLElement) {
        // Add classes to element, including theme
        const themed = node.closest(".themed, body");
        const theme = [...(themed?.classList ?? [])].find((c) => c.startsWith("theme-"));
        node.classList.add("detached", "pf2e");
        if (theme) {
            node.classList.add("themed", theme);
        }

        let destroyed = false;
        const selectElement = node.parentElement;

        function positionElement() {
            if (destroyed) return; // end the request animation loop if destroyed

            if (selectElement && node.classList.contains("is-open")) {
                const bounds = selectElement.getBoundingClientRect();
                node.style.left = `${bounds.left}px`;
                node.style.top = `${bounds.bottom}px`;
                node.style.minWidth = `${bounds.width}px`;
            }

            requestAnimationFrame(positionElement);
        }

        document.body.appendChild(node);
        positionElement();

        return {
            destroy: () => {
                destroyed = false;
                selectElement?.appendChild(node);
            },
        };
    }

    const positionResolver = $derived(props.positionResolver ?? popoutPositionResolver);
    const className = $derived((props.class ?? "" + " pf2e").trim());
</script>

<Svelecte {...props} bind:value class={className} {positionResolver} />

<style>
    :global {
        .svelecte.pf2e,
        .sv_dropdown.pf2e {
            /** Svelecte Colors */
            --sv-color: var(--color-dark-1);
            --sv-item-btn-color: var(--color-text-trait);
            --sv-item-btn-color-hover: var(--color-text-trait);
            --sv-control-bg: rgba(0, 0, 0, 0.1);
            --sv-icon-color: var(--color-dark-6);
            --sv-item-selected-bg: var(--color-bg-trait);
            --sv-item-btn-bg: var(--color-bg-trait);

            --sv-selection-multi-wrap-padding: 0.15em;
            --sv-selection-gap: 0.2em;
            --sv-min-height: 2rem; /* match var(--input-height), which is not exposed */

            .sv-input--text {
                width: auto;
                height: unset;
                line-height: unset;
                padding: 0 0.25em;
                background: none;
                border: none;
                border-radius: unset;
                outline: unset;
                color: var(--input-text-color);
                user-select: unset;
                font-size: unset;
                transition: unset;

                &:focus {
                    box-shadow: none;
                    outline: unset;
                }
            }

            /** Undo foundry overrides */
            button {
                height: unset;
                min-height: unset;
                border-radius: unset;
            }
        }

        body.theme-dark .application:not(.themed) .svelecte.pf2e,
        .themed.theme-dark .svelecte.pf2e,
        .themed.theme-dark.sv_dropdown.pf2e {
            --sv-color: var(--color-light-3);
            --sv-control-bg: var(--color-cool-4);
            --sv-icon-color: var(--color-light-3);
            --sv-dropdown-bg: var(--color-dark-2);
            --sv-dropdown-active-bg: #553d3d;
        }

        body > .sv_dropdown.pf2e.detached {
            min-width: 0;
            z-index: 5000 !important;
        }
    }
</style>
