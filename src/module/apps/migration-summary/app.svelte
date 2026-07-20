<script lang="ts">
    import type { SvelteAppProps } from "@module/sheet/mixin.svelte.ts";
    import type { MigrationSummaryContext, UnmigratedDocument } from "./app.ts";

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

    async function openDocument(uuid: string): Promise<void> {
        const document = await fromUuid(uuid);
        document?.sheet?.render(true);
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

{#snippet documentEntry(document: UnmigratedDocument)}
    <li>
        <button
            type="button"
            data-tooltip-text={document.reason ? `${document.name}: ${document.reason}` : document.name}
            onclick={() => openDocument(document.uuid)}
        >
            <span class="name">{document.name}</span>
            {#if document.reason}
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <span class="sr-only">{document.reason}</span>
            {/if}
        </button>
    </li>
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
                <div class="document-list">
                    {#if data.unmigrated.actors.length > 0}
                        {#if data.unmigrated.items.length > 0}
                            <h4>{_loc("PF2E.Actor.Plural")}</h4>
                        {/if}
                        <ul role="list" aria-label={_loc("PF2E.Actor.Plural")}>
                            {#each data.unmigrated.actors as document (document.uuid)}
                                {@render documentEntry(document)}
                            {/each}
                        </ul>
                    {/if}
                    {#if data.unmigrated.items.length > 0}
                        {#if data.unmigrated.actors.length > 0}
                            <h4>{_loc("PF2E.Item.Plural")}</h4>
                        {/if}
                        <ul role="list" aria-label={_loc("PF2E.Item.Plural")}>
                            {#each data.unmigrated.items as document (document.uuid)}
                                {@render documentEntry(document)}
                            {/each}
                        </ul>
                    {/if}
                </div>
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

        h4 {
            background: var(--table-header-bg-color);
            font-family: inherit;
            font-size: var(--font-size-14);
            font-variant: small-caps;
            font-weight: bold;
            letter-spacing: 0.05em;
            line-height: 1.75;
            margin: var(--space-12) 0 0;
            padding: 0 var(--space-8);

            &:first-child {
                margin-top: 0;
            }
        }

        .document-list {
            max-height: 10rem;
            overflow-y: auto;
            border: 1px solid var(--color-border);
            border-radius: 3px;

            ul {
                list-style: none;
                margin: 0;
                padding: 0;
            }

            li {
                margin-bottom: 0;
                overflow: hidden;

                &:nth-child(odd) {
                    background-color: var(--table-row-color-odd);
                }

                &:nth-child(even) {
                    background-color: var(--table-row-color-even);
                }

                &:hover {
                    background-color: var(--table-row-color-highlight);
                }
            }

            button {
                align-items: center;
                background: none;
                border: none;
                box-shadow: none;
                cursor: pointer;
                transition: none;
                display: flex;
                gap: var(--space-4);
                width: 100%;
                height: auto;
                padding: 0 var(--space-12);
                text-align: left;

                .name {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                i.fa-triangle-exclamation {
                    color: var(--color-level-warning);
                }

                &:hover {
                    box-shadow: none;
                    text-shadow: none;
                }

                &:focus {
                    outline: none;
                    box-shadow: none;
                }

                &:focus-visible {
                    outline: 2px solid var(--button-focus-outline-color);
                    outline-offset: -2px;
                }
            }
        }
    }
</style>
