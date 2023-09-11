import { useState, useEffect, useMemo, useRef, MutableRefObject } from 'react'
import type { tDocument } from '../../types/Doc'
type DocCardProps = {
  doc: tDocument 
  index: number 
  theme: string
  handleCardClicked: (doc_id: string, clicked: boolean) => void
}
function DocCard({doc, index, theme, handleCardClicked}: DocCardProps) {
  const setOpacity = (hex, alpha) => `${hex}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
  const themeColor = useMemo(() => setOpacity(theme, 0.5), [theme])
  const highlight = doc?.highlight ? 'opacity-100' : 'opacity-50'
  // const clicked: MutableRefObject<boolean> = useRef(false)
  const [clicked, setClicked] = useState(false)
  const clickedStyle = useMemo(() => clicked ? 'border-solid bg-sky-100 ' : 'border-double', [clicked])  
  const clickable = useMemo(() => doc.title === ""? "pointer-events-none" : "pointer-events-auto", [doc])
  return (
    <>
      <div 
      className={`doc-card-container 
      flex flex-col 
      px-2 my-2 
      min-h-[200px]
      font-serif 
      border-4 rounded 
      ${clickedStyle}
      ${highlight} 
      ${clickable}
      cursor-pointer 
      hover:border-solid 
      hover:shadow-2xl 
      `} 
      style={{borderColor: themeColor}}
      onClick={() => { handleCardClicked(doc.id || "", !clicked); setClicked(!clicked); }}
      >
        <div className='doc-card-header flex items-center font-semibold text-lg' style={{borderColor: themeColor}}>
            <div className="doc-card-title px-1 mr-2 " style={{borderColor: themeColor}}> {doc?.title || ""} </div>
            {/* { doc.relevance && <div className="doc-card-relevance mr-2"> Relevance: {doc.relevance.toFixed(2) }  </div>}
            <div className="doc-card-index ml-auto mr-2"> #{index} </div> */}
        </div>
        <div className='doc-card-content flex flex-col' style={{borderColor: themeColor}}>
          {/* <span className="w-fit px-1 font-bold italic"> Summary: </span> */}
          <p className="doc-card-content text-left px-1 "> {doc?.summary || ""} </p>
          <p className="text-left px-1"> #{doc.id} </p>
        </div>
      </div>
    </>
  )
}

export default DocCard