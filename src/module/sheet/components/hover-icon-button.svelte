<script lang="ts">
    import type { HTMLButtonAttributes } from "svelte/elements";

    interface HoverIconProps extends HTMLButtonAttributes {
        src: string;
        icon: string;
    }

    const { src, icon, ...args }: HoverIconProps = $props();
</script>

<button {...args} class={`flat ${args.class ?? ""}`}>
    <img {src} alt="" />
    <i class={icon}></i>
</button>

<style>
    /** Increase specificity until layer support */
    button.flat {
        --image-size: 2rem;

        position: relative;
        width: var(--image-size);
        height: var(--image-size);

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
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
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
