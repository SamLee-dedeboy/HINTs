<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import DocCard from "./DocCard.svelte";
  const dispatch = createEventDispatcher();
  export let docs;
  export let clickedDocs;

  function handleCardClicked(event) {
    console.log(event.detail);
    const { id, add, title } = event.detail;
    if (add) {
      clickedDocs = [...clickedDocs, { id, title }];
    } else {
      clickedDocs = clickedDocs.filter((doc) => doc.id !== id);
    }
  }
</script>

<div class="doc-list-container px-2 w-full h-full flex flex-col">
  <div
    class="doc-list-header px-2 flex rounded items-center w-full justify-center"
  >
    <p class="cluster-label font-serif text-2xl w-fit">Document List</p>
  </div>
  <div class="grow overflow-y-scroll">
    <div class="doc-list-content">
      {#each docs as doc}
        <DocCard {doc} on:click={handleCardClicked} />
      {/each}
    </div>
  </div>
</div>
