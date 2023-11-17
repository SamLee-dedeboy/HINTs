<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let doc;
  let clicked = false;

  // $: highlight = doc?.highlight ? 'opacity-100' : 'opacity-50'
  $: clickedStyle = clicked ? "border-solid bg-sky-100" : "border-double";
  $: clickable =
    doc.title === "" ? "pointer-events-none" : "pointer-events-auto";
  $: highlightedSummary = (() => {
    if (doc?.summary === undefined) return undefined;
    if (doc?.entity_spans === undefined) return doc.summary;
    // return doc.summary
    return add_highlights(doc.summary, doc.entity_spans);
  })();

  function add_highlights(raw_text: string, highlights: any[]) {
    if (!highlights || highlights?.length === 0) return raw_text;
    let non_highlight_start = 0;
    let divided_text: any[] = [];
    // values:
    // 0 (normal)
    // 1 (highlight)
    let divided_marks: any[] = [];
    highlights.forEach((highlight) => {
      const highlight_start = highlight[0];
      const highlight_end = highlight[1];
      // add normal text
      if (non_highlight_start !== highlight_start) {
        divided_text.push(
          raw_text.substring(non_highlight_start, highlight_start)
        );
        divided_marks.push(0);
      }
      // add highlight
      divided_text.push(raw_text.substring(highlight_start, highlight_end));
      divided_marks.push(1);
      non_highlight_start = highlight_end;
    });
    if (non_highlight_start < raw_text.length) {
      divided_text.push(raw_text.substring(non_highlight_start));
      divided_marks.push(0);
    }
    let res = "";
    divided_text.forEach((sub_text, index) => {
      if (divided_marks[index] === 0) res += sub_text;
      else res += highlight_element(sub_text);
    });
    return res;
  }
  function highlight_element(text) {
    return `<span class="bg-yellow-200">${text}</span>`;
  }
  function setOpacity(hex, alpha) {
    return `${hex}${Math.floor(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
  }
  function getThemeColor(theme) {
    return setOpacity(theme, 0.5);
  }
</script>

<!-- svelte-ignore a11y-interactive-supports-focus -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class={`doc-card-container 
    flex flex-col 
    px-2 my-2 
    min-h-[200px]
    font-serif 
    border-4 rounded 
    ${clickedStyle}
    ${clickable}
    cursor-pointer 
    hover:border-solid 
    hover:shadow-2xl 
    border-gray-400
    `}
  role="button"
  on:click={() => {
    dispatch("click", {
      id: doc.id || "",
      add: !clicked,
      title: doc.title,
    });
    clicked = !clicked;
  }}
>
  <div class="doc-card-header flex items-center font-semibold text-lg">
    <div class="doc-card-title px-1 mr-2">{doc?.title || ""}</div>
  </div>
  <div class="doc-card-content flex flex-col">
    <p class="doc-card-content text-left px-1">
      {highlightedSummary || ""}
    </p>
    <p class="text-left px-1 text-sm">
      <span class="text-left px-1"> Article ID: #{doc.id} </span>
      <span class="text-left px-1">
        Relevance: {doc.relevance?.toFixed(2)}
      </span>
    </p>
  </div>
</div>
