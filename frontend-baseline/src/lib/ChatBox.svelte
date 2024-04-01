<script lang="ts">
  // import UseSummaryRadio from "./UseSummaryRadio.svelte";
  const server_address = "http://localhost:5050";
  export let docs;
  export let selectedDocs;
  let searchLoading = false;
  //   let useRAG = true;
  let usePrefix = false;
  // let display_messages: any[] = [
  let display_messages: any[] = [];
  //   { role: "user", content: "abc\n\n abcd \n\n adbcece" },
  // ];
  let query_messages: any[] = [
    {
      role: "system",
      content:
        "You are an assistant for a visualization literature research. Your user is a researcher in visualization.",
    },
  ];
  let inputBox;
  let chatboxContent;

  // $: reposition_chatbox(messages)
  // function reposition_chatbox(_) {
  //     const chatbox_content = document.querySelector(".chatbox-content")
  //     if(chatbox_content) chatbox_content.scrollTop = chatbox_content.scrollHeight;
  // }

  async function RAG(user_input) {
    const hyde = false;
    const response = await fetch(`${server_address}/static/rag`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_input, hyde }),
    });
    let res: any[] = await response.json();
    // res = res.slice(0, 5);
    return res;
  }

  async function keyPressed(e) {
    if (e.code === "Enter") {
      const user_input = e.target.textContent;
      e.preventDefault();
      display_messages = [
        ...display_messages,
        { role: "user", content: user_input },
      ];
      searchLoading = true;
      if (inputBox) inputBox.textContent = "";
      if (docs.length === 0) {
        // RAG first
        docs = await RAG(user_input);
        console.log({ docs });
        query_messages = [
          ...query_messages,
          {
            role: "user",
            content:
              user_input +
              // "\n\n\nUse the following articles as context:\n" +
              "\n" +
              docs
                .map((doc, index) => `${doc.summary}`)
                // .map((doc, index) => `Article ${index}: ${doc.summary}`)
                .join("\n"),
          },
        ];
      } else {
        query_messages = [
          ...query_messages,
          {
            role: "user",
            content: user_input,
          },
        ];
      }
      queryChatbot();
    }
  }

  function queryChatbot() {
    fetch(`${server_address}/static/baseline_chat`, {
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
        query_messages = [...query_messages, new_message];
        display_messages = [...display_messages, new_message];
        // console.log(display_messages);
        console.log(query_messages);
      });
  }
</script>

<div class="chatbox-container flex flex-col w-full h-full justify-between">
  <div
    class="chatbox-content basis-[70%] grow overflow-y-auto"
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
            <div
              class="inline ml-2 border border-gray-400 grow w-fit rounded p-2 whitespace-pre-line"
              markdown="1"
            >
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
            <span class="animate-[flash_2s_infinite]">analyzing...</span>
          </div>
        </div>
      {/if}
    </div>
  </div>
  <div
    class="lower-section basis-[5%] shrink-0 flex flex-col shadow-inner border-solid rounded relative"
  >
    <div
      class="input-container grow shrink-0 border-[1px] border-solid border-gray-400 rounded overflow-y-auto mx-2 p-2 outline-none relative flex items-center"
    >
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="
            input-box
            text-region
            break-all
            h-full
            w-full
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
      <div class="inline text-2xl h-fit w-fit">
        <img class="icon" src="arrow.svg" alt="arrow" />
      </div>
    </div>
    <!-- <div class={`text-left mx-2 ${useRAG ? "" : "line-through"} w-full`}>
      RAG
      <input
        checked={useRAG}
        on:change={() => (useRAG = !useRAG)}
        id="checked-checkbox-rag"
        type="checkbox"
        value=""
        class="cursor-pointer w-4 h-4 inline text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
      />
    </div> -->
    <!-- <div class="controller-container grow shrink-0 m-2 flex flex-col">
      <div
        class="query-doc-list grow flex flex-col content-between justify-between"
      >
        <div class="text-left grow flex flex-col">
          <div class="font-bold">Selected Documents:</div>
          <div class="grow border rounded p-1">
            <ul class="list-disc list-inside">
              {#each selectedDocs as doc}
                <li class="mr-2 inline">#{doc.title}</li>
              {/each}
            </ul>
          </div>
        </div>
      </div>
    </div> -->
  </div>
</div>

<style>
  .icon {
    width: 28px;
    height: 28px;
  }
</style>
