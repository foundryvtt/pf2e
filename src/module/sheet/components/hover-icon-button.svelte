<script lang="ts">
    import type { HTMLButtonAttributes } from "svelte/elements";

    interface HoverIconProps extends HTMLButtonAttributes {
        src: string;
        icon: string;
    }

    const { src, icon, ...args }: HoverIconProps = $props();
</script>

<button type="button" {...args} class={["flat", args.class]}>
    <img {src} alt="" />
    <i class={icon} aria-hidden="true"></i>
</button>

<style>
    /** Increase specificity until layer support */
    button.flat {
        --image-size: var(--spacer-32);

        position: relative;
        width: var(--image-size);
        height: var(--image-size);
        /* Core sets a min-height on buttons that would keep a smaller height from applying */
        min-height: var(--image-size);

        img {
            border: none;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        i {
            box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.5);
            position: absolute;
            display: none;
            inset: 0;
            font-size: calc(var(--image-size) * 0.6);
            color: var(--text-dark);
        }

        &:hover,
        &:focus {
            text-shadow: none;

            i {
                align-items: center;
                background: #f1eee9;
                display: flex;
                justify-content: center;
                text-shadow: none;
            }
        }
    }
</style>
