import { useState, useMemo, useEffect } from 'react'
// import EventHgraph from './components/EventHGraph'
import Filters from './components/Filters'
import HierarchyInspector from './components/HierarchyInspector/HierarchyInspector'
import { server_address } from './shared'
import type { t_EventHGraph } from './types'
import './App.css'
import ClusterOverview from './components/ClusterOverview/ClusterOverview'
import LevelInput from './components/LevelInput/LevelInput'

function App() {
  const [event_hgraph, setEventHGraph] = useState<t_EventHGraph>()
  const [eventHGraphLoaded, setEventHGraphLoaded] = useState(false)
  const [communities, setCommunities] = useState<any[]>()
  const [hierarchy, setHierarchy] = useState<any[]>()
  const [contents, setContents] = useState<any[]>()
  const [topic, setTopic] = useState<any>()
  const [level, setLevel] = useState<any>(5)
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

  useEffect(() => {
    fetchPartition()
  }, [level])

  


  async function fetch_hierarchy() {
    console.log("fetching hierarchy")
    fetch(`${server_address}/data/hierarchy`)
      .then(res => res.json())
      .then(hierarchy => {
        console.log({hierarchy})
        setHierarchy(hierarchy)
      })
  }


  // async function fetch_communities() {
  //   console.log("fetching communities")
  //   fetch(`${server_address}/data/communities`)
  //     .then(res => res.json())
  //     .then(communities => {
  //       console.log({communities})
  //       setCommunities(communities)
  //     })
  // }

  // async function fetch_event_hgraph(filters) {
  //   console.log("fetching event hgraph", filters)
  //   if(filters == undefined) filters = {}
  //   fetch(`${server_address}/data/event_hgraph`, {
  //     method: "POST",
  //     headers: {
  //         "Accept": "application/json",
  //         "Content-Type": "application/json"
  //     },
  //     body: JSON.stringify(filters)
  //   })
  //     .then(res => res.json())
  //     .then(event_hgraph => {
  //       console.log({event_hgraph})
  //       setEventHGraph(event_hgraph)
  //       setEventHGraphLoaded(true)
  //       setEnabledCommunities(event_hgraph.communities)
  //     })
  // }

  async function fetchPartition() {
    console.log("fetching partition", level)
    fetch(`${server_address}/data/partition`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify(level)
    })
      .then(res => res.json())
      .then((partition: t_EventHGraph) => {
        console.log({partition})
        setEventHGraph(partition)
        setEventHGraphLoaded(true)
        // setEnabledCommunities(event_hgraph.communities)
      })
  }


  async function handleHierarchyChecked(checkedHierarchy) {
    fetch(`${server_address}/data/event_hgraph`, {
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
      let contents: any[] = []
      selected_communities_hgraph.nodes.forEach(node => {
        if(node.type === 'entity') return
        const community_label = selected_communities_hgraph.communities[node.id]
        if(contents[community_label] == undefined) contents[community_label] = []
        contents[community_label].push({
            trigger: node['trigger'],
            arguments: node['argument_titles'].join(", "),
            summary: node['summary']
        })
      })
      console.log({contents})
      setContents(contents)
    })
  }

  async function fetchTopic(hyperedge_ids) {
    console.log("fetching topic", hyperedge_ids)
    if(hyperedge_ids.length === 0) {
      setTopic("No article selected")
      return
    }
    fetch(`${server_address}/topic`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify(hyperedge_ids)
    })
      .then(res => res.json())
      .then(topic => {
        console.log({topic})
        setTopic(topic)
        // setEnabledCommunities(event_hgraph.communities)
      })
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
          <div>
            <button className={"test"} onClick={fetchPartition}> Show Level {level}</button>
            <LevelInput inputValue={level} onChange={setLevel} minValue={0} maxValue={7} />
            <HierarchyInspector hierarchies={hierarchy} handleChecked={handleHierarchyChecked} ></HierarchyInspector>
            <div className={"topic-viewer"}> {topic} </div>
          </div>
        }

      </div>
      <div className='right-panel'>
        {/* {
        } */}
        {
          eventHGraphLoaded && 
          // <EventHgraph svgId={'event-network'} network_data={event_hgraph} total_communities={event_hgraph?.communities.length || 1}></EventHgraph>
          <ClusterOverview svgId={"cluster-svg"} graph={event_hgraph} hierarchies={hierarchy} onNodesSelected={fetchTopic} />
        }
        <div className={'description-panel'}>
          {
            contents &&
            Object.keys(contents).map(comm_label => {
              return (
                <div className='cluster-content-container' key={comm_label}>
                  <p> comm size: {contents[comm_label].length}</p>
                  <div className='cluster-node-list-container'>
                    {
                    contents[comm_label].map(node => {
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
    </div>
  )
}

export default App
