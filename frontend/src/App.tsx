import { useState, useMemo, useEffect } from 'react'
// import EventHgraph from './components/EventHGraph'
import HierarchyInspector from './components/HierarchyInspector/HierarchyInspector'
import { server_address } from './shared'
import type { t_EventHGraph } from './types'
import './App.css'
import ClusterOverview from './components/ClusterOverview/ClusterOverview'
import Storyline from './components/Storyline/Storyline'
import ClusterDetail from './components/ClusterDetail/ClusterDetail'
import { Input, InputNumber, Switch } from 'antd';
import storyline_tmp from "./tmp_storylinedata.json"
import HilbertTest from './components/HibertTest/HilbertTest'


const Search = Input.Search;

function App() {
  const user_id = 0
  const [article_hgraph, setArticleHGraph] = useState<t_EventHGraph>()
  const [articleHGraphLoaded, setArticleHGraphLoaded] = useState(false)
  const [entity_hgraph, setEntityHGraph] = useState<t_EventHGraph>()
  const [entityHGraphLoaded, setEntityHGraphLoaded] = useState(false)
  const [hierarchy, setHierarchy] = useState<any[]>()
  // const [contents, setContents] = useState<any[]>()

  const [topic, setTopic] = useState<any>()
  const [level, setLevel] = useState<any>(5)
  const [cluster_data, setClusterData] = useState<any>()
  const [storyline_data, setStorylineData] = useState<any>()
  const [brushMode, setBrushMode] = useState<boolean>(false)

  // searching related
  const [searchMode, setSearchMode] = useState<boolean>(false)
  const [query, setQuery] = useState<string>("")
  const [searchLoading, setSearchLoading] = useState<boolean>(false)
  const [docsRanked, setDocsRanked] = useState<any[]>([]) 
  // const [relevantDocs, setRelevantDocs] = useState<any[]>([])
  const [relevanceThreshold, setRelevanceThreshold] = useState<number>(0.80)
  const relevantDocs = useMemo(() => docsRanked.filter(doc => doc.relevance.toFixed(2) >= relevanceThreshold.toFixed(2)), [docsRanked, relevanceThreshold])
  const relevantDocIds = useMemo(() => relevantDocs.map(doc => doc.doc_id), [relevantDocs])

  // flags
  const [cluster_selected, setClusterSelected] = useState(false)
  const [cluster_data_fetched, setClusterDataFetched] = useState(false)
  const [storyline_fetched, setStorylineFetched] = useState(false)
  const [graph_type, setGraphType] = useState<String>("Article")

  const [hilbert, setHilbert] = useState<any>() 
  const [hilbert_fetched, setHilbertFetched] = useState(false)

  useEffect(() => {
      fetch_hierarchy()
      fetchPartitionArticle()
      fetchPHilbert()
  }, [])

  async function fetch_hierarchy() {
    console.log("fetching hierarchy")
    fetch(`${server_address}/static/hierarchy`)
      .then(res => res.json())
      .then(hierarchy => {
        console.log({hierarchy})
        setHierarchy(hierarchy)
      })
  }

  async function fetchPartitionArticle() {
    console.log("fetching article with partition", level)
    fetch(`${server_address}/user/article/partition/${user_id}`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ article_level: level, entity_level: 3, entity_node_num: 5})
    })
      .then(res => res.json())
      .then((hgraph: t_EventHGraph) => {
        console.log({hgraph})
        setArticleHGraph(hgraph)
        setArticleHGraphLoaded(true)
        // setEnabledCommunities(event_hgraph.communities)
      })
  }

  async function fetchPartitionEntity() {
    console.log("fetching entity hgraph with partition", level)
    fetch(`${server_address}/user/entity/partition/${user_id}`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      // body: JSON.stringify({ level: level, entity_node_num: 5})
      body: JSON.stringify({ level: 3 })
    })
      .then(res => res.json())
      .then((hgraph: t_EventHGraph) => {
        console.log({hgraph})
        setEntityHGraph(hgraph)
        setEntityHGraphLoaded(true)
        // setEnabledCommunities(event_hgraph.communities)
      })
  }


  async function fetchTopic(hyperedge_ids) {
    console.log("fetching topic", hyperedge_ids)
    if(hyperedge_ids.length === 0) {
      setTopic("No article selected")
      return
    }
    fetch(`${server_address}/static/topic`, {
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

  async function handleClusterClicked(cluster_id, clusters) {
    // setClusterSelected(true)
    // setClusterDataFetched(false)
    console.log("fetching for cluster", cluster_id)
    fetch(`${server_address}/user/expand_cluster/${user_id}`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ cluster_label: cluster_id, clusters: clusters })
    })
      .then(res => res.json())
      .then(expanded_hgraph => {
        console.log({expanded_hgraph})
        setArticleHGraph(expanded_hgraph)
        setArticleHGraphLoaded(true)
        // setClusterData(cluster_data)
        // setClusterDataFetched(true)
      })
  }

  async function search() {
    if(query === "") return
    setSearchLoading(true)
    setSearchMode(true)
    const base = article_hgraph?.hyperedge_nodes.map(node => node.doc_id)
    console.log("searching: ", query, base)
    fetch(`${server_address}/static/search/`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, base })
    })
      .then(res => res.json())
      .then(search_response => {
        console.log({search_response})
        const docs_ranked = search_response.docs
        const suggested_threshold = search_response.suggested_threshold
        setSearchLoading(false)
        setDocsRanked(docs_ranked)
        setRelevanceThreshold(Number(suggested_threshold.toFixed(2)))
        // updateRelevantDocIds(docs_ranked, relevanceThreshold)
        // setEventHGraph(expanded_hgraph)
        // setEventHGraphLoaded(true)
        // setClusterData(cluster_data)
        // setClusterDataFetched(true)
      })
  }

  async function applyFilter() {
    if(article_hgraph === undefined) return
    const hyperedge_ids = article_hgraph.hyperedge_nodes.filter(hyperedge => relevantDocIds.includes(hyperedge.doc_id)).map(hyperedge => hyperedge.id)
    const clusters = article_hgraph.clusters
    console.log("filtering: ", hyperedge_ids, clusters)
    fetch(`${server_address}/user/filter/${user_id}`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ hyperedge_ids, clusters })
    })
      .then(res => res.json())
      .then(filtered_hgraph => {
        console.log({filtered_hgraph})
        setArticleHGraph(filtered_hgraph)
        // setEventHGraphLoaded(true)
      })
  }
  async function fetchStoryline() {
    if(article_hgraph === undefined) {
      return
      console.log({storyline_tmp})
      setStorylineData(storyline_tmp)
      setStorylineFetched(true)
      return
    } 
    const clusters = article_hgraph.clusters
    fetch(`${server_address}/user/storyline/${user_id}`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ clusters })
    })
      .then(res => res.json())
      .then(storyline => {
        console.log({storyline})
        setStorylineData(storyline)
        setStorylineFetched(true)
      })
 
  }

  async function fetchPHilbert() {
    const width = 120
    const height = 12
    fetch(`${server_address}/static/p_hilbert/`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ width, height })
    })
      .then(res => res.json())
      .then(p_hilbert => {
        console.log({p_hilbert})
        setHilbert({
          points: p_hilbert,
          width: width,
          height: height
        })
        setHilbertFetched(true)
      })
  }
  
  function toggleBrush() {
    if(brushMode) setBrushMode(false)
    else setBrushMode(true)
  }
  function toggleSearchMode() {
    if(searchMode) setSearchMode(false)
    else setSearchMode(true)
  }
  function toggleGraphType() {
    if(graph_type == "Article") setGraphType("Entity")
    else setGraphType("Article")
  }

  return (
    <div className="App flex w-full h-full">
      <div className='left-panel flex basis-1/2 h-full'>
        {
          !storyline_fetched && 
          <div className="article-hgraph-container flex flex-1 h-full">
          {
            !articleHGraphLoaded &&
            <div className="loading-hint"> Loading... </div>
          }
          {
            articleHGraphLoaded && !cluster_selected && hilbert_fetched && 
            // <EventHgraph svgId={'event-network'} network_data={event_hgraph} total_communities={event_hgraph?.communities.length || 1}></EventHgraph>
            <ClusterOverview svgId={"article-cluster-overview-svg"} 
              graph={article_hgraph!} 
              peripheral={hilbert}
              highlightNodeIds={relevantDocIds} 
              onNodesSelected={fetchTopic} 
              onClusterClicked={handleClusterClicked} 
              searchMode={searchMode}
              brushMode={brushMode} />
          }
          </div>
        }
        {
          storyline_fetched && 
          <Storyline svgId={"storyline-svg"} data={storyline_data} article_num_threshold={10} />
        }
        {/* {
          hilbert_fetched &&
          <HilbertTest svgId={"hilbert-svg"} points={hilbert.points} width={hilbert.width} height={hilbert.height} />
        } */}
        {/* {
          graph_type == "Entity" &&
          <div className="entity-hgraph-container flex flex-1 h-full">
          {
            !entityHGraphLoaded &&
            <div className="loading-hint"> Loading... </div>
          }
          {
            entityHGraphLoaded && !cluster_selected && 
            <ClusterOverview svgId={"entity-cluster-overview-svg"} 
              graph={entity_hgraph!} 
              highlightNodeIds={relevantDocIds} 
              onNodesSelected={fetchTopic} 
              onClusterClicked={handleClusterClicked} 
              searchMode={searchMode}
              brushMode={brushMode} />
          }
          </div>
        } */}
        {/* {
          cluster_selected && !cluster_data_fetched && 
          <div className="loading-hint"> Loading... </div>
        }
        {
          cluster_selected && cluster_data_fetched && 
          <ClusterDetail svgId={"cluster-detail-svg"} cluster_data={cluster_data} onNodesSelected={fetchTopic}/>
        } */}
      </div>
      <div className='right-panel flex basis-1/2 w-1/12'>
        {
          <div className='utility-container flex flex-col w-fit h-fit space-y-4 pl-1 border rounded '>
            {/* <button className={"test"} onClick={fetchPartition}> Show Level {level}</button> */}
            <div className='toggler-container flex flex-col py-3'>
              <div className='switch-container flex justify-center mr-2 w-fit '>
                <span className='switch-label mr-2'>Brush</span>
                <Switch className={"toggle-brush bg-black/25"} onChange={toggleBrush} checkedChildren="On" unCheckedChildren="Off"></Switch>
              </div>
              <div className='switch-container flex justify-center mr-2 w-fit'>
                <span className='switch-label mr-2'>Search</span>
                <Switch className={"toggle-searchMode bg-black/25"} onChange={toggleSearchMode} checkedChildren="On" unCheckedChildren="Off"> </Switch>
              </div>
              {/* <div className='switch-container flex justify-center mr-2 w-fit'>
                <span className='switch-label mr-2'>Graph</span>
                <Switch className={"toggle-graph_type bg-black/25"} onChange={toggleGraphType} checkedChildren="Entity" unCheckedChildren="Article"> </Switch>
              </div> */}
            </div>
            <div className='search-container w-fit'>
              <Search className={"search-bar w-fit"}
                placeholder="input search text" 
                // enterButton="Search" 
                size="large" 
                onChange={(e) => setQuery(e.target.value)}
                onSearch={search} 
                loading={searchLoading} />
              <button className={"apply-filter btn ml-2"} onClick={applyFilter}>Filter Search</button>
            </div>
            {/* <div className='search-container w-fit'>
              <Search className={"search-bar w-fit"}
                placeholder="input search text" 
                // enterButton="Search" 
                size="large" 
                onChange={(e) => setQuery(e.target.value)}
                onSearch={search} 
                loading={searchLoading} />
              <button className={"apply-filter btn ml-2"} onClick={applyFilter}>Filter Search</button>
            </div> */}
            <div className='relevance-threshold-container w-fit'>
              <span className='relevance-label'> Relevance >= </span>
              <InputNumber className="relevance-threshold" min={0} max={1} step={0.01} defaultValue={0.8} value={relevanceThreshold} onChange={(value) => setRelevanceThreshold(Number(value))} />
            </div>
            <button className={"transform-storyline btn ml-2"} onClick={fetchStoryline}>Storyline</button>

            {/* <HierarchyInspector hierarchies={hierarchy} handleChecked={handleHierarchyChecked} ></HierarchyInspector> */}
            <div className="topic-viewer w-full"> {topic} </div>
          </div>
        }
        {
          <div className="doc-list-container flex flex-col flex-1 overflow-y-auto">
            {
            relevantDocs &&
            relevantDocs.map((doc_data, index) => {
              return (
                <div className="doc-card flex flex-col  border-black/50 px-2">
                  <div className="doc-card-header flex border-x items-center border-y border-black/50">
                    <div className="doc-card-title px-1 mr-2 border-r border-black/50"> Doc Id: {doc_data.doc_id} </div>
                    <div className="doc-card-relevance mr-2"> Relevance: {doc_data.relevance.toFixed(2)} </div>
                    <div className="doc-card-index ml-auto mr-2"> #{index} </div>
                  </div>
                  <span className="w-fit px-1 font-bold italic border-l border-black/50"> Summary: </span>
                  <p className="doc-card-content text-left text-sm px-1 border-l border-black/50"> {doc_data.summary} </p>
                </div>
              )
            })
          }
          </div>
        }
        {/* <div className='flex flex-col overflow-y-auto'>
          {
          } */}
        </div>

      </div>
  )
}

export default App
