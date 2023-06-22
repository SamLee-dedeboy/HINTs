import { useState, useMemo, useEffect } from 'react'
import EventHgraph from './components/EventHGraph'
import Filters from './components/Filters'
import HierarchyInspector from './components/HierarchyInspector/HierarchyInspector'
import { server_address } from './shared'
import type {EventHGraph} from './types'
import './App.css'

function App() {
  const [event_hgraph, setEventHGraph] = useState<EventHGraph>()
  const [eventHGraphLoaded, setEventHGraphLoaded] = useState(false)
  const [communities, setCommunities] = useState<any[]>()
  const [hierarchy, setHierarchy] = useState<any[]>()
  const [contents, setContents] = useState<any[]>()
  const [enabled_communities, setEnabledCommunities] = useState<any[]>()
  const [filters, setFilters] = useState({
      community_size: 5,
      selected_communities: "all"
  })

  useEffect(() => {
      // fetch_communities()
      fetch_hierarchy()
      // fetch_event_hgraph(filters)
  }, [])
  // init 
  // useEffect(() => {
  //   console.log({filters})
  //   fetch_event_hgraph(filters)
  // }, [filters]);


  async function fetch_hierarchy() {
    console.log("fetching hierarchy")
    fetch(`${server_address}/data/hierarchy`)
      .then(res => res.json())
      .then(hierarchy => {
        console.log({hierarchy})
        setHierarchy(hierarchy)
      })
  }


  async function fetch_communities() {
    console.log("fetching communities")
    fetch(`${server_address}/data/communities`)
      .then(res => res.json())
      .then(communities => {
        console.log({communities})
        setCommunities(communities)
      })
  }

  async function fetch_event_hgraph(filters) {
    console.log("fetching event hgraph", filters)
    if(filters == undefined) filters = {}
    fetch(`${server_address}/data/event_hgraph`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify(filters)
    })
      .then(res => res.json())
      .then(event_hgraph => {
        console.log({event_hgraph})
        setEventHGraph(event_hgraph)
        setEventHGraphLoaded(true)
        setEnabledCommunities(event_hgraph.communities)
      })
  }

  async function handleHierarchyChecked(checkedHierarchy) {
    fetch(`${server_address}/data/test/event_hgraph`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify(checkedHierarchy)
    })
      .then(res => res.json())
      .then(selected_communities_hgraph => {
        console.log({selected_communities_hgraph})
        setEventHGraph(selected_communities_hgraph)
        setEventHGraphLoaded(true)
        setEnabledCommunities(selected_communities_hgraph.communities)
        // console.log({res})
        // let contents: any[] = []
        // res.forEach(comm => {
        //   const label = comm['community_label']
        //   const nodes = comm['nodes']
        //   contents.push({
        //     label: label,
        //     nodes: nodes.map(node => { 
        //       return {
        //         trigger: node['trigger'],
        //         arguments: node['arguments'],
        //         summary: node['summary']
        //       }
        //     })
        //   })
        // })
        // console.log({contents})
        // setContents(contents)
      })
      // .then(event_hgraph => {
      //   console.log({event_hgraph})
      //   setEventHGraph(event_hgraph)
      //   setEventHGraphLoaded(true)
      // })

  }


  return (
    <div className="App">
      <div className='left-panel'>
        {/* {
          enabled_communities && communities && 
          <Filters communities={communities} enabled_communities={enabled_communities} onChange={fetch_event_hgraph} ></Filters>
        } */}
        {
          hierarchy &&
          <HierarchyInspector hierarchies={hierarchy} handleChecked={handleHierarchyChecked} ></HierarchyInspector>
        }

      </div>
      <div className='right-panel'>
        {
          eventHGraphLoaded && 
          <EventHgraph svgId={'event-network'} network_data={event_hgraph} total_communities={event_hgraph?.communities.length || 1}></EventHgraph>
        }
        {
          contents &&
          contents.map(content => {
            return (
              <div className='cluster-content-container' key={content.label}>
                <p> comm size: {content.nodes.length}</p>
                <div className='cluster-node-list-container'>
                  {
                  content.nodes.map(node => {
                    return (
                      <div className='cluster-node-container' key={node.trigger}>
                        <p> Event: {node.trigger}</p>
                        <p> arguments: {node.arguments}</p>
                        <p> summary: {node.summary}</p>
                      </div>
                    )
                  })
                  }
                </div>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

export default App
