<script lang="ts">
    import type { HTMLButtonAttributes } from "svelte/elements";

    interface InlineIconButtonProps extends HTMLButtonAttributes {
        /** A full Font Awesome icon class, e.g. "fa-solid fa-trash" */
        icon: string;
    }

    const { icon, ...args }: InlineIconButtonProps = $props();
</script>

<!-- Sized via the inheritable --pf2e-inline-button-size: core declares --button-size on .inline-control
     itself, so an ancestor-provided value cannot override it without this indirection -->
<button
    type="button"
    {...args}
    class={["inline-control icon", args.class]}
    style:--button-size="var(--pf2e-inline-button-size, var(--font-size-24))"
>
    <i class={icon} aria-hidden="true"></i>
</button>
