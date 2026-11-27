<script lang="ts">
    import type { HTMLInputAttributes } from "svelte/elements";
    import { commitInput, parseInteger, type Commit } from "./helpers.ts";

    /** A whole-number field that stores what is typed. For a value effects can adjust, use `AdjustableNumberInput`. */
    interface NumberInputProps extends Omit<
        HTMLInputAttributes,
        "value" | "type" | "onchange" | "min" | "max" | "step"
    > {
        value: number;
        onCommit: Commit<number>;
        /** Accept "+X" and "-X" as changes to the current value, which makes this a text input */
        allowDelta?: boolean;
        min?: number;
        max?: number;
        /** The arrow keys' increment */
        step?: number;
    }

    const {
        value,
        onCommit,
        allowDelta = false,
        min = -Infinity,
        max = Infinity,
        step,
        ...rest
    }: NumberInputProps = $props();

    const resolve = (raw: string): number => {
        const text = raw.trim();
        const parsed = parseInteger(text);
        const next = parsed === null ? value : allowDelta && /^[+-]/.test(text) ? value + parsed : parsed;
        return Math.clamp(next, min, max);
    };

    const commit = (input: HTMLInputElement, next: number): Promise<void> =>
        commitInput(input, async () => (next === value ? value : onCommit(next)));

    // Steps the delta text input like a number input
    const onkeydown = (event: KeyboardEvent & { currentTarget: HTMLInputElement }): void => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        const input = event.currentTarget;
        const next = Math.clamp(resolve(input.value) + (event.key === "ArrowUp" ? 1 : -1) * (step ?? 1), min, max);
        input.value = String(next);
        commit(input, next);
    };
</script>

{#if allowDelta}
    <input
        {...rest}
        type="text"
        inputmode="numeric"
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={Number.isFinite(min) ? min : undefined}
        aria-valuemax={Number.isFinite(max) ? max : undefined}
        value={String(value)}
        onfocus={(event) => event.currentTarget.select()}
        onchange={(event) => commit(event.currentTarget, resolve(event.currentTarget.value))}
        {onkeydown}
    />
{:else}
    <input
        {...rest}
        type="number"
        min={Number.isFinite(min) ? min : undefined}
        max={Number.isFinite(max) ? max : undefined}
        {step}
        value={String(value)}
        onfocus={(event) => event.currentTarget.select()}
        onchange={(event) => commit(event.currentTarget, resolve(event.currentTarget.value))}
    />
{/if}
