import { useState, useMemo, useEffect } from 'react'
// import EventHgraph from './components/EventHGraph'
import Filters from './components/Filters'
import HierarchyInspector from './components/HierarchyInspector/HierarchyInspector'
import { server_address } from './shared'
import type { t_EventHGraph } from './types'
import './App.css'
import ClusterOverview from './components/ClusterOverview/ClusterOverview'
import ClusterDetail from './components/ClusterDetail/ClusterDetail'
import LevelInput from './components/LevelInput/LevelInput'

function App() {
  const [event_hgraph, setEventHGraph] = useState<t_EventHGraph>()
  const [eventHGraphLoaded, setEventHGraphLoaded] = useState(false)
  const [hierarchy, setHierarchy] = useState<any[]>()
  const [contents, setContents] = useState<any[]>()
  const [topic, setTopic] = useState<any>()
  const [level, setLevel] = useState<any>(5)
  const [cluster_data, setClusterData] = useState<any>()
  const [brushMode, setBrushMode] = useState<boolean>(false)

  // flags
  const [cluster_selected, setClusterSelected] = useState(false)
  const [cluster_data_fetched, setClusterDataFetched] = useState(false)

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

  async function fetchPartition() {
    console.log("fetching hgraph with partition", level)
    fetch(`${server_address}/data/partition`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ level: level, entity_node_num: 5})
    })
      .then(res => res.json())
      .then((hgraph: t_EventHGraph) => {
        console.log({hgraph})
        setEventHGraph(hgraph)
        setEventHGraphLoaded(true)
        // setEnabledCommunities(event_hgraph.communities)
      })
  }

  async function handleHierarchyChecked(checkedHierarchy) {
    return
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

  async function handleClusterClicked(cluster_id) {
    // setClusterSelected(true)
    // setClusterDataFetched(false)
    console.log("fetching for cluster", cluster_id)
    fetch(`${server_address}/data/expand_cluster`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ cluster_label: cluster_id })
    })
      .then(res => res.json())
      .then(expanded_hgraph => {
        console.log({expanded_hgraph})
        setEventHGraph(expanded_hgraph)
        setEventHGraphLoaded(true)
        // setClusterData(cluster_data)
        // setClusterDataFetched(true)
      })
  }

  function toggleBrush() {
    if(brushMode) setBrushMode(false)
    else setBrushMode(true)
  }



  return (
    <div className="App flex w-full h-full">
      <div className='left-panel flex basis-1/2 h-full'>
        {
          !eventHGraphLoaded &&
          <div className="loading-hint"> Loading... </div>
        }
        {
          eventHGraphLoaded && !cluster_selected && 
          // <EventHgraph svgId={'event-network'} network_data={event_hgraph} total_communities={event_hgraph?.communities.length || 1}></EventHgraph>
          <ClusterOverview svgId={"cluster-overview-svg"} graph={event_hgraph!} hierarchies={hierarchy} onNodesSelected={fetchTopic} onClusterClicked={handleClusterClicked} brushMode={brushMode} />
        }
        {
          cluster_selected && !cluster_data_fetched && 
          <div className="loading-hint"> Loading... </div>
        }
        {
          cluster_selected && cluster_data_fetched && 
          <ClusterDetail svgId={"cluster-detail-svg"} cluster_data={cluster_data} onNodesSelected={fetchTopic}/>
        }
      </div>
      <div className='right-panel flex basis-1/2 w-1/12'>
        {
          hierarchy &&
          <div>
            {/* <button className={"test"} onClick={fetchPartition}> Show Level {level}</button> */}
            <button className={"toggle-brush"} onClick={toggleBrush}> Brush {brushMode? "on":"off"}</button>
            <LevelInput inputValue={level} onChange={setLevel} minValue={0} maxValue={7} />
            <HierarchyInspector hierarchies={hierarchy} handleChecked={handleHierarchyChecked} ></HierarchyInspector>
            <div className="topic-viewer w-full"> {topic} </div>
          </div>
        }
        <div className='flex basis-1/2'>
          {
            contents &&
            Object.keys(contents).map(comm_label => {
              return (
                <div className='cluster-content-container w-full h-1/2' key={comm_label}>
                  <p> comm size: {contents[comm_label].length}</p>
                  <div className='cluster-node-list-container flex flex-col overflow-scroll border border-solid border-black h-9/10'>
                    {
                    contents[comm_label].map(node => {
                      return (
                        <div className='cluster-node-container border-b border-solid border-black' key={node.trigger}>
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
