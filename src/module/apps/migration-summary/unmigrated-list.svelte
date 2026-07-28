<script lang="ts">
    import type { UnmigratedDocument } from "./app.ts";

    interface DocumentGroup {
        label: string;
        documents: UnmigratedDocument[];
    }

    const { groups }: { groups: DocumentGroup[] } = $props();
    const populated = $derived(groups.filter((g) => g.documents.length > 0));

    async function openDocument(uuid: string): Promise<void> {
        const document = await fromUuid(uuid);
        document?.sheet?.render(true);
    }
</script>

<div class="document-list">
    {#each populated as group (group.label)}
        {#if populated.length > 1}
            <h4>{group.label}</h4>
        {/if}
        <ul role="list" aria-label={group.label}>
            {#each group.documents as document (document.uuid)}
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
            {/each}
        </ul>
    {/each}
</div>

<style lang="scss">
    .document-list {
        max-height: 10rem;
        overflow-y: auto;
        border: 1px solid var(--color-border);
        border-radius: 3px;

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
</style>
