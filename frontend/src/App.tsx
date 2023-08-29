import { useState, useMemo, useEffect } from 'react'
import { server_address } from './shared'
import type { t_EventHGraph, d_ArticleGraph, d_EntityGraph, tooltipContent } from './types'
import './App.css'
import ClusterOverview from './components/ClusterOverview/ClusterOverview'
import Tooltip from './components/Tooltip/Tooltip'
import { Input, InputNumber, Switch, Slider } from 'antd';
import * as d3 from "d3"
import tmpDocs from './tmp_search.json'


const Search = Input.Search;

function App() {
  const user_id = 0
  const [article_graph, setArticleGraph] = useState<d_ArticleGraph>()
  const [entity_graph, setEntityGraph] = useState<d_EntityGraph>()
  const [HGraphLoaded, setHGraphLoaded] = useState(false)
  // const [hierarchy, setHierarchy] = useState<any>()
  const [gosper, setGosper] = useState<any>()

  const [topic, setTopic] = useState<any>()
  const [level, setLevel] = useState<any>(5)
  const [brushMode, setBrushMode] = useState<boolean>(false)
  // let selectionMode = false

  // searching related
  const [searchMode, setSearchMode] = useState<boolean>(false)
  const [query, setQuery] = useState<string>("")
  const [searchLoading, setSearchLoading] = useState<boolean>(false)
  const [docsRanked, setDocsRanked] = useState<any[]>([]) 
  // const [relevantDocs, setRelevantDocs] = useState<any[]>([])
  const [relevanceThreshold, setRelevanceThreshold] = useState<number>(0.80)
  const relevantDocs = useMemo(() => docsRanked.filter(doc => doc.relevance.toFixed(2) >= relevanceThreshold.toFixed(2)), [docsRanked, relevanceThreshold])
  const relevantDocIds = useMemo(() => relevantDocs.map(doc => doc.id), [relevantDocs])

  const [hilbert, setHilbert] = useState<any>() 
  const [selectedClusters, setSelectedClusters] = useState<string[]>([])
  const [mergedClusters, setMergedClusters] = useState<any[]>([])

  // tooltip
  const [tooltipData, setTooltipData] = useState<tooltipContent>()

  useEffect(() => {
    const promises = [fetchPHilbert(), fetchGosper(), fetchPartitionArticle()]
    Promise.all(promises)
      .then(() => {
        console.log("all data loaded")
        setHGraphLoaded(true)
      })
  }, [])


  // colors

  // articles
  const articleClusterColorScale = d3.scaleOrdinal(d3.schemeTableau10)
  const articleSubClusterColorScale = d3.scaleOrdinal(d3.schemeSet3)

  const [previousClusterColorDict, setPreviousClusterColorDict] = useState<any>(undefined)
  const [previousSubClusterColorDict, setPreviousSubClusterColorDict] = useState<any>(undefined)
  const articleClusterColorDict = useMemo(() => {
    let cluster_color_dict = {}
    if(!article_graph) return cluster_color_dict
    Object.keys(article_graph.clusters).forEach(cluster_label => {
      if(previousClusterColorDict && previousClusterColorDict[cluster_label]) {
        cluster_color_dict[cluster_label] = previousClusterColorDict[cluster_label]
      } else if(previousSubClusterColorDict && previousSubClusterColorDict[cluster_label]) {
        cluster_color_dict[cluster_label] = previousSubClusterColorDict[cluster_label]
      } else {
        cluster_color_dict[cluster_label] = articleClusterColorScale(cluster_label)
      }
    })
    mergedClusters.forEach(merged_set => {
      const merged_set_color = previousClusterColorDict[merged_set[0]]
      merged_set.forEach(cluster_label => {
        cluster_color_dict[cluster_label] = merged_set_color
      })
    })
    setPreviousClusterColorDict(cluster_color_dict)
    return cluster_color_dict
  }, [article_graph, mergedClusters])

  const articleSubClusterColorDict = useMemo(() => {
    let sub_cluster_color_dict = {}
    if(!article_graph) return sub_cluster_color_dict
    Object.keys(article_graph.clusters).forEach(cluster_label => {
      // retain cluster color
      const cluster_color = d3.hsl(articleClusterColorDict[cluster_label])
      const sub_clusters = article_graph.sub_clusters[cluster_label]
      // prepare scales 
      const sub_cluster_renumber_dict = {}
      sub_clusters.forEach((sub_cluster, index) => sub_cluster_renumber_dict[sub_cluster] = index)
      const sub_cluster_sScale = d3.scaleLinear()
        .domain([0,  sub_clusters.length - 1])
        .range([0.5, 1]);
      const sub_cluster_lScale = d3.scaleLinear()
        .domain([0,  sub_clusters.length - 1])
        .range([0.4, 0.8]);
      // use cluster color as base to generate sub cluster colors
      sub_clusters.forEach((sub_cluster_label, i) => {
        // if previous color exists, use it
        if(previousSubClusterColorDict && previousSubClusterColorDict[sub_cluster_label]) {
          sub_cluster_color_dict[sub_cluster_label] = previousSubClusterColorDict[sub_cluster_label]
          return
        }
        // sub_cluster_color_dict[sub_cluster_label] = d3.hsl(cluster_color.h, sub_cluster_colorScale(i), 0.5)
        const offset_color = articleSubClusterColorScale(sub_cluster_label)
        const offset_hsl = d3.hsl(offset_color)
        offset_hsl.h = cluster_color.h + offset_hsl.h
        offset_hsl.s = sub_cluster_sScale(i)
        offset_hsl.l = sub_cluster_lScale(i)
        // offset_hsl.s = cluster_color.s + offset_hsl.s
        // offset_hsl.l = sub_cluster_lightnessScale(i)
        // const sub_cluster_color = d3.hsl(cluster_color.h + offset_hsl.h, offset_hsl.s, offset_hsl.l)
        sub_cluster_color_dict[sub_cluster_label] = offset_hsl
      })
    })
    setPreviousSubClusterColorDict(sub_cluster_color_dict)
    return sub_cluster_color_dict
  }, [article_graph])



  // entities
  const entityClusterColorScale = d3.scaleOrdinal(d3.schemeSet2)
  const entitySubClusterColorScale = d3.scaleOrdinal(d3.schemeSet3)
  const [previousEntityClusterColorDict, setPreviousEntityClusterColorDict] = useState<any>(undefined)
  const [previousEntitySubClusterColorDict, setPreviousEntitySubClusterColorDict] = useState<any>(undefined)

  const entityClusterColorDict = useMemo(() => {
    let cluster_color_dict = {}
    if(!entity_graph) return cluster_color_dict
    Object.keys(entity_graph.entity_clusters).forEach(cluster_label => {
      cluster_color_dict[cluster_label] = entityClusterColorScale(cluster_label)
      if(previousEntityClusterColorDict && previousEntityClusterColorDict[cluster_label]) {
        cluster_color_dict[cluster_label] = previousEntityClusterColorDict[cluster_label]
      } else if(previousEntitySubClusterColorDict && previousEntitySubClusterColorDict[cluster_label]) {
        cluster_color_dict[cluster_label] = previousEntitySubClusterColorDict[cluster_label]
      } else {
      }
    })
    setPreviousEntityClusterColorDict(cluster_color_dict)
    return cluster_color_dict
  }, [entity_graph])
  
  const entitySubClusterColorDict = useMemo(() => {
    let sub_cluster_color_dict = {}
    if(!entity_graph) return sub_cluster_color_dict
    Object.keys(entity_graph.entity_clusters).forEach(cluster_label => {
      const cluster_color = d3.hsl(entityClusterColorDict[cluster_label])
      const sub_clusters = entity_graph.entity_sub_clusters[cluster_label]
      const sub_cluster_renumber_dict = {}
      sub_clusters.forEach((sub_cluster, index) => sub_cluster_renumber_dict[sub_cluster] = index)
      const sub_cluster_sScale = d3.scaleLinear()
        .domain([0,  sub_clusters.length - 1])
        .range([0.5, 1]);
      const sub_cluster_lScale = d3.scaleLinear()
        .domain([0,  sub_clusters.length - 1])
        .range([0.4, 0.8]);
      
      sub_clusters.forEach((sub_cluster_label, i) => {
        // sub_cluster_color_dict[sub_cluster_label] = d3.hsl(cluster_color.h, sub_cluster_colorScale(i), 0.5)
        const offset_color = entitySubClusterColorScale(sub_cluster_label)
        const offset_hsl = d3.hsl(offset_color)
        offset_hsl.h = cluster_color.h + offset_hsl.h
        offset_hsl.s = sub_cluster_sScale(i)
        offset_hsl.l = sub_cluster_lScale(i)
        sub_cluster_color_dict[sub_cluster_label] = offset_hsl
      })
    })
    setPreviousEntitySubClusterColorDict(sub_cluster_color_dict)
    return sub_cluster_color_dict
  }, [entity_graph])

  // fetches
  function fetchPartitionArticle() {
    return new Promise((resolve, reject) => {
      console.log("fetching article with partition", level, 3)
      fetch(`${server_address}/user/hgraph/${user_id}`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ article_level: level, entity_level: 5})
      })
        .then(res => res.json())
        .then(async (hgraph: t_EventHGraph) => {
          console.log({hgraph})
          await setArticleGraph(hgraph.article_graph)
          await setEntityGraph(hgraph.entity_graph)
          resolve("success")
        })

    })
  }

  function fetchTopic(article_ids) {
    console.log("fetching topic", article_ids)
    if(article_ids.length === 0) {
      setTopic("No article selected")
      return
    }
    fetch(`${server_address}/static/topic`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify(article_ids)
    })
    .then(res => res.json())
    .then(topic => {
      console.log({topic})
      setTopic(topic)
      // setEnabledCommunities(event_hgraph.communities)
    })
  }

  async function handleArticleClusterClicked(e, cluster_id, clusters) {
    await fetchExpandArticleCluster(cluster_id, clusters)
    return
    if(e.ctrlKey || e.metaKey) {
      if(selectedClusters.includes(cluster_id)) {
        // remove from selected clusters
        const updated_array = selectedClusters.filter(ele => ele !== cluster_id)
        setSelectedClusters(updated_array)
      } else {
        // add to selected clusters
        setSelectedClusters(prev => [...prev, cluster_id])
      }
    } else {
    }
  }

  async function handleEntityClusterClicked(e, cluster_id, clusters) {
    return new Promise((resolve, reject) => {
      console.log("fetching for entity cluster", cluster_id)
      fetch(`${server_address}/user/expand_cluster/entity/${user_id}`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ cluster_label: cluster_id, clusters: clusters })
      })
        .then(res => res.json())
        .then(expanded_graph => {
          console.log({expanded_graph})
          setEntityGraph(expanded_graph)
          resolve("success")
          // setClusterData(cluster_data)
          // setClusterDataFetched(true)
        })
    })
  }

  async function fetchExpandArticleCluster(cluster_id, clusters) {
    return new Promise((resolve, reject) => {
      // setClusterSelected(true)
      // setClusterDataFetched(false)
      console.log("fetching for cluster", cluster_id, clusters)
      fetch(`${server_address}/user/expand_cluster/article/${user_id}`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ cluster_label: cluster_id, clusters: clusters })
      })
        .then(res => res.json())
        .then(expanded_graph => {
          console.log({expanded_graph})
          setArticleGraph(expanded_graph)
          resolve("success")
          // setClusterData(cluster_data)
          // setClusterDataFetched(true)
        })
    })
  }

  async function search() {
    if(query === "") {
      setSearchMode(true)
      console.log(tmpDocs)
      setDocsRanked(tmpDocs)
      setRelevanceThreshold(0.80)
      return
    }
    setSearchLoading(true)
    setSearchMode(true)
    const base = article_graph?.article_nodes.map(node => node.id)
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

  async function applyMerge() {
    if(article_graph === undefined) return
    console.log("merging: ", selectedClusters)
    setMergedClusters(prev => [...prev, selectedClusters])
    setSelectedClusters([])
  }


  function applyFilter() {
    if(article_graph === undefined) return
    if(entity_graph === undefined) return
    if(relevantDocIds.length === 0) return
    return new Promise((resolve, reject) => {
      const article_ids = article_graph.article_nodes.filter(article => relevantDocIds.includes(article.id)).map(article => article.id)
      const clusters = article_graph.clusters
      const entity_clusters = entity_graph.entity_clusters
      console.log("filtering: ", article_ids, clusters)
      fetch(`${server_address}/user/filter/${user_id}`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ article_ids, clusters, entity_clusters })
      })
        .then(res => res.json())
        .then(filtered_hgraph => {
          console.log({filtered_hgraph})
          setArticleGraph(filtered_hgraph.article_graph)
          setEntityGraph(filtered_hgraph.entity_graph)
          // setEventHGraphLoaded(true)
          resolve("success")
        })
    })
  }

  function optimizeSearch() {
    if(article_graph === undefined) return
    if(entity_graph === undefined) return
    if(relevantDocIds.length === 0) return
    return new Promise((resolve, reject) => {
      const clusters = article_graph.clusters
      const docs = relevantDocs.map(doc => doc.id)
      console.log("optimizing: ", docs, clusters)
      fetch(`${server_address}/user/optimize_partition/${user_id}`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ docs, clusters })
      })
        .then(res => res.json())
        .then(optimize_article_graph => {
          console.log({optimize_article_graph})
          setArticleGraph(optimize_article_graph)
          resolve("success")
        })
    })
  }

  function fetchPHilbert() {
    return new Promise((resolve, reject) => {
      const width = 128
      const height = 20
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
          resolve("success")
        })
    })
  }

  function fetchGosper() {
    return new Promise((resolve, reject) => {
      const level = 5
      fetch(`${server_address}/static/gosper/`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ level })
      })
        .then(res => res.json())
        .then(gosper => {
          console.log({gosper})
          setGosper(gosper)
          resolve("success")
        })
    })
  }

  function onClusterMoved(value) {
    const cluster_label = "L-5-1"
  }
  
  return (
    <div className="App flex w-full h-full">
      <div className='left-panel flex basis-1/2 h-full'>
        {
          <div className="article-hgraph-container flex flex-1 h-full">
          {
            !HGraphLoaded &&
            <div className="loading-hint"> Loading... </div>
          }
          {
            HGraphLoaded && 
            // <EventHgraph svgId={'event-network'} network_data={event_hgraph} total_communities={event_hgraph?.communities.length || 1}></EventHgraph>
            <ClusterOverview svgId={"article-cluster-overview-svg"} 
              article_graph={article_graph!} 
              entity_graph={entity_graph!}
              peripheral={hilbert}
              highlightNodeIds={relevantDocIds} 
              onNodesSelected={fetchTopic} 
              onArticleClusterClicked={handleArticleClusterClicked} 
              onEntityClusterClicked={handleEntityClusterClicked} 
              setTooltipData={setTooltipData}
              articleClusterColorDict={articleClusterColorDict}
              articleSubClusterColorDict={articleSubClusterColorDict}
              entityClusterColorDict={entityClusterColorDict}
              entitySubClusterColorDict={entitySubClusterColorDict}
              searchMode={searchMode}
              brushMode={brushMode} 
              selectedClusters={selectedClusters}
              mergedClusters={mergedClusters}
              gosper={gosper}
              />
          }
          </div>
        }
      </div>
      <div className='right-panel flex basis-1/2 w-1/12'>
        {
          <div className='middle-container basis-1/2 flex flex-col '>
            <div className='utility-container flex flex-col w-full h-fit space-y-4 pl-1 border rounded '>
              {/* <button className={"test"} onClick={fetchPartition}> Show Level {level}</button> */}
              <div className='toggler-container flex flex-col py-3'>
                <div className='switch-container flex justify-center mr-2 w-fit '>
                  <span className='switch-label mr-2'>Brush</span>
                  <Switch className={"toggle-brush bg-black/25"} onChange={setBrushMode} checkedChildren="On" unCheckedChildren="Off"></Switch>
                </div>
                <div className='switch-container flex justify-center mr-2 w-fit'>
                  <span className='switch-label mr-2'>Search</span>
                  <Switch className={"toggle-searchMode bg-black/25"} checked={searchMode} onChange={setSearchMode} checkedChildren="On" unCheckedChildren="Off"></Switch>
                </div>
                <button className={"apply-merge btn ml-2"} onClick={applyMerge}>Merge</button>
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
              {/* <button className={"optimize btn ml-2"} onClick={optimizeSearch}>Optimize Search</button> */}
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
                <span className='relevance-label'> Relevance &gt;= </span>
                <InputNumber className="relevance-threshold" min={0} max={1} step={0.01} defaultValue={0.8} value={relevanceThreshold} onChange={(value) => setRelevanceThreshold(Number(value))} />
              </div>
              <Slider defaultValue={0} onChange={onClusterMoved} />

              <div className="topic-viewer w-full"> {topic} </div>
            </div>
            <div className='statistics-container w-full flex-1 border rounded '>
              {
                tooltipData &&
                <Tooltip tooltipData={tooltipData} 
                articleClusterColorDict={articleClusterColorDict}
                articleSubClusterColorDict={articleSubClusterColorDict}
                entityClusterColorDict={entityClusterColorDict}
                />
              }
            </div>
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
                    <div className="doc-card-title px-1 mr-2 border-r border-black/50"> Doc Id: {doc_data.id} </div>
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
        </div>

      </div>
  )
}

export default App
