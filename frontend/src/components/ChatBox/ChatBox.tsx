import { useState, useEffect, useMemo, useRef } from 'react'


function ChatBox({queryDocs}) {

  return (
    <>
      <div className="chatbox-container">
        <div className="query-doc-list">
          <div>query docs: </div>
          {queryDocs.map(doc => <span className="mr-2" key={doc}> #{doc} </span>)}
        </div>
      </div>
    </>
  )
}

export default ChatBox
