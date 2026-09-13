<script lang="ts">
    import type { SvelteAppProps } from "@module/sheet/mixin.svelte.ts";
    import type { MigrationSummaryContext } from "./app.ts";
    import UnmigratedList from "./unmigrated-list.svelte";

    const {
        foundryApp,
        getState,
        remigrate,
        downloadReport,
    }: MigrationSummaryContext & SvelteAppProps<MigrationSummaryContext> = $props();
    const data = $derived(getState());
    let isRemigrating = $state(false);
    let okButton = $state<HTMLButtonElement>();
    const hasUnmigrated = $derived(data.unmigrated.actors.length + data.unmigrated.items.length > 0);
    const hasFailureReasons = $derived(
        data.unmigrated.actors.some((d) => d.reason) || data.unmigrated.items.some((d) => d.reason),
    );
    const showHelpResources = $derived(hasFailureReasons && !isRemigrating);

    async function handleRemigrate(): Promise<void> {
        try {
            isRemigrating = true;
            // Paint the busy state before the main thread blocks on migration.
            await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
            await remigrate();
        } finally {
            isRemigrating = false;
            // The remigrate button usually disappears after a run, dropping keyboard focus
            if (document.activeElement === document.body) okButton?.focus();
        }
    }
</script>

{#snippet documentRow(label: string, counts: { successful: number; total: number })}
    <tr>
        <td>{label}</td>
        <td>
            <span class="docs-successful">
                {#if isRemigrating}
                    <span aria-hidden="true">...</span>
                    <span class="sr-only">{_loc("PF2E.Migrations.Running")}</span>
                {:else}
                    {counts.successful}
                {/if}
            </span>
            / {counts.total}
        </td>
        <td>
            {#if isRemigrating}
                <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
            {:else if counts.successful === counts.total}
                <i class="fa-solid fa-check" aria-hidden="true"></i>
                <span class="sr-only">{_loc("PF2E.Migrations.Summary.Complete")}</span>
            {:else}
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                <span class="sr-only">{_loc("PF2E.Migrations.Summary.Incomplete")}</span>
            {/if}
        </td>
    </tr>
{/snippet}

<div class="container" aria-busy={isRemigrating}>
    <h2>
        {_loc(data.troubleshoot ? "PF2E.Migrations.Summary.Troubleshoot.Hint" : "PF2E.Migrations.Finished", {
            version: data.systemVersion,
        })}
    </h2>
    <div class="dialog-content" aria-live="polite">
        <table>
            <caption class="sr-only">{_loc("PF2E.Migrations.Summary.Title")}</caption>
            <thead>
                <tr>
                    <th scope="col">{_loc("PF2E.Migrations.Summary.Documents")}</th>
                    <th scope="col">
                        {_loc("PF2E.Migrations.Summary.Migrated")} / {_loc("PF2E.Migrations.Summary.Total")}
                    </th>
                    <th scope="col"><span class="sr-only">{_loc("PF2E.Migrations.Summary.Status")}</span></th>
                </tr>
            </thead>
            <tbody>
                {@render documentRow(_loc("PF2E.Actor.Plural"), data.actors)}
                {@render documentRow(_loc("PF2E.Item.Plural"), data.items)}
            </tbody>
        </table>
    </div>
    <!-- Live wrapper: the list and help text appearing after a remigration should be announced -->
    <div aria-live="polite">
        {#if hasUnmigrated}
            <section class="unmigrated" aria-labelledby="migration-summary-unmigrated">
                <h3 id="migration-summary-unmigrated">{_loc("PF2E.Migrations.Summary.UnmigratedDocuments")}</h3>
                <p class="hint">
                    {_loc(
                        hasFailureReasons
                            ? "PF2E.Migrations.Summary.UnmigratedDocumentsHint"
                            : "PF2E.Migrations.Summary.UnmigratedDocumentsHintRemigrate",
                    )}
                </p>
                <UnmigratedList
                    groups={[
                        { label: _loc("PF2E.Actor.Plural"), documents: data.unmigrated.actors },
                        { label: _loc("PF2E.Item.Plural"), documents: data.unmigrated.items },
                    ]}
                />
            </section>
        {/if}
        {#if showHelpResources}
            <p class="help-resources">{@html data.helpResources}</p>
        {/if}
    </div>
    <footer class="form-footer">
        <button type="button" bind:this={okButton} onclick={() => foundryApp.close()}>{_loc("PF2E.OK")}</button>
        {#if hasFailureReasons}
            <button type="button" onclick={downloadReport}>
                <i class="fa-solid fa-download" aria-hidden="true"></i>
                {_loc("PF2E.Migrations.Summary.Download")}
            </button>
        {/if}
        {#if data.canRemigrate}
            <button type="button" disabled={isRemigrating} onclick={handleRemigrate}>
                {_loc("PF2E.Migrations.Summary.Remigrate")}
            </button>
        {/if}
    </footer>
</div>

<style lang="scss">
    /* Use the app font so heading size/level stay independent of core's per-level fonts. */
    h2 {
        font-family: inherit;
        font-size: var(--font-size-16);
        line-height: 1.2;
    }

    .dialog-content > table {
        i.fa-check {
            color: var(--color-level-success);
        }

        i.fa-xmark {
            color: var(--color-level-error);
        }

        td,
        th {
            text-align: center;
        }
    }

    .form-footer button:disabled:hover {
        box-shadow: none;
    }

    section.unmigrated {
        margin-bottom: var(--space-8);

        h3 {
            font-family: inherit;
            font-size: var(--font-size-16);
            margin: 0 0 var(--space-4);
        }

        p.hint {
            margin: 0 0 var(--space-6);
        }
    }
</style>
