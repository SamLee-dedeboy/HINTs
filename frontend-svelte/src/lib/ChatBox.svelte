<script lang="ts">
  import UseSummaryRadio from "./UseSummaryRadio.svelte";
  const server_address = "http://localhost:5000";
  export let queryDocs;
  let searchLoading = false;
  let usePrefix = false;
  let useSummary = true;
  const init_system_message = {
    role: "system",
    content:
      "You are a chatbot for visualization literature review. You help a first year phd student do literature review in the filed of visualization research.",
  };
  let display_messages: any[] = [];
  let query_messages: any[] = [init_system_message];
  let inputBox;
  let chatboxContent;

  // $: reposition_chatbox(messages)
  // function reposition_chatbox(_) {
  //     const chatbox_content = document.querySelector(".chatbox-content")
  //     if(chatbox_content) chatbox_content.scrollTop = chatbox_content.scrollHeight;
  // }
  $: usePrefix = queryDocs?.length > 0;
  async function keyPressed(e) {
    if (e.code === "Enter") {
      e.preventDefault();
      const user_input = e.target.textContent;
      // display message
      let new_message;
      if (usePrefix) {
        new_message = {
          role: "user",
          content: `Given the selected documents, ` + user_input,
        };
      } else {
        new_message = {
          role: "user",
          content: user_input,
        };
      }
      display_messages = [...display_messages, new_message];
      // update UI
      if (inputBox) inputBox.textContent = "";
      searchLoading = true;
      // query message
      if (usePrefix) {
        let doc_ids = queryDocs;
        if (doc_ids.length > 50) {
          doc_ids = doc_ids.slice(0, 50);
        }
        console.log({ doc_ids });
        await fetch(`${server_address}/static/articles/`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ doc_ids }),
        })
          .then((res) => res.json())
          .then((response) => {
            console.log(response);
            const article_summaries = response.map(
              (article) => article.summary
            );
            const new_query_message = {
              role: "user",
              content:
                `Given the selected documents, ` +
                user_input +
                `\n` +
                article_summaries.join("Article: \n"),
            };
            query_messages = [...query_messages, new_query_message];
          });
      } else {
        const new_query_message = {
          role: "user",
          content: user_input,
        };
        query_messages = [...query_messages, new_query_message];
      }
      usePrefix = false;
      queryChatbot();
    }
  }

  function queryChatbot() {
    fetch(`${server_address}/static/chat`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query_messages,
      }),
    })
      .then((res) => res.json())
      .then((response) => {
        console.log({ response });
        const new_message = {
          role: "system",
          content: response,
        };
        searchLoading = false;
        display_messages = [...display_messages, new_message];
        query_messages = [...query_messages, new_message];
        console.log(query_messages);
      });
  }
</script>

<div class="chatbox-container flex flex-col h-full w-full justify-between">
  <div
    class="chatbox-content basis-[70%] shrink overflow-y-auto"
    bind:this={chatboxContent}
  >
    <div class="chatbox-messages flex flex-col py-2">
      {#if display_messages.length === 0}
        <div
          class={`chatbox-message w-fit mx-2 text-left flex items-center my-1`}
        >
          <div class="inline text-2xl h-fit">
            <img class="icon" src="user.svg" alt="user" />
          </div>
          <div class="inline ml-2 border rounded p-2 w-[100px]">{""}</div>
        </div>
      {:else}
        {#each display_messages as message, index}
          <div
            class={`chatbox-message w-fit mx-2 text-left flex items-start my-1`}
          >
            <div class="inline text-2xl h-fit w-fit">
              {#if message.role === "system"}
                <img class="icon" src="bot.svg" alt="bot" />
              {:else}
                <img class="icon" src="user.svg" alt="user" />
              {/if}
            </div>
            <div class="inline ml-2 border grow w-fit rounded p-2">
              {message.content}
            </div>
          </div>
        {/each}
      {/if}
      {#if searchLoading}
        <div
          class={`chatbox-message w-fit mx-2 text-left flex items-center my-1`}
        >
          <div class="inline text-2xl h-fit">
            <img class="icon" src="bot.svg" alt="bot" />
          </div>
          <div class="inline ml-2 border rounded p-2">
            <span class="animate-[flash_2s_infinite]">...</span>
          </div>
        </div>
      {/if}
    </div>
  </div>
  <div
    class="lower-section basis-[30%] overflow-hidden grow-0 shrink-0 h-full w-full flex flex-col shadow-inner border-solid rounded"
  >
    <div class="basis-[10%] h-fit flex">
      <div class={`text-left mx-2 ${usePrefix ? "" : "line-through"}`}>
        Given the selected documents,
        <!-- <Checkbox checked={usePrefix} onChange={(e) => usePrefix = e.target.checked}></Checkbox> -->
        <input
          checked={usePrefix}
          on:change={() => (usePrefix = !usePrefix)}
          id="checked-checkbox"
          type="checkbox"
          value=""
          class="w-4 h-4 inline text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <!-- <label for="checked-checkbox" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Checked state</label> -->
      </div>
      <button
        class={"clear-chat btn px-2 h-full py-0  ml-auto inline-block text-[14px] items-center"}
        on:click={() => {
          display_messages = [];
          query_messages = [init_system_message];
        }}>Clear Chat</button
      >
    </div>
    <div
      class="input-container grow-0 basis-[40%] shrink-0 border-[1px] border-solid rounded overflow-y-auto mx-2 p-2 outline-none"
    >
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="
            input-box
            text-region
            break-all
            h-full
            outline-none
            text-left"
        bind:this={inputBox}
        contentEditable={true}
        placeholder="input search text"
        on:keyup={keyPressed}
        on:keydown={(e) => {
          if (e.code === "Enter") e.preventDefault();
        }}
      />
    </div>
    <div
      class="controller-container grow basis-[40%] h-full w-full overflow-y-auto p-2 flex flex-col"
    >
      <div
        class="query-doc-list grow-0 flex flex-col h-full w-full content-between justify-between"
      >
        <div class="text-left grow-0 pt-6 flex h-full w-full flex-col relative">
          <div class="absolute top-0 font-bold">Selected Documents:</div>
          <div
            class="grow-0 border rounded p-1 h-full w-full whitespace-pre-wrap overflow-y-auto"
          >
            {queryDocs.join(", ")}
            <!-- <ul class="list-disc list-inside">
              {#each queryDocs as doc}
                <li class="mr-2 inline">#{doc}</li>
              {/each}
            </ul> -->
          </div>
        </div>
      </div>
      <!-- <div class="flex items-center justify-between">
        <div class='w-fit basis-[70%] mt-1 inline-block font-serit'>
                    <UseSummaryRadio bind:useSummary={useSummary} />
                </div>
      </div> -->
    </div>
  </div>
</div>

<style>
  .icon {
    width: 28px;
    height: 28px;
  }
</style>
