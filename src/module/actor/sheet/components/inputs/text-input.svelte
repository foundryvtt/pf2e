<script lang="ts">
    import type { HTMLInputAttributes } from "svelte/elements";
    import { commitInput, type Commit } from "./helpers.ts";

    interface TextInputProps extends Omit<HTMLInputAttributes, "value" | "type" | "onchange"> {
        value: string;
        onCommit: Commit<string>;
    }

    const { value, onCommit, ...rest }: TextInputProps = $props();

    const onchange = (event: Event & { currentTarget: HTMLInputElement }): Promise<void> => {
        const text = event.currentTarget.value.trim();
        return commitInput(event.currentTarget, async () => (text === value ? value : onCommit(text)));
    };
</script>

<input {...rest} type="text" {value} onfocus={(event) => event.currentTarget.select()} {onchange} />
