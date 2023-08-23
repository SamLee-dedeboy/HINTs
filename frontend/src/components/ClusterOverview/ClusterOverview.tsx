import { useState, useMemo, useEffect } from 'react'
import { usePrevious } from "@uidotdev/usehooks";

import "./ClusterOverview.css"
import { t_EntityNode, t_EventHGraph, t_ArticleNode, tooltipContent, d_ArticleGraph, d_EntityGraph } from "../../types";
import borders from "./BorderUtils";
import spacing from "./SpacingUtils";
import sfc from "./SFCUtils"
import tags from "./TagUtils"
import * as DragUtils from "./DragUtils"
import * as d3 from 'd3'

interface ClusterOverviewProps {
  svgId: string
  article_graph: d_ArticleGraph
  entity_graph: d_EntityGraph
  highlightNodeIds: string[]
  peripheral: any
  onNodesSelected: (node_ids: string[]) => void
  onArticleClusterClicked: (e: any, cluster_label: string, clusters: any) => void
  onEntityClusterClicked: (e: any, cluster_label: string, clusters: any) => void
  setTooltipData: (content: tooltipContent) => void
  articleClusterColorDict: any
  articleSubClusterColorDict: any
  entityClusterColorDict: any
  entitySubClusterColorDict: any
  brushMode: boolean
  searchMode: boolean
  selectedClusters: string[]
  mergedClusters: any[]
  gosper: any[]
}

