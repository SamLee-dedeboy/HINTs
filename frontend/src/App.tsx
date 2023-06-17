import { useState, useMemo, useEffect } from 'react'
import EventHgraph from './components/EventHGraph'
import Filters from './components/Filters'
import { server_address } from './shared'
import type {EventHGraph} from './types'
import './App.css'

function App() {
  const [event_hgraph, setEventHGraph] = useState<EventHGraph>()
  const [eventHGraphLoaded, setEventHGraphLoaded] = useState(false)
  const [communities, setCommunities] = useState<any[]>()
  const [enabled_communities, setEnabledCommunities] = useState<any[]>()
  const [filters, setFilters] = useState({
      community_size: 5,
      selected_communities: "all"
  })

  useEffect(() => {
      fetch_communities()
      fetch_event_hgraph(filters)
  }, [])
  // init 
  // useEffect(() => {
  //   console.log({filters})
  //   fetch_event_hgraph(filters)
  // }, [filters]);

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

  return (
    <div className="App">
      <div className='left-panel'>
        {/* {
          enabled_communities && communities && 
          <Filters communities={communities} enabled_communities={enabled_communities} onChange={fetch_event_hgraph} ></Filters>
        } */}

      </div>
      <div className='right-panel'>
        {
          eventHGraphLoaded && 
          <EventHgraph svgId={'event-network'} network_data={event_hgraph} total_communities={event_hgraph?.communities.length || 1}></EventHgraph>
        }
      </div>
    </div>
  )
}

export default App
