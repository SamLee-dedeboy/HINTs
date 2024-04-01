<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import DocCard from "./DocCard.svelte";
  const dispatch = createEventDispatcher();
  export let docs;
  export let cluster_label;
  export let theme;
  export let relevantDocIds;
  export let clickedDocs;

  $: relevantDocIdsInCluster = (() => {
    if (!docs) return undefined;
    if (!relevantDocIds) return undefined;
    if (relevantDocIds.length === 0) return undefined;
    return relevantDocIds.filter((id) => {
      return docs.map((doc) => doc.id).includes(id);
    });
  })();
  $: themeColor = getThemeColor(theme);
  $: sorted_docs = (() => {
    console.log(docs);
    if (!docs)
      return [
        { id: "1", title: "", summary: "" },
        { id: "2", title: "", summary: "" },
      ];
    // add highlight flag
    docs.forEach((doc) => {
      if (relevantDocIds === undefined) {
        doc.highlight = true;
        return;
      }
      if (relevantDocIds.length === 0) {
        doc.highlight = false;
        return;
      }
      if (relevantDocIds.includes(doc.id)) {
        doc.highlight = true;
      }
    });
    // sort by relevance
    if (relevantDocIds && relevantDocIds.length > 0) {
      docs.sort((a, b) => b.relevance! - a.relevance!);
    }
    return docs;
  })();

  $: ((_) => {
    if (sorted_docs)
      sorted_docs.forEach((doc) => {
        doc.clicked = clickedDocs.includes(doc.id);
      });
    sorted_docs = [...sorted_docs];
    console.log(clickedDocs, sorted_docs, relevantDocIds);
  })(clickedDocs);

  function handleCardClicked(event) {
    console.log(event.detail);
    const { doc_id, add } = event.detail;
    if (add) {
      clickedDocs = [...clickedDocs, doc_id];
    } else {
      clickedDocs = clickedDocs.filter((id) => id !== doc_id);
    }
  }
  function setOpacity(hex, alpha) {
    return `${hex}${Math.floor(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
  }
  function getThemeColor(theme) {
    return theme ? setOpacity(theme, 0.5) : "unset";
  }
</script>

<div class="doc-list-container px-2">
  <div
    role="button"
    tabindex="0"
    on:keyup={() => {
      if (clickedDocs.length !== 0) clickedDocs = [];
      else
        clickedDocs =
          relevantDocIdsInCluster || sorted_docs.map((doc) => doc.id);
    }}
    on:click={() => {
      if (clickedDocs.length !== 0) clickedDocs = [];
      else
        clickedDocs =
          relevantDocIdsInCluster || sorted_docs.map((doc) => doc.id);
    }}
    class="doc-list-header px-2 flex rounded items-center w-full justify-center cursor-pointer hover:shadow-xl"
    style={`background: ${themeColor}`}
  >
    <!-- svelte-ignore a11y-no-noninteractive-element-to-interactive-role -->
    <p class="cluster-label font-serif text-2xl w-fit">
      {cluster_label}
    </p>
  </div>
  <div class="doc-list-content">
    {#each sorted_docs as doc}
      <DocCard {doc} clicked={doc.clicked} on:click={handleCardClicked}
      ></DocCard>
    {/each}
  </div>
</div>
