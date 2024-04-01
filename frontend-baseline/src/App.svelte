<script lang="ts">
  import ChatBox from "./lib/ChatBox.svelte";
  import DocList from "./lib/DocList.svelte";
  let docs: any[] = [];
  let selectedDocs: any[] = [];
  $: console.log(docs);
</script>

<div
  class="w-screen h-screen p-2 py-10 flex items-center justify-center bg-stone-200"
>
  <div
    class="basis-[40%] flex border border-gray-500 border-solid rounded h-full py-2 shadow-lg"
  >
    <ChatBox bind:docs bind:selectedDocs />
  </div>
  <!-- <div class="basis-[40%] flex border border-black border-solid rounded h-full">
    <DocList {docs} bind:clickedDocs={selectedDocs} />
  </div> -->
</div>
