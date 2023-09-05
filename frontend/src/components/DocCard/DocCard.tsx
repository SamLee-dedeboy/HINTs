import { useState, useEffect, useMemo, useRef } from 'react'
import type { tDocument } from '../../types/Doc'
type DocCardProps = {
  doc: tDocument,
  index: number 
  theme: string
}
function DocCard({doc, index, theme}: DocCardProps) {
  const setOpacity = (hex, alpha) => `${hex}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
  const themeColor = useMemo(() => setOpacity(theme, 0.5), [theme])
  const highlight = doc.highlight ? 'opacity-100' : 'opacity-50'


  return (
    <>
      <div className={`doc-card-container flex flex-col px-2 my-2 font-serif ${highlight}`}>
        <div className='doc-card-header flex items-center rounded-t border-x-2 border-t-2 border-solid shadow-lg font-semibold text-lg' style={{borderColor: themeColor}}>
            <div className="doc-card-title px-1 mr-2 " style={{borderColor: themeColor}}> {doc.title} </div>
            {/* { doc.relevance && <div className="doc-card-relevance mr-2"> Relevance: {doc.relevance.toFixed(2) }  </div>}
            <div className="doc-card-index ml-auto mr-2"> #{index} </div> */}
        </div>
        <div className='doc-card-content flex flex-col border-2 rounded-b shadow-lg' style={{borderColor: themeColor}}>
          {/* <span className="w-fit px-1 font-bold italic"> Summary: </span> */}
          <p className="doc-card-content text-left px-1 "> {doc.summary} </p>
        </div>
      </div>
    </>
  )
}

export default DocCard
