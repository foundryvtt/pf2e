<script lang="ts">
    import MiniSearch from "minisearch";

    interface InventoryItem extends Pick<PhysicalItemPF2e, "uuid" | "id" | "name" | "img" | "quantity"> {
        parentItem?: InventoryItem;
        contents: InventoryItem[];
    }

    interface InventoryProps {
        items: InventoryItem[];
    }

    const { items }: InventoryProps = $props();

    const minisearch = new MiniSearch<Pick<PhysicalItemPF2e, "id" | "name">>({
        fields: ["name"],
        idField: "id",
        processTerm: (t) => (t.length > 1 ? t.toLocaleLowerCase(game.i18n.lang) : null),
        searchOptions: { combineWith: "AND", prefix: true },
    });

    $effect(() => {
        minisearch.clear();
        minisearch.addAll(items.map((i) => R.pick(i, ["id", "name"])));
    });
</script>
