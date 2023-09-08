import { useState, useEffect, useMemo, useRef, MutableRefObject } from 'react'
import DocCard from '../DocCard/DocCard'
import type { tDocument } from '../../types/Doc'
type DocListProps = {
  docs: Array<tDocument>
  cluster_label: string
  theme: string
  highlightDocs: Array<any> | undefined
  onQueryDocChanged: (doc_ids: Array<string>) => void
}
function DocList({docs, cluster_label, theme, highlightDocs, onQueryDocChanged}: DocListProps) {
  const setOpacity = (hex, alpha) => `${hex}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
  const themeColor = useMemo(() => setOpacity(theme, 0.5), [theme])
  const highlightDocIds = useMemo(() => highlightDocs?.map(doc => doc.id), [highlightDocs])
  const highlightedDocs = useMemo(() => {
    // add highlight flag
    docs.forEach(doc => {
      if(highlightDocIds === undefined) {
        doc.highlight = true;
        return
      }
      if(highlightDocIds.length === 0) {
        doc.highlight = false;
        return
      }
      if(highlightDocIds.includes(doc.id)) {
        doc.highlight = true;
      }
    })
    // sort by relevance
    if(highlightDocs && highlightDocs.length > 0) {
      docs.sort((a, b) => b.relevance! - a.relevance!)
    }
    return docs
  }, [docs, highlightDocs])

  const clickedDocs: MutableRefObject<Array<string>> = useRef([])
  const handleCardClicked = (doc_id: string, add: boolean) => {
    if(add) {
      clickedDocs.current.push(doc_id)
    } else {
      clickedDocs.current = clickedDocs.current.filter(id => id !== doc_id)
    }
    // somehow deep copy is needed here
    onQueryDocChanged(JSON.parse(JSON.stringify(clickedDocs.current)))
  }
  return (
    <>
      <div className="doc-list-container px-2">
        <div className='doc-list-header px-2 flex rounded items-center w-full justify-center' style={{background: themeColor}}>
          {/* <svg className="inline" width='20' height='20'><rect width='20' height='20' fill={themeColor}></rect></svg> */}
          <p className="cluster-label font-serif text-2xl w-fit" >{ cluster_label }</p>
        </div>
        <div className="doc-list-content">
          {
            highlightedDocs.map((doc, index) => ( <DocCard doc={doc} index={index} theme={theme} key={doc.id} handleCardClicked={handleCardClicked}></DocCard> ))
          }
        </div>
      </div>
    </>
  )
}

export default DocList
