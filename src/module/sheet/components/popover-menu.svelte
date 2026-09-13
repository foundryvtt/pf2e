<script lang="ts">
    import type { Attachment } from "svelte/attachments";

    /**
     * A menu in the top layer (so scrollable containers cannot clip it), anchored to its trigger with
     * CSS anchor positioning. The owner holds the open state and renders this component conditionally.
     *
     * Anchor contract: wrap the trigger in an element with `anchor-scope: --pf2e-popover-menu`, give
     * the trigger button `anchor-name: --pf2e-popover-menu`, and pass that wrapper as `anchor` so
     * clicks on the trigger dismiss without reopening.
     */
    interface PopoverMenuProps {
        /** Menu heading, doubling as the accessible name */
        label: string;
        items: { id: string; label: string }[];
        onSelect: (id: string) => void;
        /** `refocus` asks the owner to move focus back to the trigger */
        onClose: (refocus: boolean) => void;
        /** The trigger's wrapper: pointerdowns inside it are not dismissals */
        anchor?: HTMLElement | null;
    }

    const { label, items, onSelect, onClose, anchor = null }: PopoverMenuProps = $props();
    const uid = $props.id();

    // `items` is recreated on every app re-render, so the attachment tracks the content instead
    // (a needless re-run would steal focus back to the first item)
    const identity = $derived([label, ...items.map((i) => i.id)].join("\0"));

    // Re-runs on menu swaps via the `identity` read.
    const setup: Attachment<HTMLElement> = (menu) => {
        void identity;
        if (!menu.matches(":popover-open")) menu.showPopover();
        menu.querySelector("button")?.focus();

        // Activate on pointerup, since no click event arrives if a re-render replaces the item
        // mid-gesture. The click listener covers keyboard activation, which fires no pointerup.
        const onActivate = (event: MouseEvent) => {
            if (event.type === "pointerup" && event.button !== 0) return;
            const item = event.target instanceof HTMLElement ? event.target.closest("button[data-menu-id]") : null;
            if (!(item instanceof HTMLElement) || typeof item.dataset.menuId !== "string") return;
            onSelect(item.dataset.menuId);
            onClose(true);
        };
        // The right-click release that opened the menu steals focus from the first item, so restore it
        const onWindowPointerup = (event: PointerEvent) => {
            if (event.button === 0) return;
            setTimeout(() => {
                if (menu.isConnected && !menu.contains(document.activeElement)) {
                    menu.querySelector("button")?.focus();
                }
            });
        };
        const onDismissPointerdown = (event: PointerEvent) => {
            if (event.target instanceof Node && !anchor?.contains(event.target) && !menu.contains(event.target)) {
                onClose(false);
            }
        };
        const onDismissKeydown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose(true);
        };
        // Tab closes the menu and refocuses the trigger, letting the default tab move on from there.
        // No stopPropagation, since data-keyboard-focus already opts out of core keybindings.
        const onMenuKeydown = (event: KeyboardEvent) => {
            if (event.key === "Tab") return onClose(true);
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            event.preventDefault();
            const buttons = Array.from(menu.querySelectorAll<HTMLButtonElement>("button[data-menu-id]"));
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
            const step = event.key === "ArrowDown" ? 1 : -1;
            // Focus outside the items (index -1) enters at the first or last item
            buttons.at(index === -1 ? (step === 1 ? 0 : -1) : (index + step) % buttons.length)?.focus();
        };
        menu.addEventListener("pointerup", onActivate);
        menu.addEventListener("click", onActivate);
        menu.addEventListener("keydown", onMenuKeydown);
        window.addEventListener("pointerup", onWindowPointerup);
        window.addEventListener("pointerdown", onDismissPointerdown);
        window.addEventListener("keydown", onDismissKeydown);
        return () => {
            menu.removeEventListener("pointerup", onActivate);
            menu.removeEventListener("click", onActivate);
            menu.removeEventListener("keydown", onMenuKeydown);
            window.removeEventListener("pointerup", onWindowPointerup);
            window.removeEventListener("pointerdown", onDismissPointerdown);
            window.removeEventListener("keydown", onDismissKeydown);
        };
    };
</script>

<div class="popover-menu" popover="manual" role="menu" aria-labelledby="{uid}-label" {@attach setup}>
    <div class="menu-label" id="{uid}-label">{label}</div>
    {#each items as item (item.id)}
        <!-- data-keyboard-focus suppresses core keybindings (canvas pan) while an item is focused -->
        <button type="button" role="menuitem" data-menu-id={item.id} data-keyboard-focus="true">
            {item.label}
        </button>
    {/each}
</div>

<style>
    /* Anchored below the trigger, flipping above when out of room */
    .popover-menu {
        background: var(--background);
        border: 1px solid var(--table-header-border-color);
        border-radius: 3px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        flex-direction: column;
        inset: unset;
        inset-block-start: anchor(end);
        inset-inline-end: anchor(end);
        margin: 0;
        min-width: max-content;
        padding: var(--space-2);
        position: fixed;
        position-anchor: --pf2e-popover-menu;
        position-try-fallbacks: flip-block;

        &:popover-open {
            display: flex;
        }

        .menu-label {
            border-block-end: 1px solid var(--table-header-border-color);
            color: var(--color-text-secondary, inherit);
            font-size: var(--font-size-12);
            margin-block-end: var(--space-2);
            padding: var(--space-2) var(--space-4);
            white-space: nowrap;
        }

        /* Sized by padding, with column-flex stretch providing width */
        button {
            background: none;
            border: none;
            height: auto;
            justify-content: start;
            min-height: 0;
            padding: var(--space-2) var(--space-4);

            &:hover,
            &:focus {
                background: var(--table-row-color-highlight);
            }
        }
    }
</style>
