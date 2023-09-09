import { useState, useEffect, useMemo, useRef } from 'react'

import { Input, Radio } from 'antd';
function ChatBox({queryDocs}) {

  const [query, setQuery] = useState<string>("")
  const [searchLoading, setSearchLoading] = useState<boolean>(false)
  const [useSummary, setUseSummary] = useState<boolean>(true)
  const queryOptions = [
    { label: 'Use Summary', value: true }, 
    { label: 'Use Full Content', value: false }
  ]

  function search(){

  }
  // const onInput = (input) => {
  //   textarea.value.innerHTML
  // };
  return (
    <>
      <div className="chatbox-container flex flex-col h-full">
        <div className="chatbox-content basis-[70%]">

        </div>
        <div className="text-left mx-2">Given the selected documents, </div>
        <div className="input-container flex-1 border-[1px] border-solid rounded overflow-y-auto mx-2 p-2 outline-none">
          <div className="
            text-region 
            break-all
            h-full 
            outline-none
            text-left"
            contentEditable={true}
            placeholder="input search text" 
            // onInput={onInput}
            // onChange={(e) => setQuery(e.target.value)}
            // onPressEnter={search} 
            />
          </div>
          <div className="controller-container m-2 flex flex-col">
            <div className="query-doc-list basis-[10%] flex flex-col content-between justify-between">
              <div className="text-left ">
                <div className="font-bold"> Selected Documents: </div>
                <ul className='list-disc list-inside border rounded p-1'>
                  {queryDocs.map(doc => <li className="mr-2 inline" key={doc}> #{doc} </li>)}
                </ul>
              </div>
            </div>
            <Radio.Group options={queryOptions} 
              className="my-2 w-fit"
              optionType='button'
              buttonStyle='solid'
              onChange={({target: {value}}) => setUseSummary(value)} value={useSummary} />
          </div>
        </div>
    </>
  )
}

export default ChatBox
