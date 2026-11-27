<script lang="ts">
    import { signedInteger } from "@util";
    import type { HTMLInputAttributes } from "svelte/elements";
    import { parseInteger, type Commit } from "./helpers.ts";

    /**
     * A number field for a value that effects can adjust, like AC. It shows the prepared value, and switches to the
     * stored value while focused, since that is the one being edited.
     */
    interface AdjustableNumberInputProps extends Omit<HTMLInputAttributes, "value" | "type" | "onchange"> {
        /** The prepared value, shown while not editing */
        value: number;
        /** The stored value, shown and edited while focused */
        source: number;
        /** Show the prepared value with a sign. Makes the input a text input. */
        signed?: boolean;
        onCommit: Commit<number>;
    }

    const { value, source, signed = false, onCommit, ...rest }: AdjustableNumberInputProps = $props();

    let focused = $state(false);
    /** A committed value, shown after blur until the new source arrives and resets it */
    let pending = $derived.by<number | null>(() => {
        void source;
        return null;
    });
    const format = (n: number): string => (signed ? signedInteger(n) : String(n));
    const display = $derived(format(pending ?? value));
    const adjustment = $derived(value > source ? "adjusted-higher" : value < source ? "adjusted-lower" : null);

    // Svelte doesn't own the input's value, so updates arriving mid-edit leave the typed text alone
    const showPrepared = (input: HTMLInputElement): void => {
        if (!focused) input.value = display;
    };

    const onfocus = (event: FocusEvent & { currentTarget: HTMLInputElement }): void => {
        focused = true;
        event.currentTarget.value = String(source);
        event.currentTarget.select();
    };

    const commitText = async (input: HTMLInputElement): Promise<void> => {
        const parsed = parseInteger(input.value);
        if (parsed === null || parsed === source) {
            if (focused) input.value = String(source);
            return;
        }
        const from = source;
        pending = parsed;
        const stored = Number(await onCommit(parsed));
        const changed = stored !== from && !Number.isNaN(stored);
        // Unchanged means no new source is coming to reset it
        if (source === from) pending = changed ? stored : null;
        if (focused) input.value = String(changed ? stored : from);
    };

    // A number input steps on its own
    const onkeydown = (event: KeyboardEvent & { currentTarget: HTMLInputElement }): void => {
        if (!signed || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
        event.preventDefault();
        const input = event.currentTarget;
        const current = parseInteger(input.value) ?? source;
        input.value = String(current + (event.key === "ArrowUp" ? 1 : -1));
        commitText(input);
    };
</script>

<input
    {...rest}
    type={signed ? "text" : "number"}
    inputmode={signed ? "numeric" : undefined}
    role={signed ? "spinbutton" : undefined}
    aria-valuenow={signed ? (pending ?? (focused ? source : value)) : undefined}
    class={[rest.class, adjustment, { focused }]}
    {@attach showPrepared}
    {onfocus}
    onblur={() => (focused = false)}
    onchange={(event) => commitText(event.currentTarget)}
    {onkeydown}
/>

<style>
    input {
        &.adjusted-higher:not(.focused) {
            color: var(--color-pf-text-adjusted-higher);
        }

        &.adjusted-lower:not(.focused) {
            color: var(--color-pf-text-adjusted-lower);
        }
    }
</style>
