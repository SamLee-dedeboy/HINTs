import { useState, useEffect, useMemo, useRef, MutableRefObject } from 'react'
import { server_address } from '../../shared'
import { Radio, Checkbox } from 'antd';
import {
  UserOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { select } from 'd3';

type ChatgptMessage = {
  role: string
  content: string
}

function ChatBox({queryDocs}) {

  // const [query, setQuery] = useState<string>("")
  const inputBox: MutableRefObject<any> = useRef(null)
  const chatboxContent: MutableRefObject<any> = useRef(null)
  const [searchLoading, setSearchLoading] = useState<boolean>(false)
  const [usePrefix, setUsePrefix] = useState<boolean>(false)
  const [useSummary, setUseSummary] = useState<boolean>(true)
  const [messages, setMessages] = useState<Array<ChatgptMessage>>([])

  useEffect(() => {
    chatboxContent.current.scrollTop = chatboxContent.current.scrollHeight;
  }, [messages])

  useEffect(() => {
    if(queryDocs.length > 0) setUsePrefix(true)
    else setUsePrefix(false)
  }, [queryDocs])

  // const messages: MutableRefObject<Array<ChatgptMessage>> = useRef([{role: "system", content: "You are a chatbot used for text analysis."}])
  const queryOptions = [
    { label: 'Use Summary', value: true }, 
    { label: 'Use Full Content', value: false }
  ]

  function keyPressed(e) {
    if(e.code === "Enter"){
      e.preventDefault();
      let new_message: ChatgptMessage
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
      const tmp_messages = [...messages, new_message]
      queryChatbot(tmp_messages)
      setMessages(tmp_messages)
      setUsePrefix(false)
      inputBox.current!.textContent = ""
    }
  }

  function queryChatbot(messages: Array<ChatgptMessage>) {
    const init_message: Array<ChatgptMessage> = [{role: "system", content: "You are a chatbot used for text analysis."}]
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

      setMessages([...messages, new_message])
    })
  }

  

  return (
    <>
      <div className="chatbox-container flex flex-col h-full justify-between">
        <div className="chatbox-content basis-[70%] shrink overflow-y-auto" ref={chatboxContent}>
          <div className="chatbox-messages flex flex-col py-2">
            {
              messages.length === 0 &&
              <div className={ `chatbox-message w-fit mx-2 text-left flex items-top my-1`}> 
                <div className="inline text-2xl h-fit"> <UserOutlined/> </div>
                <div className="inline ml-2 border rounded p-2 w-[100px]"> { "" } </div>
              </div>
            }
            {
              messages.length > 0 &&
              messages.map((message, index) => (
                <div className={ `chatbox-message w-fit mx-2 text-left flex items-top my-1`} key={index}> 
                  <div className="inline text-2xl h-fit"> {message.role === "system"? <RobotOutlined /> : <UserOutlined/>} </div>
                  <div className="inline ml-2 border rounded p-2"> { message.content } </div>
                </div>
              ))
            }
          </div>
        </div>
        <div className="lower-section basis-[30%] shrink-0 flex flex-col">
          <div className={`text-left mx-2 ${usePrefix? "":"line-through"}`}>Given the selected documents, <Checkbox checked={usePrefix} onChange={(e) => setUsePrefix(e.target.checked)}></Checkbox></div>
          <div className="input-container grow shrink-0 border-[1px] border-solid rounded overflow-y-auto mx-2 p-2 outline-none">
            <div className="
              text-region 
              break-all
              h-full 
              outline-none
              text-left"
              ref={inputBox}
              contentEditable={true}
              placeholder="input search text" 
              // onInput={onInput}
              // onChange={(e) => setQuery(e.target.value)}
              onKeyUp={keyPressed} 
              onKeyDown={(e) => { if(e.code === "Enter") e.preventDefault(); }}
              />
            </div>
            <div className="controller-container grow shrink-0 m-2 flex flex-col">
              <div className="query-doc-list grow flex flex-col content-between justify-between">
                <div className="text-left grow flex flex-col">
                  <div className="font-bold"> Selected Documents: </div>
                  <div className="grow border rounded p-1"> 
                    <ul className='list-disc list-inside'>
                      {queryDocs.map(doc => <li className="mr-2 inline" key={doc}> #{doc} </li>)}
                    </ul>
                  </div>
                </div>
              </div>
              <Radio.Group options={queryOptions} 
                className="my-2 w-fit"
                optionType='button'
                buttonStyle='solid'
                onChange={({target: {value}}) => setUseSummary(value)} value={useSummary} />
            </div>

        </div>
      </div>
    </>
  )
}
export default ChatBox
