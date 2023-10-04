<script lang="ts">
  import Search from './lib/Search.svelte';
  import Switch from './lib/Switch.svelte'
</script>

<main>
  <div class="App flex w-full h-full font-serif">
    <div class='left-panel flex basis-[50%] h-full justify-between'>
        <div class="article-hgraph-container flex flex-1 h-full">
          <!-- <ClusterOverview svgId={"article-cluster-overview-svg"} 
            article_graph={article_graph!} 
            entity_graph={entity_graph!}
            filtered={filtered}
            peripheral={hilbert}
            searchedArticleIds={searchResultDocIds} 
            // onNodesSelected={fetchTopic} 
            onArticleClusterClicked={handleArticleClusterClicked} 
            onEntityClusterClicked={handleEntityClusterClicked} 
            onEntityLabelClicked={handleEntityLabelClicked}
            onArticleLabelClicked={(cluster_label) => handleClusterSelected(cluster_label)}
            onArticleClusterRemoved={handleArticleClusterRemoved}
            onEntityClusterRemoved={handleEntityClusterRemoved}
            // setTooltipData={setTooltipData}
            articleClusterColorDict={articleClusterColorDict}
            articleSubClusterColorDict={articleSubClusterColorDict}
            entityClusterColorDict={entityClusterColorDict}
            entitySubClusterColorDict={entitySubClusterColorDict}
            searchMode={searchMode}
            showEntityClusterLabelDefault={defaultShowEntityClusterLabel}
            showArticleClusterLabelDefault={defaultShowArticleClusterLabel}
            gosper={gosper}
            /> -->
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
