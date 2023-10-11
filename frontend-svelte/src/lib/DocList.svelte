<script lang=ts>
    import { createEventDispatcher } from "svelte";
    import DocCard from "./DocCard.svelte";
    const dispatch = createEventDispatcher();
    export let docs;
    export let cluster_label;
    export let theme;
    export let highlightDocs;
    export let clickedDocs;

    $: themeColor = getThemeColor(theme)
    $: highlightDocIds = highlightDocs?.map(doc => doc.id)
    $: highlightedDocs = (() => {
        console.log(docs)
        if(!docs) return [{ id: "1", title: "", summary: ""}, { id: "2", title: "", summary: ""}]
        // add highlight flag
        docs.forEach(doc => {
        if(highlightDocIds === undefined) {
            doc.highlight = true;
            return
        }
        if(highlightDocIds.length === 0) {
            doc.highlight = false;
            return
        }
        if(highlightDocIds.includes(doc.id)) {
            doc.highlight = true;
        }
        })
        // sort by relevance
        if(highlightDocs && highlightDocs.length > 0) {
            docs.sort((a, b) => b.relevance! - a.relevance!)
        }
        return docs
    })()

    function handleCardClicked(event) {
        console.log(event.detail)
        const {doc_id, add} = event.detail
        if(add) {
            clickedDocs = [...clickedDocs, doc_id]
        } else {
            clickedDocs = clickedDocs.filter(id => id !== doc_id)
        }
    }
    function setOpacity(hex, alpha) {
        return `${hex}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
    }
    function getThemeColor(theme) {
        return theme? setOpacity(theme, 0.5) : "unset"
    }
</script>
<div class="doc-list-container px-2">
    <div class='doc-list-header px-2 flex rounded items-center w-full justify-center' style={`background: ${themeColor}`}>
        <p class="cluster-label font-serif text-2xl w-fit" >{ cluster_label }</p>
    </div>
    <div class="doc-list-content">
        {#each highlightedDocs as doc}
            <DocCard doc={doc}  on:click={handleCardClicked}></DocCard>
        {/each}
    </div>
</div>
