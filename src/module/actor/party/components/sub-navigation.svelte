<script lang="ts">
    import type { Snippet } from "svelte";

    const { children, class: classname }: { children: Snippet; class?: string } = $props();
</script>

<nav class={`sub-nav tabs ${classname}`.trim()}>
    {@render children()}
</nav>

<style>
    /** White background navigation with little decorations on the left and right */
    nav.sub-nav {
        align-items: center;
        background-color: var(--bg);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
        display: flex;
        flex-wrap: nowrap;
        flex: 0 0 2.5rem;
        gap: 0;
        justify-content: space-evenly;
        list-style: none;
        margin: 0;
        padding: 0;
        white-space: nowrap;
        width: 100%;

        &::before,
        &::after {
            background: url("/assets/sheet/sub-nav-decoration.webp");
            content: " ";
            height: 1rem;
            width: 2.5rem;
            margin: 0 1rem;
        }

        &::after {
            transform: scaleX(-100%);
        }

        :global(a) {
            border-left: 1px solid rgba(255, 255, 255, 0.3);
            border-right: 1px solid rgba(0, 0, 0, 0.2);
            color: var(--color-pf-alternate);
            display: block;
            flex: 1;
            font: 400 var(--font-size-16) var(--serif);
            text-align: center;
            text-decoration: none;
            transition: all 0.1s ease-out;

            &:hover,
            &.active {
                color: var(--color-pf-primary);
                text-shadow: unset;
            }

            &.active {
                font-weight: 500;
            }

            &:first-child {
                border-left: none;
            }

            &:last-child {
                border-right: none;
            }

            &:hover {
                text-shadow: 0 0 3px rgba(255, 255, 255, 0.5);
            }
        }
    }
</style>
