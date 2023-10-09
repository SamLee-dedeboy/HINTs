<script lang="ts">
  import * as d3 from "d3"
  import HyperMap from './lib/HyperMap.svelte'
  import Search from './lib/Search.svelte';
  import Switch from './lib/Switch.svelte'
  import { onMount } from 'svelte'

  // data from server
  let HGraphLoaded = false
  let fetchingSubCluster = false
  let hilbert: any = undefined
  let gosper: any = undefined
  let user_hgraph: any = undefined
  let article_graph: any = undefined
  let entity_graph: any = undefined

  // flags
  let searchMode = false
  let filtered = false
  let defaultShowArticleClusterLabel = true
  let defaultShowEntityClusterLabel = false

  // data
  let docsRanked: any[] | undefined = undefined
  let relevanceThreshold: number = 0.8
  let DocListTitle: string = "Document List"
  let clickedClusterLabel: string = ""
  let clickedCluster: string = ""
  let queryDocs: string[] = []
  let selectedDocCluster: string | undefined = undefined
  let selectedDocs: any[] | undefined = undefined

  $: searchResultDocs = docsRanked?.filter(doc => doc.relevance.toFixed(2) >= relevanceThreshold.toFixed(2))
  $: searchResultDocIds = searchResultDocs?.map(doc => doc.id)
  $: article_clusters = ((article_graph) => {
    if(!article_graph) return []
    const res = {}
    Object.keys(article_graph.clusters).forEach(cluster_label => {
      const cluster_articles = article_graph.clusters[cluster_label]
      cluster_articles.forEach(article_id => res[article_id] = cluster_label)
    })
    return res
  })(article_graph)

  const articleClusterColorScale = d3.scaleOrdinal(d3.schemeTableau10)
  const articleSubClusterColorScale = d3.scaleOrdinal(d3.schemeSet3)
  let previousClusterColorDict: any = {}
  let previousSubClusterColorDict: any = {}
  $: articleClusterColorDict = ((article_graph) => {
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
    // setPreviousClusterColorDict(cluster_color_dict)
    previousClusterColorDict = cluster_color_dict
    return cluster_color_dict
  })(article_graph)

  $: articleSubClusterColorDict = ((article_graph) => {
    let sub_cluster_color_dict = {}
    if(!article_graph) return sub_cluster_color_dict
    Object.keys(article_graph.clusters).forEach(cluster_label => {
      // retain cluster color
      // const cluster_color = d3.hsl(articleClusterColorDict[cluster_label])
      const cluster_color = d3.hsl(articleClusterColorScale(cluster_label))
      const sub_clusters = article_graph.cluster_children[cluster_label]
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
        sub_cluster_color_dict[sub_cluster_label] = offset_hsl.formatHex()
      })
    })
    // setPreviousSubClusterColorDict(sub_cluster_color_dict)
    previousSubClusterColorDict = sub_cluster_color_dict
    console.log({sub_cluster_color_dict})
    return sub_cluster_color_dict
  })(article_graph)

  const entityClusterColorScale = d3.scaleOrdinal(d3.schemeSet2)
  const entitySubClusterColorScale = d3.scaleOrdinal(d3.schemeSet3)
  let previousEntityClusterColorDict = {}
  let previousEntitySubClusterColorDict = {}
  $: entityClusterColorDict = ((entity_graph) => {
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
    // setPreviousEntityClusterColorDict(cluster_color_dict)
    previousEntityClusterColorDict = cluster_color_dict
    return cluster_color_dict
  })(entity_graph)
  
  $: entitySubClusterColorDict = ((entity_graph) => {
    let sub_cluster_color_dict = {}
    if(!entity_graph) return sub_cluster_color_dict
    Object.keys(entity_graph.entity_clusters).forEach(cluster_label => {
      // const cluster_color = d3.hsl(entityClusterColorDict[cluster_label])
      const cluster_color = entityClusterColorScale(cluster_label)
      const sub_clusters = entity_graph.entity_cluster_children[cluster_label]
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
    // setPreviousEntitySubClusterColorDict(sub_cluster_color_dict)
    previousEntitySubClusterColorDict = sub_cluster_color_dict
    return sub_cluster_color_dict
  })(entity_graph)



  const server_address = "http://localhost:5050"
  // mounted
  onMount(() => {
    const promises = [fetchPHilbert(), fetchGosper(), fetchPartitionArticle()]
    Promise.all(promises)
      .then(() => {
        console.log("all data loaded")
      })
  })
  function fetchPHilbert() {
    return new Promise((resolve) => {
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
          hilbert = {
            points: p_hilbert,
            width: width,
            height: height
          }
          // setHilbert({
          //   points: p_hilbert,
          //   width: width,
          //   height: height
          // })
          resolve("success")
        })
    })
  }

  function fetchGosper() {
    return new Promise((resolve) => {
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
        .then(res => {
          console.log({res})
          // setGosper(gosper)
          gosper = res
          resolve("success")
        })
    })
  }

  function fetchPartitionArticle() {
    return new Promise((resolve) => {
      console.log("fetching article with partition")
      fetch(`${server_address}/user/hgraph/`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        // body: JSON.stringify({ article_level: 4, entity_level: 4})
        body: JSON.stringify({ article_level: 5, entity_level: 5})
      })
        .then(res => res.json())
        .then(async (hgraph: any) => {
          console.log({hgraph})
          // user_hgraph_ref.current = hgraph.user_hgraph
          user_hgraph = hgraph.user_hgraph
          article_graph = hgraph.article_graph  
          entity_graph = hgraph.entity_graph
          HGraphLoaded = true
          // await setArticleGraph(hgraph.article_graph)
          // await setEntityGraph(hgraph.entity_graph)
          resolve("success")
        })

    })
  }

  // event  handlers
  async function handleArticleClusterClicked(event) {
    const cluster_id = event.detail
    return new Promise((resolve) => {
      // setClusterSelected(true)
      // setClusterDataFetched(false)
      const clusters = article_graph!.clusters
      console.log("fetching for cluster", cluster_id, clusters)
      const cluster_label = cluster_id
      console.log({user_hgraph})
      fetch(`${server_address}/user/expand_cluster/article/`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ cluster_label, clusters: clusters, user_hgraph })
      })
        .then(res => res.json())
        .then(expanded_graph => {
          console.log({expanded_graph})
          // setArticleGraph(expanded_graph.article_graph)
          article_graph = expanded_graph.article_graph
          user_hgraph = expanded_graph.user_hgraph
          resolve("success")
          // setClusterData(cluster_data)
          // setClusterDataFetched(true)
        })
    })
  }

  async function handleEntityClusterClicked(event) {
    const cluster_id = event.detail
    return new Promise((resolve) => {
      console.log("fetching for entity cluster", cluster_id)
      const cluster_label = cluster_id
      const clusters = entity_graph!.entity_clusters
      fetch(`${server_address}/user/expand_cluster/entity/`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ cluster_label, clusters, user_hgraph })
      })
        .then(res => res.json())
        .then(expanded_graph => {
          console.log({expanded_graph})
          // setEntityGraph(expanded_graph.entity_graph)
          entity_graph = expanded_graph.entity_graph
          user_hgraph = expanded_graph.user_hgraph
          resolve("success")
          // setClusterData(cluster_data)
          // setClusterDataFetched(true)
        })
    })
  }

  async function handleEntityLabelClicked(event) {
    const { entity_titles, doc_ids, clicked_cluster_label } = event.detail
    if(clicked_cluster_label) {
      DocListTitle = article_graph?.hierarchical_topics[clicked_cluster_label] + (entity_titles? " and " + entity_titles!.join(", "): "")
    } else {
      DocListTitle = "Articles featuring " + entity_titles!.join(", ")
    }
    clickedClusterLabel = clicked_cluster_label || ""
    // setSelectedDocCluster(clickedClusterLabel.current)
    selectedDocCluster = clickedClusterLabel
    await fetchArticles(doc_ids, clicked_cluster_label)
  }

  function handleArticleLabelClicked(event) {
    const cluster_label = event.detail
    console.log("clicked: ", {cluster_label})
    if(article_graph === undefined) return
    let article_doc_ids = article_graph.clusters[cluster_label]
    if(article_doc_ids) {
      // setFetchingSubCluster(false)
      fetchingSubCluster = false
    } else {
      article_doc_ids = article_graph.article_nodes.filter(article => article.sub_cluster_label === cluster_label).map(article => article.id)
      fetchingSubCluster = true
      // setFetchingSubCluster(true)
    }
    selectedDocCluster = cluster_label
    // setSelectedDocCluster(cluster_label)
    clickedClusterLabel = article_graph.hierarchical_topics[cluster_label]
    clickedCluster = cluster_label
    DocListTitle = clickedClusterLabel
    fetchArticles(article_doc_ids, cluster_label)
  }

  async function fetchArticles(doc_ids, cluster_label: string | undefined=undefined) {
    return new Promise((resolve) => {
      fetch(`${server_address}/static/articles/`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ doc_ids })
      })
        .then(res => res.json())
        .then(articles => {
          articles.forEach(article => {
            if(cluster_label === undefined) {
              const article_cluster_label = article_clusters[article.id]
              article.cluster_label = article_graph?.hierarchical_topics[article_cluster_label]
              article.color = articleClusterColorDict[article_cluster_label]
            } else {
              article.cluster_label = article_graph?.hierarchical_topics[cluster_label]
              article.color = articleClusterColorDict[cluster_label] || articleSubClusterColorDict[cluster_label]
            }
          })
          if(docsRanked) {
            const doc_relevance_dict = {}
            docsRanked.forEach(doc => {
              doc_relevance_dict[doc.id] = doc.relevance
            })
            articles.forEach(article => {
              article.relevance = doc_relevance_dict[article.id]
            })
          }
          // setSelectedDocs(articles)
          selectedDocs = articles
          resolve("success")
        })
    })
  }

  function handleArticleClusterRemoved(event) {
    const cluster_label = event.detail
    const cluster_article_node_ids = article_graph!.clusters[cluster_label]
    user_hgraph.article_nodes = user_hgraph.article_nodes.filter(node_id => !cluster_article_node_ids.includes(node_id))
    delete article_graph!.clusters[cluster_label]
  } 
  function handleEntityClusterRemoved(event) {
    const cluster_label = event.detail
    const cluster_entity_node_ids = entity_graph!.entity_clusters[cluster_label]
    user_hgraph.entity_nodes = user_hgraph.entity_nodes.filter(node_id => !cluster_entity_node_ids.includes(node_id))
    delete entity_graph!.entity_clusters[cluster_label]
  } 

