import { useState, useEffect, useMemo, useRef, MutableRefObject } from 'react'
import type { tDocument, tSpan } from '../../types/Doc'
type DocCardProps = {
  doc: tDocument 
  index: number 
  // theme: string
  handleCardClicked: (doc_id: string, clicked: boolean) => void
}
function DocCard({doc, index, handleCardClicked}: DocCardProps) {
  const setOpacity = (hex, alpha) => `${hex}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
  // const themeColor = useMemo(() => setOpacity(theme, 0.5), [theme])
  function getThemeColor(theme) {
    const res = setOpacity(theme, 0.5)
    console.log(theme, res)
    return res
  }
  const highlight = doc?.highlight ? 'opacity-100' : 'opacity-50'
  // const clicked: MutableRefObject<boolean> = useRef(false)
  const [clicked, setClicked] = useState(false)
  const clickedStyle = useMemo(() => clicked ? 'border-solid bg-sky-100 ' : 'border-double', [clicked])  
  const clickable = useMemo(() => doc.title === ""? "pointer-events-none" : "pointer-events-auto", [doc])
  const highlightedSummary: string | undefined = useMemo(() => {
    if(doc?.summary === undefined) return undefined
    if(doc?.entity_spans === undefined) return doc.summary
    // return doc.summary
    return add_highlights(doc.summary, doc.entity_spans)
    // let summary = doc.summary
    // doc.entities.forEach((entity: tMention) => {
    //   const spans = entity.spans
    //   spans.forEach((span: tSpan) => {
    //     const start = span[0]
    //     const end = span[1]
    //     const summary_before = summary.slice(0, start)
    //     const summary_after  = summary.slice(end)
    //     const wrapped_span = `<span class="bg-yellow-200">${summary.slice(start, end)}</span>`
    //     summary = summary_before + wrapped_span + summary_after
    //   })
    // })
    // console.log(summary)
    // return summary
  }, [doc?.summary])

  function add_highlights(raw_text: string, highlights: tSpan[]) {
    if(!highlights || highlights?.length === 0) return raw_text
    let non_highlight_start = 0
    let divided_text: any[] = []
    // values:
    // 0 (normal)
    // 1 (highlight)
    let divided_marks: any[] = []
    highlights.forEach(highlight => {
        const highlight_start = highlight[0]
        const highlight_end = highlight[1]
        // add normal text
        if(non_highlight_start !== highlight_start) {
            divided_text.push(raw_text.substring(non_highlight_start, highlight_start))
            divided_marks.push(0)
        }
        // add highlight
        divided_text.push(raw_text.substring(highlight_start, highlight_end))
        divided_marks.push(1)
        non_highlight_start = highlight_end 
    })
    if(non_highlight_start < raw_text.length) {
        divided_text.push(raw_text.substring(non_highlight_start))
        divided_marks.push(0)
    }
    let res = ""
    divided_text.forEach((sub_text, index) => {
        if(divided_marks[index] === 0)
            res += sub_text
        else
            res += highlight_element(sub_text)
    })
    return res
}
function highlight_element(text) {
  return `<span class="bg-yellow-200">${text}</span>`
}


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
      // style={{borderColor: themeColor}}
      style={{borderColor: getThemeColor(doc.color)}}
      onClick={() => { handleCardClicked(doc.id || "", !clicked); setClicked(!clicked); }}
      >
        {/* <div className='doc-card-header flex items-center font-semibold text-lg' style={{borderColor: themeColor}}> */}
        <div className='doc-card-header flex items-center font-semibold text-lg' >
            <div className="doc-card-title px-1 mr-2 " > {doc?.title || ""} </div>
            {/* { doc.relevance && <div className="doc-card-relevance mr-2"> Relevance: {doc.relevance.toFixed(2) }  </div>}
            <div className="doc-card-index ml-auto mr-2"> #{index} </div> */}
        </div>
        <div className='doc-card-content flex flex-col' >
          {/* <span className="w-fit px-1 font-bold italic"> Summary: </span> */}
          <p className="doc-card-content text-left px-1" dangerouslySetInnerHTML={{__html: highlightedSummary || ""}}/>
          <p className="text-left px-1 text-sm"> 
            <span className="text-left px-1"> Article ID: #{doc.id} </span>
            <span className="text-left px-1"> Topic: {doc.cluster_label} </span>
            <span className="text-left px-1"> Relevance: {doc.relevance?.toFixed(2)} </span>
          </p>
        </div>
      </div>
    </>
  )
}

export default DocCard