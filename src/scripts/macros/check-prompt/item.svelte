<script>
    export let itemLabel;
    export let highlighted;
</script>

<li class="autocomplete-items">
    <button class:autocomplete-active={highlighted} on:click>
        {@html itemLabel}
    </button>
</li>