function ClusterOverview({
  svgId, 
  article_graph, 
  entity_graph,
  highlightNodeIds, 
  peripheral,
  onNodesSelected, 
  onArticleClusterClicked, 
  onEntityClusterClicked,
  setTooltipData,
  articleClusterColorDict,
  articleSubClusterColorDict,
  entityClusterColorDict,
  entitySubClusterColorDict,
  brushMode, 
  searchMode,
  selectedClusters,
  mergedClusters,
  gosper,
}: ClusterOverviewProps) {
  const margin = {
      left: 30,
      right: 30,
      top: 30,
      bottom: 30
    }
  const centerAreaOffset = {
    top: 260,
    left: 260,
    right: 260,
    bottom: 290
  }
  
  const svgSize = useMemo(() => {
    const width = window.innerWidth
    const height = window.innerHeight*2
    return { width, height }
  }, [])

  const canvasSize = useMemo(() => { 
    return {
      start_x: margin.left,
      start_y: margin.top, 
      end_x: svgSize.width - margin.right,
      end_y: svgSize.height - margin.bottom,
      width: svgSize.width - margin.left - margin.right,
      height: svgSize.height - margin.top - margin.bottom,
    }
  }, [])

  const centerAreaSize = useMemo(() => {
    return {
      start_x: margin.left + centerAreaOffset.left,
      start_y: margin.top + centerAreaOffset.top,
      end_x: svgSize.width - margin.right - centerAreaOffset.right,
      end_y: svgSize.height - margin.bottom - centerAreaOffset.bottom,
      width: svgSize.width - margin.left - margin.right - centerAreaOffset.left - centerAreaOffset.right,
      height: svgSize.height - margin.top - margin.bottom - centerAreaOffset.top - centerAreaOffset.bottom,
    }
  }, [])

  //
  // scales & constants
  //

  // articles
  const article_node_radius = 4.5
  // entities
  const entity_node_radius = 4

  //
  // states
  //

  // articles
  const [hoveredArticleCluster, setHoveredArticleCluster] = useState<string>("")
  // entities
  const [hoveredEntityCluster, setHoveredEntityCluster] = useState<string>("")
  
  //
  // article cluster colors
  //


  useEffect(() => {
    update_article_color()
  }, [articleClusterColorDict])

  //
  // entity cluster colors
  //
  //
  // entity cluster colors
  //
  //
  // computed data
  //
  const entity_data_dict = useMemo(() => {
    let res = {}
    entity_graph.entity_nodes.forEach(entity => {
      res[entity.id] = entity
    })
    return res
  }, [entity_graph.entity_nodes])
  const article_cluster_linked_entities_clustered = useMemo(() => {
    const res = {}
    Object.keys(article_graph.article_cluster_linked_entities).forEach(cluster_label => {
      const linked_entities = article_graph.article_cluster_linked_entities[cluster_label]
      const linked_entities_clustered = {}
      linked_entities.forEach(entity => {
        const entity_cluster = entity_data_dict[entity].cluster_label
        if(linked_entities_clustered[entity_cluster] === undefined) 
          linked_entities_clustered[entity_cluster] = new Set()
        if(linked_entities_clustered[entity_cluster].size > 5) return
        const entity_title = entity_data_dict[entity].title
        // linked_entities_clustered[entity_cluster].add(`${entity_title}(${entity})`)
        linked_entities_clustered[entity_cluster].add(entity_title)
      })
      // convert sets to array
      const cluster_res = {}
      Object.keys(linked_entities_clustered).forEach(entity_cluster => {
        const entities = Array.from(linked_entities_clustered[entity_cluster])
        if(entities.length > 3) cluster_res[entity_cluster] = entities
      })
      res[cluster_label] = cluster_res
    })
    return res
  }, [article_graph.article_cluster_linked_entities, entity_graph])

  const initialTooltipData = useMemo(() => {
    const entity_dict = {}
    entity_graph!.entity_nodes.forEach(entity => {
      entity_dict[entity.id] = entity
    })
    const entity_cluster_titles = {}
    Object.keys(entity_graph!.entity_clusters).forEach(cluster_label => {
      const entity_ids = entity_graph!.entity_clusters[cluster_label]
      entity_cluster_titles[cluster_label] = entity_ids.map(id => entity_dict[id].title).slice(0, 5)
    })
    return {
      hovered: false,
      cluster_label: "Top level",
      cluster_topic: "Top level",
      entity_clusters: entity_cluster_titles,
        // entity_clusters: article_cluster_linked_entities_clustered[d.cluster_label],
      sub_clusters: Object.keys(article_graph!.clusters)
        .sort((c1, c2) => article_graph!.hierarchical_topics[c1].localeCompare(article_graph!.hierarchical_topics[c2]))
        .map(
          (cluster_label: string) => {
            return {
              cluster_label: cluster_label,
              cluster_topic: article_graph!.hierarchical_topics[cluster_label],
            }
          })
      }
  }, [article_graph, entity_graph])

  // useEffect hooks
  useEffect(() => {
    init()
  }, []);

  useEffect(() => {
    if(brushMode) {
      addBrush()
    } else {
      removeBrush()
    }
  }, [brushMode])

  useEffect(() => {
    if(searchMode) update_highlight(highlightNodeIds, [])
    if(!searchMode)remove_highlight() 
  }, [searchMode])

  useEffect(() => {
    update_selected_cluster()
    // rebind selected clusters
    const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
    const border_group = centerArea.select("g.article-border-group")
    border_group.selectAll("path.concave-hull")
      .on("mouseover", article_border_handlers.mouseover)
      .on("mouseout", article_border_handlers.mouseout)
      // .call(bindDrag)
      .on("click", article_border_handlers.click)
  }, [selectedClusters, searchMode, highlightNodeIds])

  useEffect(() => {
    update_highlight(highlightNodeIds, [])
  }, [highlightNodeIds])

  useEffect(() => {
    update_entity_cluster()
  }, [entity_graph.entity_nodes]);

  useEffect(() => {
    update_article_cluster()
    update_selected_cluster()
  }, [article_graph.article_nodes])

  useEffect(() => {
    listenKeyDown()
  }, [hoveredArticleCluster])


  function init() {
    const svg = d3.select('#' + svgId)
      .attr("viewBox", `0 0 ${svgSize.width} ${svgSize.height}`)
      .attr("overflow", "visible")
    const canvas = svg.append("g")
      .attr("class", "margin")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    canvas.append("g").attr("class", "peripheral-group")
    canvas.append("g").attr("class", "entity-border-group")
    canvas.append("g").attr("class", "entity-node-group")

    const center_area = canvas.append("g")
      .attr("class", "center-area")
      .attr("transform", "translate(" + centerAreaOffset.left + "," + centerAreaOffset.top + ")")
    center_area.append("rect").attr("class", "center-area-background")
      .attr("x", 0 - 20)
      .attr("y", 0 - 20)
      .attr("width", centerAreaSize.width + 20)
      .attr("height", centerAreaSize.height + 30)
      .attr("stroke-width", "1px")
      .attr("stroke", "grey")
      .attr("rx", "20%")
      .attr("fill", "#e8e8e8")
      .attr("opacity", 0.2)
      .attr("filter", "url(#drop-shadow-border)")
      .attr("pointer-events", "none")

    center_area.append("g").attr("class", "article-border-group")
    center_area.append("g").attr("class", "article-node-group")
    center_area.append("g").attr("class", "article-border-tag-group")
    center_area.append("path").attr("class", "highlight-border")
    center_area.append("g").attr("class", "link-group")
    addBrush()
    sfc.initPeripheral(peripheral)
    sfc.initGosper(gosper)  
    listenKeyDown()
    setTooltipData(initialTooltipData)
  }

  function listenKeyDown() {
    d3.select("body").on("keydown", function(e) {
      if(e.keyCode === 224 || e.keyCode === 17) {
        console.log("ctrl key down", hoveredArticleCluster)
        d3.selectAll("path.concave-hull").filter((d: any) => d.cluster_label === hoveredArticleCluster)
          .attr("stroke-width", 4)
      }
    })
  }

  function update_article_color() {
    const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
    const article_node_group = centerArea.select("g.article-node-group")
    article_node_group.selectAll("circle.article-node")
      .attr("fill", (d: any) => d.cluster_color = articleClusterColorDict[d.cluster_label])
  }

  function update_selected_cluster() {
    console.log("updating selected cluster", selectedClusters)
    const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
    const borders = centerArea.select("g.article-border-group").selectAll("path.concave-hull")
      .attr("stroke-width", 1)
      .filter((d: any) => selectedClusters.includes(d.cluster_label))
      .attr('stroke-width', 4)
  }

  function update_article_cluster() {
    const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
    // sfc.generate_hilbert_coord(graph.article_nodes, graph.clusters, graph.cluster_order, centerAreaSize, 'center')
    sfc.generate_gosper_coord(article_graph.article_nodes, centerAreaSize)
    const t_delay = 100
    const t_duration = 1500
    // articles 
    const article_node_group = centerArea.select("g.article-node-group")
    article_node_group.selectAll("circle.article-node")
      .data(article_graph.article_nodes, (d: any, i) => { d.i = i; return d.id })
      .join(
        enter => enter.append("circle")
            .attr("class", "article-node")
            .attr("r", article_node_radius)
            .attr("stroke", "white")
            .attr("stroke-width", 0.5)
            .attr("fill", (d: any) => d.cluster_color = articleClusterColorDict[d.cluster_label])
            .attr("pointer-events", "none")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("opacity", 0)
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            .attr("opacity", 0.5)
            .attr("transform", "translate(0,0)")
            .selection(),
        update => update.transition()
            .delay((d, i) => {
              if(article_graph.filtered) {
                return t_duration
              } else {
                return (d.update_cluster_order || 0)*t_delay 
              }
            })
            .duration(t_duration)
            .attr("fill", (d: any) => d.cluster_color = articleClusterColorDict[d.cluster_label])
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y),
      )
    // cluster borders
    const cluster_borders = generate_cluster_borders(
      article_graph.article_nodes, 
      article_graph.clusters, 
      article_graph.cluster_order, 
      article_graph.update_cluster_order,
      1.5, // concavity
      "rounded" // smoothing
      )
    
    const border_tag_group = centerArea.select("g.article-border-tag-group")
    // cluster label
    const tag = border_tag_group.selectAll("text.cluster-label")
      .data(cluster_borders, (d: any) => d.cluster_label)
      .join("text")
      .attr("class", "cluster-label")
      .text(d => article_graph.hierarchical_topics[d.cluster_label])
      .attr("x", (d) => d.centroid[0])
      .attr("y", (d) => d.centroid[1])
      .attr("font-size", "1.3rem")
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none")
      .call(tags.wrap, 150)
      .each(function(d) {
        const tspans = d3.select(this).selectAll("tspan").nodes()
        console.log({tspans})
        const start_x = Math.min(...tspans.map((tspan: any) => tspan.getStartPositionOfChar(0).x))
        const start_y = (tspans[0]! as any).getStartPositionOfChar(0).y- (tspans[0]! as any).getExtentOfChar(0).height/2
        const width = Math.max(...tspans.map((tspan: any) => tspan.getComputedTextLength()))
        const height = tspans.reduce((total: number, tspan: any) => total + tspan!.getExtentOfChar(0).height, 0)
        const padding_x = 10
        const padding_y = 10
        console.log({start_x, start_y, width, height})
        const tspan_border = centerArea.select("g.article-border-tag-group")
          .append("rect")
          .datum(d)
          .attr("class", "cluster-label-border")
          .attr("x", start_x - padding_x)
          .attr("y", d.y = start_y - padding_y)
          .attr("width", width + 2*padding_x)
          .attr("height", height + 2*padding_y)
          .attr("pointer-events", "none")
          .attr("fill", "white")
          .attr("stroke-width", 1)
          .attr('stroke', "black")
          .attr("opacity", 0.5)
          .lower()
      })



    // border paths
    const tooltipDiv = d3.select(".tooltip");
    const border_group = centerArea.select("g.article-border-group")
    border_group.selectAll("path.concave-hull")
      .data(cluster_borders, (d: any) => d.cluster_label)
      .join(
        enter => enter.append("path")
          .attr("class", "concave-hull")
          .attr("d", d => d.path)
          .attr("fill", "#e1e1e1")
          .attr("stroke", "black")
          .attr("stroke-width", 1)
          .attr("cursor", "pointer")
          .attr("transform", "translate(0,0)")
          .on("mouseover", article_border_handlers.mouseover)
          .on("mouseout", article_border_handlers.mouseout)
          // .call(bindDrag)
          .on("click", article_border_handlers.click)
          .attr("opacity", 0)
          .transition().delay(t_delay + (article_graph.filtered? t_duration : 0)).duration(t_duration)
          .attr("opacity", 0.5)
          .selection(),
        update => update
          // .attr("stroke-dasharray", function() { 
          //   const totalLength = (d3.select(this).node()! as any).getTotalLength() 
          //   return totalLength + " " + totalLength
          // })
          // .attr("stroke-dashoffset", function() { return (d3.select(this).node()! as any).getTotalLength()})
          .on("mouseover", article_border_handlers.mouseover)
          .on("mouseout", article_border_handlers.mouseout)
          // .call(bindDrag)
          .on("click", article_border_handlers.click)
          .transition().delay(t_delay + (article_graph.filtered? t_duration : 0)).duration(t_duration)
          .attr("d", d => d.path)
          .duration(t_duration)
          .attr("opacity", 0.5),
        exit => exit.transition()
          .delay(article_graph.filtered? t_duration : 0).remove()
      )
  }

  function bindDrag(eles) {
    const drag: any = d3.drag()
        .clickDistance(100)
        .on("start", DragUtils.dragStarted)
        .on("drag", DragUtils.dragged)
        .on("end", DragUtils.dragEnded);
    d3.selectAll(eles).call(drag)
  }

  // border event handlers
  const article_border_handlers = {
    mouseover: function(e, d) {
      const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
      const tooltipDiv = d3.select(".tooltip");
      // update sub-cluster labels
      tags.updateArticleSubClusterLabels(
        svgId,
        article_graph,
        d.cluster_label, 
        article_graph.sub_clusters[d.cluster_label],
        1.5
      )
      tags.liftArticleClusterLabel(svgId, d)
      

      // show connected entities
      show_connected_entities(d.cluster_label)
      // highlight nodes
      centerArea.selectAll("circle.article-node")
        .filter((node: any) => node.cluster_label === d.cluster_label)
        .attr("fill", (d: any) => { 
          d.sub_cluster_color = articleSubClusterColorDict[d.sub_cluster_label]
          return d.sub_cluster_color;
        })
        .filter((node: any) => !searchMode || highlightNodeIds.includes(node.id))
        .attr("opacity", 1)
      // highlight border
      if(e.ctrlKey || e.metaKey) {
        if(selectedClusters.includes(d.cluster_label)) {
          d3.select(this).attr("stroke-width", 4)
        }
      }
      d3.select(this).attr("opacity", 1)
      setHoveredArticleCluster(d.cluster_label)
      // tooltip
      // const tooltip_coord = SVGToScreen(d.max_x+margin.left+centerAreaOffset.left, d.min_y+margin.top+centerAreaOffset.top)
      // tooltipDiv
      //   .style("left", tooltip_coord.x + "px")
      //   .style("top", tooltip_coord.y + "px")
      setTooltipData({
        hovered: true,
        cluster_label: d.cluster_label,
        cluster_topic: article_graph.hierarchical_topics[d.cluster_label],
        entity_clusters: article_cluster_linked_entities_clustered[d.cluster_label],
        sub_clusters: article_graph.sub_clusters[d.cluster_label]
        .sort((c1, c2) => article_graph!.hierarchical_topics[c1].localeCompare(article_graph!.hierarchical_topics[c2]))
        .map(
          (sub_cluster_label: string) => {
            return {
              cluster_label: sub_cluster_label,
              cluster_topic: article_graph.hierarchical_topics[sub_cluster_label],
            }
          })
      })
      // tooltipDiv.style("opacity", 1)
    },

    mouseout: function(e, d) {
      const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
      const tooltipDiv = d3.select(".tooltip");

      // remove sub-cluster labels
      tags.removeSubClusterLabels(svgId)
      tags.restoreLiftedArticleClusterLabel(svgId, d)

      // remove connected entities
      remove_connected_entities(d.cluster_label)
      
      // reset hovered cluster color
      const article_nodes = centerArea.selectAll("circle.article-node")
      article_nodes
        .filter((node: any) => node.cluster_label === d.cluster_label)
        .attr("fill", (d: any) => d.cluster_color = articleClusterColorDict[d.cluster_label])
        .attr("opacity", searchMode? 0.2 : 0.5)
        .filter((node: any) => (searchMode && highlightNodeIds.includes(node.id)))
        .attr("opacity", 1)

      // border
      d3.select(this).attr("opacity", 0.5).attr("stroke-width", 1)
      if(selectedClusters.includes(d.cluster_label)) {
        d3.select(this).attr("stroke-width", 4)
      }
      setHoveredArticleCluster("")
      
      // hide tooltip
      setTooltipData(initialTooltipData)
      return
      tooltipDiv.style("opacity", 0)
      if(selectedClusters.includes(d.cluster_label)) {
        d3.select(this).attr("stroke-width", 4)
      }
    },

    click: function(e, d) {
      if(!e.defaultPrevented) {
        if(!(e.ctrlKey || e.metaKey)) {
          remove_connected_entities(d.cluster_label)
        }
        onArticleClusterClicked(e, d.cluster_label, article_graph.clusters)
      }
    }
  }

  const entity_border_handlers = {
    mouseover: function(e, d) {
      const canvas = d3.select('#' + svgId).select("g.margin")
      // show connected articles
      // show_connected_entities(d.cluster_label)
      // highlight nodes
      canvas.selectAll("circle.entity-node")
        .filter((node: any) => node.cluster_label === d.cluster_label)
        .attr("fill", (d: any) => { 
          d.sub_cluster_color = entitySubClusterColorDict[d.sub_cluster_label]
          return d.sub_cluster_color;
        })
        .attr("opacity", 1)
      // highlight border
      // if(e.ctrlKey || e.metaKey) {
      //   d3.select(this).attr("stroke-width", 4)
      // }
      d3.select(this).attr("opacity", 1)
      setHoveredEntityCluster(d.cluster_label)
      // tooltip
      // const tooltip_coord = SVGToScreen(d.max_x+margin.left, d.min_y+margin.top)
      // tooltipDiv
      //   .style("left", tooltip_coord.x + "px")
      //   .style("top", tooltip_coord.y + "px")
      // setTooltipData({
      //   cluster_label: d.cluster_label,
      //   cluster_topic: article_graph.hierarchical_topics[d.cluster_label],
      //   sub_clusters: article_graph.sub_clusters[d.cluster_label].map(
      //     (sub_cluster_label: string) => {
      //       return {
      //         cluster_label: sub_cluster_label,
      //         cluster_topic: article_graph.hierarchical_topics[sub_cluster_label]
      //       }
      //     })
      // })
      // tooltipDiv.style("opacity", 0)
    },
    mouseout: function(e, d) {
      const canvas = d3.select('#' + svgId).select("g.margin")
      const tooltipDiv = d3.select(".tooltip");
      // remove connected entities
      // remove_connected_entities(d.cluster_label)
      
      // reset hovered cluster color
      canvas.selectAll("circle.entity-node")
        .filter((node: any) => node.cluster_label === d.cluster_label)
        .attr("fill", (d: any) => d.cluster_color = entityClusterColorDict[d.cluster_label])
        .attr("opacity", 0.5)
      // border
      d3.select(this).attr("opacity", 0.5).attr("stroke-width", 1)
      setHoveredEntityCluster("")
      
      // hide tooltip
      // tooltipDiv.style("opacity", 0)
      // if(selectedClusters.includes(d.cluster_label)) {
      //   d3.select(this).attr("stroke-width", 4)
      // }
    },
    click: function(e, d) {
      if(!e.defaultPrevented) {
        onEntityClusterClicked(e, d.cluster_label, entity_graph.entity_clusters)
      }
    }
  }

  function update_entity_cluster() {
    const canvas = d3.select('#' + svgId).select("g.margin")
    sfc.generate_entity_hilbert_coord(entity_graph.entity_nodes, canvasSize)
    const t_delay = 100
    const t_duration = 1500
    // entities 
    const entity_node_group = canvas.select("g.entity-node-group")
    entity_node_group.selectAll("circle.entity-node")
      .data(entity_graph.entity_nodes, (d: any, i) => { d.i = i; return d.id })
      .join(
        enter => enter.append("circle")
            .attr("class", "entity-node")
            .attr("r", entity_node_radius)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("fill", (d: any) => d.cluster_color = entityClusterColorDict[d.cluster_label])
            .attr("pointer-events", "none")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("opacity", 0)
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            .attr("opacity", 0.5)
            .selection(),
        update => update.transition()
            .delay((d, i) => {
              if(entity_graph.filtered) {
                return t_duration
              } else {
                return (d.update_cluster_order || 0)*t_delay 
              }
            })
            .duration(t_duration)
            .attr("fill", (d: any) => d.cluster_color = entityClusterColorDict[d.cluster_label])
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y),
      )
    // cluster borders
    const cluster_borders = generate_cluster_borders(
      entity_graph.entity_nodes,
      entity_graph.entity_clusters, 
      entity_graph.entity_cluster_order, entity_graph.entity_update_cluster_order, 
      0.2,  // concavity
      'sketch' // smoothing
    )
    const border_group = canvas.select("g.entity-border-group")
    const tooltipDiv = d3.select(".tooltip");
    border_group.selectAll("path.concave-hull")
      .data(cluster_borders, (d: any) => d.cluster_label)
      .join(
        enter => enter.append("path") 
          .attr("class", "concave-hull")
          .attr("d", d => d.path)
          .attr("fill", "#e1e1e1")
          .attr("stroke", "black")
          .attr("stroke-width", 1)
          .attr("cursor", "pointer")
          .on("mouseover", entity_border_handlers.mouseover)
          .on("mouseout", entity_border_handlers.mouseout)
          .on("click", entity_border_handlers.click)
          .attr("opacity", 0)
          .transition().delay(t_delay + (entity_graph.filtered? t_duration : 0)).duration(t_duration)
          .attr("opacity", 0.5)
          .selection(),
        update => update
          // .attr("stroke-dasharray", function() { 
          //   const totalLength = (d3.select(this).node()! as any).getTotalLength() 
          //   return totalLength + " " + totalLength
          // })
          // .attr("stroke-dashoffset", function() { return (d3.select(this).node()! as any).getTotalLength()})
          .on("mouseover", entity_border_handlers.mouseover)
          .on("mouseout", entity_border_handlers.mouseout)
          .on("click", entity_border_handlers.click)
          .transition().delay(t_delay + (article_graph.filtered? t_duration : 0)).duration(t_duration)
          .attr("d", d => d.path)
          .attr("opacity", 0.5),
        exit => exit.transition()
          .delay(entity_graph.filtered? t_duration : 0).remove()
      )
  }


  function remove_connected_entities(article_cluster_label) {
    const canvas = d3.select('#' + svgId).select("g.margin")
    const cluster_entity_ids: string[] = article_graph.article_cluster_linked_entities[article_cluster_label]
    const entity_node_group = canvas.select("g.entity-node-group")
    // put normal nodes to back
    entity_node_group.selectAll("circle.entity-node")
      .filter((d: any) => cluster_entity_ids.includes(d.id))
      .attr("opacity", 0.5)
      .attr("stroke-width", 1)
  }

  function show_connected_entities(article_cluster_label) {
    console.log({article_cluster_label})
    const canvas = d3.select('#' + svgId).select("g.margin")
    const cluster_entity_ids: string[] = article_graph.article_cluster_linked_entities[article_cluster_label]
    const entity_node_group = canvas.select("g.entity-node-group")
    // put normal nodes to back
    entity_node_group.selectAll("circle.entity-node")
        .filter((d: any) => cluster_entity_ids.includes(d.id))
        .attr("opacity", 1)
        .attr("stroke-width", 2)
    
    // // links
    // const entity_links = graph.links.filter(link => 
    //   (cluster_entity_ids.includes(link.source) && cluster_article_ids.includes(link.target))
    //   || (cluster_entity_ids.includes(link.target)) && cluster_article_ids.includes(link.source))
    // const link_data = generate_link_data(entity_links, cluster_entities, cluster_articles)
    // const link_group = canvas.select("g.link-group")
    //   .selectAll("line.link")
    //   .data(link_data)
    //   .join("line")
    //     .attr("class", "link")
    //     .attr("stroke", (d: any) => d.color || "black")
    //     .attr("stroke-width", 1)
    //     .attr("opacity", 0.2)
    //     .attr("x1", (d: any) => d.source.x)
    //     .attr("y1", (d: any) => d.source.y)
    //     .attr("x2", (d: any) => d.target.x)
    //     .attr("y2", (d: any) => d.target.y)
    //     .attr("pointer-events", "none")
  }

  function generate_link_data(links, entities, articles) {
    let link_data: any = []
    let entity_dict = {}
    entities.forEach(entity => { entity_dict[entity.id] = entity })
    let article_dict = {}
    articles.forEach(article => { article_dict[article.id] = article })
    links.forEach(link => {
      const source = entity_dict[link.source] || article_dict[link.source]
      const target = entity_dict[link.target] || article_dict[link.target]
      console.log(source, target)
      console.log(entity_dict[link.source], article_dict[link.source], entity_dict[link.target], article_dict[link.target])
      link_data.push({
        source: {
          id: source.id,
          x: source.x,
          y: source.y
        },
        target: {
          id: target.id,
          x: target.x,
          y: target.y
        }
      })
    })
    return link_data
  }


  function SVGToScreen(svgX, svgY) {
    const svg = document.querySelector('#' + svgId) as any
    let p = svg.createSVGPoint()
    p.x = svgX
    p.y = svgY
    return p.matrixTransform(svg.getScreenCTM());
  }


  function remove_highlight() {
    const canvas = d3.select('#' + svgId).select("g.margin")
    const article_node_group = canvas.select("g.article-node-group")
    article_node_group.selectAll("circle.article-node")
      // .attr("stroke", "white")
      // .attr("stroke-width", 0.5)
      .attr("opacity", 0.5)
    
  }

  function update_highlight(highlightNodeIds, highlightClusters, attr='id') {
    const canvas = d3.select('#' + svgId).select("g.margin")
    const article_node_group = canvas.select("g.article-node-group")
    // set normal nodes to background
    article_node_group.selectAll("circle.article-node")
      .attr("stroke", 'white')
      .attr("opacity", 0.2)

    // update highlighted nodes 
    article_node_group.selectAll("circle.article-node")
      .filter((node: any) => highlightNodeIds.includes(node[attr]))
      // .attr("stroke", 'black')
      .attr("opacity", 1)

    // const article_borders = canvas.select("g.article-border-group")
    //   .selectAll("path")
    // article_borders.attr("opacity", 0.1)
    // article_borders.filter((node: any) => highlightClusters.includes(node[attr]))
    //   .attr("opacity", 1)


    // highlight article borders
    // const highlight_hyperedge_nodes = graph.hyperedge_nodes.filter(node => highlightNodeIds.includes(node.id))
    // if(highlight_hyperedge_nodes.length > 0) {
    //   const highlight_path = generate_border(highlight_hyperedge_nodes, 2)
    //   canvas.select("path.highlight-border")
    //     .attr("d", highlight_path)
    //     .attr("fill", "yellow")
    //     .attr("stroke", "black")
    //     .attr("opacity", 0.8)
    //     .attr("stroke-width", 1)
    // }
  }

  function generate_cluster_borders(nodes, clusters, cluster_order, update_cluster_order, concavity=0.2, smoothing='rounded') {
    let border_paths: any[] = []
    Object.keys(clusters).forEach(cluster_label => {
      const cluster_node_ids = clusters[cluster_label]
      const nodes_data = nodes.filter(node => cluster_node_ids.includes(node.id))
      // if(nodes_data.length === 0) return

      const {path, centroid, max_x, min_y} = borders.generate_border(nodes_data, concavity, smoothing)
      border_paths.push({
        "cluster_label": cluster_label,
        "cluster_order": cluster_order.indexOf(cluster_label),
        "update_cluster_order": update_cluster_order[cluster_label],
        "path": path,
        "max_x": max_x,
        "min_y": min_y,
        "centroid": centroid,
      })
    })
    return border_paths
  }

  function addBrush() {
    const brush = d3.brush()
      .on("brush", brushing)
      .on("end", brushed);
   const svg = d3.select('#' + svgId)
    svg.append("g").attr("class", "brush").call(brush);
  }

  function removeBrush() {
    const svg = d3.select('#' + svgId)
    svg.select("g.brush").remove()
  }

  function brushing({selection}) {
    const svg = d3.select('#' + svgId)
    const circles = svg.selectAll("circle.article-node").attr("stroke-width", 1)
    circles.each((d: any) => d.scanned = d.selected = false);
    if (selection) search(circles, selection, "brushing");
  }

  function brushed({selection}) {
    const svg = d3.select('#' + svgId)
    const circles = svg.selectAll("circle.article-node").attr("stroke-width", 1)
    circles.each((d: any) => d.scanned = d.selected = false);
    if (selection) search(circles, selection, "end");
    const selected_circle = circles.filter((d: any) => d.selected)
    const selected_node_id = selected_circle.data().map((d: any) => d.id)
    onNodesSelected(selected_node_id)
  }

  // Find the nodes within the specified rectangle.
  function search(circles, [[x0, y0], [x3, y3]], type) {
    circles.each(function(this, d) {
      const x = d.x + margin.left + margin.right
      const y = d.y + margin.top + margin.bottom
      const inside_brush = x >= x0 && x < x3 && y >= y0 && y < y3;  
      if(inside_brush) {
        if(type === "end") {
          d.selected = inside_brush
          d3.select(this).attr("opacity", 1).attr("stroke-width", 1.5)
        } else {
          d3.select(this).attr("stroke-width", 1.5)
        }
      }
    })
  }

  // function updateArticleSubClusterLabels(nodes, cluster_label, sub_cluster_labels, concavity) {
  //   const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
  //   const cluster_nodes = nodes.filter(node => node.cluster_label === cluster_label)
  //   const tag_data: any[] = []
  //   sub_cluster_labels.forEach(sub_cluster_label => {
  //     const sub_cluster_node_data = cluster_nodes.filter(node => node.sub_cluster_label === sub_cluster_label)
  //     if(sub_cluster_node_data.length <= 5) return
  //     const points = sub_cluster_node_data.map(node => [node.x, node.y])
  //     const { polygon, centroid } = borders.generate_polygon(points, concavity)
  //     tag_data.push({
  //       "label": sub_cluster_label,
  //       "centroid": centroid
  //     })
  //   })
  //   const border_tag_group = centerArea.select("g.article-border-tag-group")
  //   border_tag_group.selectAll("text.sub-cluster-label")
  //     .data(tag_data, (d: any) => d.label)
  //     .join('text')
  //     .attr("class", "sub-cluster-label")
  //     .text(d => article_graph.hierarchical_topics[d.label])
  //     .attr("x", d => d.centroid[0])
  //     .attr("y", d => d.centroid[1])
  //     .attr("font-size", "0.8rem")
  //     .attr("text-anchor", "middle")
  //     .attr("pointer-events", "none")
  //     .call(wrap, 150)
  // }


  return (
    <>
      <div className="event-cluster-container flex flex-col items-stretch h-full flex-auto">
        <div className='event-cluster-header'>
          Event Cluster
        </div>
        <div className="svg-container flex overflow-hidden"> 
            <svg id={svgId} className='event-cluster-svg'> 
              <defs>
              {/* border shadow filter */}
                <filter id="drop-shadow-border" x="-10%" y="-10%" width="120%" height="120%">
                    <feOffset result="offOut" in="SourceAlpha" dx="0" dy="0" />
                    <feGaussianBlur result="blurOut" in="offOut" stdDeviation="3" />
                    <feBlend in="SourceGraphic" in2="blurOut" mode="normal" flood-color="rgba(0, 0, 0, 0.8)" />
                </filter>
              </defs>
            </svg>
        </div>
      </div>
    </>
  )
}

export default ClusterOverview
