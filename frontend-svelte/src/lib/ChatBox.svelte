<script lang=ts>
    import UseSummaryRadio from "./UseSummaryRadio.svelte";
    const server_address = "http://localhost:5050"
    export let queryDocs;
    let searchLoading = false;
    let usePrefix = false;
    let useSummary = true;
    let messages: any[] = []
    let inputBox;
    let chatboxContent;


    // $: reposition_chatbox(messages)
    // function reposition_chatbox(_) {
    //     const chatbox_content = document.querySelector(".chatbox-content")
    //     if(chatbox_content) chatbox_content.scrollTop = chatbox_content.scrollHeight;
    // }
    $: usePrefix = queryDocs?.length > 0
    function keyPressed(e) {
        if(e.code === "Enter") {
            e.preventDefault();
            let new_message;
            if(usePrefix) {
                new_message = {
                "role": "user",
                "content": `Given the selected documents, ` + e.target.textContent
                }
            } else {
                new_message = {
                "role": "user",
                "content": e.target.textContent
                }
            }
            messages = [...messages, new_message]
            queryChatbot()
            usePrefix = false
            if(inputBox) inputBox.textContent = ""
            searchLoading = true
        }
    }

    function queryChatbot() {
        const init_message: any[] = [{role: "system", content: "You are a chatbot used for text analysis."}]
        const queryMessages = init_message.concat(messages)
        const useQueryDocs = usePrefix
        fetch(`${server_address}/static/chat`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ queryMessages, useQueryDocs, queryDocs, useSummary })
        })
        .then(res => res.json())
        .then(response => {
            console.log({response})
            const new_message = {
                "role": "system",
                "content": response
            }
            searchLoading = false
            messages = [...messages, new_message]
        })
    }
</script>
<div class="chatbox-container flex flex-col h-full justify-between">
    <div class="chatbox-content basis-[70%] shrink overflow-y-auto" bind:this={chatboxContent}>
        <div class="chatbox-messages flex flex-col py-2">
            {#if messages.length === 0}
                <div class={ `chatbox-message w-fit mx-2 text-left flex items-center my-1`}> 
                <div class="inline text-2xl h-fit"> <img class='icon' src='user.svg' alt='user'/> </div>
                <div class="inline ml-2 border rounded p-2 w-[100px]"> { "" } </div>
                </div>
            {:else}
                {#each messages as message, index}
                    <div class={ `chatbox-message w-fit mx-2 text-left flex items-center my-1`} > 
                        <div class="inline text-2xl h-fit"> 
                            {#if message.role === "system"}
                                <img class='icon' src='bot.svg' alt='bot' /> 
                            {:else}
                                <img class='icon'src='user.svg' alt='user'/>
                            {/if}
                        </div>
                        <div class="inline ml-2 border rounded p-2"> { message.content } </div>
                    </div>
                {/each}
            {/if}
            {#if searchLoading}
                <div class={ `chatbox-message w-fit mx-2 text-left flex items-center my-1`} > 
                <div class="inline text-2xl h-fit">  <img class='icon' src='bot.svg' alt='bot' /> </div>
                <div class="inline ml-2 border rounded p-2"> 
                    <span class='animate-[flash_2s_infinite]'>...</span>
                </div>
                </div>
            {/if}
        </div>
    </div>
    <div class="lower-section basis-[30%] shrink-0 flex flex-col shadow-inner border-solid rounded ">
        <div class={`text-left mx-2 ${usePrefix? "":"line-through"}`}>Given the selected documents, 
            <!-- <Checkbox checked={usePrefix} onChange={(e) => usePrefix = e.target.checked}></Checkbox> -->
            <input checked={usePrefix} on:change={() => usePrefix=!usePrefix} id="checked-checkbox" type="checkbox" value="" class="w-4 h-4 inline text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
            <!-- <label for="checked-checkbox" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Checked state</label> -->
        </div>
        <div class="input-container grow shrink-0 border-[1px] border-solid rounded overflow-y-auto mx-2 p-2 outline-none ">
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="
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
            on:keydown={(e) => { if(e.code === "Enter") e.preventDefault(); }}
            />
        </div>
        <div class="controller-container grow shrink-0 m-2 flex flex-col">
            <div class="query-doc-list grow flex flex-col content-between justify-between">
            <div class="text-left grow flex flex-col">
                <div class="font-bold"> Selected Documents: </div>
                <div class="grow border rounded p-1"> 
                <ul class='list-disc list-inside'>
                    {#each queryDocs as doc}
                        <li class="mr-2 inline"> #{doc} </li>
                    {/each}
                </ul>
                </div>
            </div>
            </div>
            <div class="flex items-center justify-between">
                <div class='w-fit basis-[70%] mt-1 inline-block font-serit'>
                    <UseSummaryRadio bind:useSummary={useSummary} />
                </div>
                <button class={"clear-chat btn ml-1 mt-1 px-2 h-full py-0 h-[32px] inline-block text-[14px] items-center"} on:click={() => messages=[]}>Clear Chat</button>
            </div>
        </div>
    </div>
</div>

<style>
    .icon {
        width: 28px;
        height: 28px;
    }
</style>