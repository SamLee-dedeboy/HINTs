import { useState, useMemo, useEffect } from 'react'
import EventNetwork from './components/EventNetwork'

import './App.css'
const server_address = "http://localhost:5050"

function App() {
  const [event_network, setEventNetwork] = useState({})
  const [eventNetworkLoaded, setEventNetworkLoaded] = useState(false)
  // init 
  useEffect(() => {
    fetch_event_network()
  }, []);

  async function fetch_event_network() {
    console.log("fetching event network")
    fetch(`${server_address}/data/event_network`)
      .then(res => res.json())
      .then(event_network => {
        console.log({event_network})
        setEventNetwork(event_network)
        setEventNetworkLoaded(true)
      })
  }

  return (
    <div className="App">
      <div className='left-panel'>

      </div>
      <div className='right-panel'>
        {
          eventNetworkLoaded && 
          <EventNetwork svgId={'event-network'} network_data={event_network} ></EventNetwork>
        }
      </div>
    </div>
  )
}

export default App
