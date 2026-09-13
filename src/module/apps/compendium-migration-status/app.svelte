<script lang="ts">
    import type { SvelteAppProps } from "@module/sheet/mixin.svelte.ts";
    import { tick } from "svelte";
    import UnmigratedList from "../migration-summary/unmigrated-list.svelte";
    import type { CompendiumMigrationStatusContext } from "./app.ts";

    const {
        foundryApp,
        getState,
        migrate,
    }: CompendiumMigrationStatusContext & SvelteAppProps<CompendiumMigrationStatusContext> = $props();
    const data = $derived(getState());
    let isMigrating = $state(false);
    let statusEl = $state<HTMLElement>();

    async function handleMigrate(): Promise<void> {
        try {
            isMigrating = true;
            await migrate();
        } finally {
            isMigrating = false;
            // Disabling the button (and removing it on success) drops keyboard focus to the body
            await tick();
            if (document.activeElement === document.body) {
                statusEl?.querySelector<HTMLElement>("button, .updated")?.focus();
            }
        }
    }
</script>

<div class="container" aria-busy={isMigrating}>
    <dl class="striped">
        <dt>{_loc("DOCUMENT.FIELDS.name.label")}</dt>
        <dd>{data.label}</dd>
        <dt>{_loc("PF2E.CompendiumMigrationStatus.Document")}</dt>
        <dd>{data.documentName}</dd>
        <dt>{_loc("PACKAGE.Type.module")}</dt>
        <dd>
            {#if data.moduleTitle}
                {data.moduleTitle}
            {:else}
                <span class="empty">({_loc("COMMON.None")})</span>
            {/if}
        </dd>
        <dt>{_loc("PF2E.CompendiumMigrationStatus.Size")}</dt>
        <dd>{data.size}</dd>
        {#if data.size}
            <dt>{_loc("PF2E.CompendiumMigrationStatus.Schema")}</dt>
            <dd>
                {data.schemaVersion}
                {#if !data.updated}
                    <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    {data.latestVersion}
                {/if}
            </dd>
            <dt>{_loc("PF2E.CompendiumMigrationStatus.Foundry")}</dt>
            <dd>{data.foundryVersion}</dd>
            {#if !data.updated}
                <dt>{_loc("PF2E.CompendiumMigrationStatus.OutOfDate")}</dt>
                <dd>{data.outdatedCount} / {data.size}</dd>
            {/if}
        {/if}
    </dl>
    <!-- Live wrapper: failures appearing after a migration run should be announced -->
    <div aria-live="polite">
        {#if data.failures.length > 0}
            <section class="failures" aria-labelledby="{foundryApp.id}-failures">
                <h2 id="{foundryApp.id}-failures">{_loc("PF2E.CompendiumMigrationStatus.FailedDocuments")}</h2>
                <UnmigratedList groups={[{ label: data.documentName, documents: data.failures }]} />
            </section>
        {/if}
    </div>
    <div class="status" aria-live="polite" bind:this={statusEl}>
        {#if data.updated}
            <div class="updated" tabindex="-1">
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                {_loc("PF2E.CompendiumMigrationStatus.UpToDate")}
            </div>
        {:else}
            <button
                type="button"
                data-tooltip={data.locked ? _loc("PF2E.CompendiumMigrationStatus.LockedTooltip") : null}
                disabled={data.locked || isMigrating}
                onclick={handleMigrate}
            >
                {#if isMigrating}
                    <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                {:else}
                    <i class="fa-solid fa-crow" aria-hidden="true"></i>
                {/if}
                {_loc("PF2E.CompendiumMigrationStatus.MigrateCompendium")}
            </button>
        {/if}
    </div>
</div>

<style lang="scss">
    .container {
        display: flex;
        flex-direction: column;
        gap: var(--space-8);
        max-width: 20rem;
    }

    dl.striped {
        user-select: text;

        dt {
            text-align: end;
        }

        dd .empty {
            color: var(--color-text-secondary);
        }
    }

    section.failures h2 {
        font-family: inherit;
        font-size: var(--font-size-16);
        margin: 0 0 var(--space-4);
    }

    .status {
        display: flex;

        > * {
            flex: 1;
        }

        .updated {
            align-items: center;
            border: 1px dashed var(--alt);
            display: flex;
            gap: var(--space-4);
            justify-content: center;
            padding: var(--space-4);
        }
    }
</style>
