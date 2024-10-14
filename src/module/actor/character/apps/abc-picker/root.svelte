<script lang="ts">
    import type { ItemPF2e } from "@item";
    import type { ABCPickerContext } from "./app.ts";

    const data: ABCPickerContext = $props();
    async function openItemSheet(event: MouseEvent & { currentTarget: HTMLButtonElement }): Promise<void> {
        const uuid = event.currentTarget.closest("li")?.dataset.uuid;
        if (uuid) {
            const item = await fromUuid<ItemPF2e>(uuid);
            item?.sheet.render(true);
        }
    }
</script>

<header>
    <h4>Select an Ancestry</h4>
</header>
<div class="search">
    <i class="fa-solid fa-search"></i>
    <input type="search" placeholder="Search" />
</div>
<ul>
    {#each data.items as item}
        <li data-uuid={item.uuid}>
            <img src={item.img} loading="lazy" alt="Class icon" />
            <button type="button" class="flat name-source" onclick={openItemSheet}>
                <div class="name">{item.name}</div>
                <div class="source" class:publication={item.source.publication}>{item.source.name}</div>
            </button>
        </li>
    {/each}
</ul>

<style lang="scss">
    header {
        align-items: center;
        background: no-repeat center/cover url("/assets/compendium-banner/red.webp");
        border-radius: 2px;
        flex: 0 0 84px;
        height: 84px;
        justify-content: center;

        h4 {
            align-items: center;
            background: rgba(black, 0.7);
            border-radius: 5px;
            border: 1px solid var(--color-border-dark);
            color: var(--color-text-light-1);
            display: flex;
            font: 400 var(--font-size-16) var(--serif);
            gap: var(--space-4);
            margin: 0 1rem;
            padding: 0.5rem;
        }
    }

    .search {
        align-items: center;
        flex-flow: row nowrap;
        gap: var(--space-8);
        justify-content: start;
        padding: var(--space-2) var(--space-8) var(--space-4);

        input::placeholder {
            color: var(--color-light-5);
        }
    }

    ul {
        flex-flow: column nowrap;
        height: 100%;
        list-style: none;
        margin: 0;
        overflow: hidden scroll;
        padding: var(--space-4) 0;

        & > li {
            align-items: center;
            border-top: 1px solid var(--color-border);
            display: flex;
            gap: var(--space-8);
            margin: 0;
            padding: var(--space-3) var(--space-6);

            img {
                color: pointer;
                border: none;
                height: 3rem;
            }

            button.name-source {
                display: flex;
                flex-flow: column nowrap;

                .source {
                    color: var(--color-form-hint);
                    font-size: var(--font-size-12);

                    &.publication {
                        font-style: italic;
                    }
                }
            }
        }
    }
</style>
