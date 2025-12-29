<script lang="ts">
    import Svelecte from "svelecte";
    type SvelecteParams = Parameters<Required<Svelecte>["$set"]>[0];
    let { value = $bindable(), ...props }: SvelecteParams = $props();

    // Track the detached dropdown node and its theme source for syncing
    let dropdownNode: HTMLElement | null = $state(null);
    let themeSource: HTMLElement | null = $state(null);

    // Sync theme classes from the theme source to the dropdown
    function syncTheme(node: HTMLElement, source: HTMLElement) {
        const theme = [...source.classList].find((c) => c.startsWith("theme-"));
        // Remove any existing theme classes
        for (const cls of [...node.classList]) {
            if (cls.startsWith("theme-")) {
                node.classList.remove(cls);
            }
        }
        // Add current theme
        if (theme) {
            node.classList.add("themed", theme);
        } else {
            node.classList.remove("themed");
        }
    }

    // Watch for theme changes on the theme source and sync to dropdown
    $effect(() => {
        if (!dropdownNode || !themeSource) return;

        syncTheme(dropdownNode, themeSource);

        const observer = new MutationObserver(() => syncTheme(dropdownNode!, themeSource!));
        observer.observe(themeSource, { attributes: true, attributeFilter: ["class"] });

        return () => observer.disconnect();
    });

    // Svelecte position resolver that puts it on the body
    function popoutPositionResolver(node: HTMLElement) {
        // Find the closest themed ancestor before detaching, or fall back to body
        themeSource = node.closest<HTMLElement>(".themed") ?? document.body;

        node.classList.add("detached", "pf2e");
        dropdownNode = node;

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
                dropdownNode = null;
                themeSource = null;
                selectElement?.appendChild(node);
            },
        };
    }

    const positionResolver = $derived(props.positionResolver ?? popoutPositionResolver);
    const className = $derived(((props.class ?? "") + " pf2e").trim());
</script>

<Svelecte {...props} bind:value class={className} {positionResolver} />

<style>
    :global {
        .svelecte.pf2e,
        .sv_dropdown.pf2e {
            /* Inaccessible foundry css vars */
            --button-text-color: light-dark(var(--color-dark-1), var(--color-light-3));
            --input-background-color: light-dark(rgba(0, 0, 0, 0.1), var(--color-cool-4));
            --input-border-color: light-dark(var(--color-dark-6), transparent);
            --input-height: 2rem;

            /** Svelecte Colors */
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

            color: var(--color-text-primary);

            .sv-input--text {
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

            /** Undo foundry overrides */
            button {
                height: unset;
                min-height: unset;
                border-radius: unset;
            }
        }

        body > .sv_dropdown.pf2e.detached {
            min-width: 0;
            z-index: 5000 !important;
        }
    }
</style>
