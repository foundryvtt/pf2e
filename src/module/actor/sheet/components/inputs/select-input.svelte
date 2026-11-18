<script lang="ts">
    import type { HTMLSelectAttributes } from "svelte/elements";
    import { commitInput, type Commit } from "./helpers.ts";

    interface SelectInputProps extends Omit<HTMLSelectAttributes, "value" | "onchange"> {
        value: string;
        /** Localized labels */
        options: { value: string; label: string }[];
        onCommit: Commit<string>;
    }

    const { value, options, onCommit, ...rest }: SelectInputProps = $props();

    const onchange = (event: Event & { currentTarget: HTMLSelectElement }): Promise<void> => {
        const select = event.currentTarget;
        return commitInput(select, () => onCommit(select.value));
    };
</script>

<select {...rest} {value} {onchange}>
    {#each options as option (option.value)}
        <option value={option.value}>{option.label}</option>
    {/each}
</select>