</script>

<main>
  <div class="App flex w-full h-full font-serif">
    <div class='left-panel flex basis-[50%] h-full justify-between'>
        <div class="article-hgraph-container flex flex-1 h-full">
          {#if !HGraphLoaded}
            <div class="loading-hint"> Loading... </div>
          {/if}
          <HyperMap svgId={"article-cluster-overview-svg"} 
            article_graph={article_graph} 
            entity_graph={entity_graph}
            filtered={filtered}
            peripheral={hilbert}
            searchedArticleIds={searchResultDocIds} 
            on:article-cluster-clicked={handleArticleClusterClicked}
            on:entity-cluster-clicked={handleEntityClusterClicked}
            on:entity-label-clicked={handleEntityLabelClicked}
            on:article-label-clicked={handleArticleLabelClicked}
            on:article-cluster-removed={handleArticleClusterRemoved}
            on:entity-cluster-removed={handleEntityClusterRemoved}
            articleClusterColorDict={articleClusterColorDict}
            articleSubClusterColorDict={articleSubClusterColorDict}
            entityClusterColorDict={entityClusterColorDict}
            entitySubClusterColorDict={entitySubClusterColorDict}
            searchMode={searchMode}
            showEntityClusterLabelDefault={defaultShowEntityClusterLabel}
            showArticleClusterLabelDefault={defaultShowArticleClusterLabel}
            gosper={gosper}
            />
        </div>
    </div>
    <div class='middle-panel flex flex-col basis-[35%] w-1/12'>
      <div class='utility-container flex  w-full h-fit pl-1 border rounded '>
        <div class='toggler-container flex flex-col py-2 border-r-2 '>
          <div>
            <div class='show-entity-cluster-label-container flex justify-center mr-2 w-fit'>
              <span class='switch-label mr-2'>Show Entity Label</span>
              <Switch></Switch>
              <!-- <Switch class={"toggle-entity-label-mode bg-black/25"} checked={defaultShowEntityClusterLabel} onChange={setDefaultShowEntityClusterLabel} checkedChildren="On" unCheckedChildren="Off"></Switch> -->
            </div>
            <div class='show-article-cluster-label-container flex justify-center mr-2 w-fit'>
              <span class='switch-label mr-2'>Show Article Label</span>
              <Switch></Switch>
              <!-- <Switch class={"toggle-article-label-mode bg-black/25"} checked={defaultShowArticleClusterLabel} onChange={setDefaultShowArticleClusterLabel} checkedChildren="On" unCheckedChildren="Off"></Switch> -->
            </div>
            <div class='switch-container flex justify-center mr-2 w-fit'>
              <span class='switch-label mr-2'>Search</span>
              <Switch></Switch>
              <!-- <Switch className={"toggle-searchMode bg-black/25"} checked={searchMode} onChange={setSearchMode} checkedChildren="On" unCheckedChildren="Off"></Switch> -->
            </div>
          </div>
        </div>
        <div class='flex flex-col px-1 py-2'>
          <div class='search-container w-full flex items-center'>
            <Search>  </Search>
            <!-- <Search class={"search-bar w-full"}
              placeholder="input search text" 
              size="large" 
              onChange={(e) => setQuery(e.target.value)}
              onSearch={search} 
              loading={searchLoading} /> -->
          </div>
          <div class='relevance-threshold-container w-fit px-0.5 mt-1'>
            <span class='relevance-label'> Relevance &gt;= </span>
            <input type="number" id="visitors" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="" required>
            <!-- <InputNumber className="relevance-threshold" min={0} max={1} step={0.01} defaultValue={0.8} value={relevanceThreshold} onChange={(value) => setRelevanceThreshold(Number(value))} /> -->
            <!-- <button class={"apply-filter btn p-1 ml-1"} onClick={applyFilter}>Filter Search</button> -->
          </div>
        </div>
      </div>
        <div class="doc-list-container flex flex-col flex-1 overflow-y-auto mt-2">
          <!-- <DocList docs={selectedDocs} 
            cluster_label={DocListTitle.current} 
            theme={(fetchingSubCluster? articleSubClusterColorDict[selectedDocCluster!] : articleClusterColorDict[selectedDocCluster!]) || undefined}
            highlightDocs={searchResultDocs}
            onQueryDocChanged={(docs) => { console.log(docs); setQueryDocs(docs);}}
            /> -->
        </div>
    </div>
    <div class='right-panel basis-[30%] flex flex-col'>
      <div class='statistics-container w-full h-full border rounded '>
        <!-- <ChatBox queryDocs={queryDocs}></ChatBox> -->
      </div>
    </div>
  </div>
</main>

<style>
</style>
