import { useState, useMemo, useEffect } from 'react'
import { usePrevious } from "@uidotdev/usehooks";

import "./ClusterOverview.css"
import { t_EntityNode, t_EventHGraph, t_ArticleNode, tooltipContent, d_ArticleGraph, d_EntityGraph } from "../../types";
import borders from "./BorderUtils";
import spacing from "./SpacingUtils";
import zoom from "./ZoomUtils";
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
  showEntityClusterLabelDefault: boolean,
  showArticleClusterLabelDefault: boolean,
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
  showEntityClusterLabelDefault,
  showArticleClusterLabelDefault,
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
  const centerAreaPadding = {
    top: 20,
    left: 20,
    right: 20,
    bottom: 20
  }
  
  const svgSize = useMemo(() => {
    const width = window.innerWidth
    const height = window.innerHeight*2
    return { width, height }
  }, [])

  const canvasSize = useMemo(() => { 
    return {
      width: svgSize.width - margin.left - margin.right,
      height: svgSize.height - margin.top - margin.bottom,
    }
  }, [])

  const centerAreaSize = useMemo(() => {
    return {
      outer_width: svgSize.width - margin.left - margin.right - centerAreaOffset.left - centerAreaOffset.right,
      outer_height: svgSize.height - margin.top - margin.bottom - centerAreaOffset.top - centerAreaOffset.bottom,
      width: svgSize.width - margin.left - margin.right - centerAreaOffset.left - centerAreaOffset.right - centerAreaPadding.left - centerAreaPadding.right,
      height: svgSize.height - margin.top - margin.bottom - centerAreaOffset.top - centerAreaOffset.bottom - centerAreaPadding.top - centerAreaPadding.bottom,
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
  // const [hoveredArticleCluster, setHoveredArticleCluster] = useState<any>("")
  const [articleClusterBorderPoints, setArticleClusterBorderPoints] = useState<any>({})
  const [clickedClusters, setClickedClusters] = useState<any[]>([])
  const [clickedCluster, setClickedCluster] = useState<any>(undefined)
  function addClickedCluster(cluster_label) {
    setClickedClusters([...clickedClusters, cluster_label])
  }
  function removeClickedCluster(cluster_label) {
    setClickedClusters(clickedClusters.filter(c => c !== cluster_label))
  }

  // entities
  const [hoveredEntityCluster, setHoveredEntityCluster] = useState<string>("")
  

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
    console.log({showArticleClusterLabelDefault})
    // rebind selected clusters
    const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
    const border_group = centerArea.select("g.article-border-group")
    if(showArticleClusterLabelDefault) centerArea.selectAll("g.article-border-tag-group").attr("opacity", 1)
    if(!showArticleClusterLabelDefault)centerArea.selectAll("g.article-border-tag-group").attr("opacity", 0)
    border_group.selectAll("path.concave-hull")
      .on("mouseover", article_border_handlers.mouseover)
      .on("mouseout", article_border_handlers.mouseout)
      // .call(bindDrag)
      .on("click", article_border_handlers.click)
  }, [showArticleClusterLabelDefault, searchMode, highlightNodeIds, articleClusterBorderPoints, clickedClusters, clickedCluster])

  useEffect(() => {
    const canvas = d3.select('#' + svgId).select("g.margin")
    if(showEntityClusterLabelDefault) canvas.selectAll("g.entity-border-tag-group").attr("opacity", 1)
    if(!showEntityClusterLabelDefault) canvas.selectAll("g.entity-border-tag-group").attr("opacity", 0)
    const border_group = canvas.select("g.entity-border-group")
    border_group.selectAll("path.concave-hull")
      .on("mouseover", entity_border_handlers.mouseover)
      .on("mouseout", entity_border_handlers.mouseout)
      .on("click", entity_border_handlers.click)
  }, [showEntityClusterLabelDefault, clickedCluster])


  useEffect(() => {
    update_highlight(highlightNodeIds, [])
  }, [highlightNodeIds])

  useEffect(() => {
    update_entity_cluster()
  }, [entity_graph.entity_nodes]);

  useEffect(() => {
    update_article_cluster()
  }, [article_graph.article_nodes])

  useEffect(() => {
    zoom.setProps(undefined, undefined, undefined, articleClusterBorderPoints)
  }, [articleClusterBorderPoints])


  function init() {
    const svg = d3.select('#' + svgId)
      .attr("viewBox", `0 0 ${svgSize.width} ${svgSize.height}`)
      .attr("overflow", "visible")
    svg.select("g.margin").remove()
    const canvas = svg.append("g")
      .attr("class", "margin")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    canvas.append("g").attr("class", "entity-border-group")
    canvas.append("g").attr("class", "entity-node-group")

    const center_area_svg = canvas.append("svg")
      .attr("class", "center-area-svg")
      .attr("width", centerAreaSize.outer_width)
      .attr("height", centerAreaSize.outer_height)
      .attr("transform", "translate(" + centerAreaOffset.left + "," + centerAreaOffset.top + ")")
    const center_area = center_area_svg.append("g")
      .attr("class", "center-area")
      .attr("transform", "translate(" + centerAreaPadding.left + "," + centerAreaPadding.top + ")")

    center_area.append("rect").attr("class", "center-area-background")
      .attr("x", -centerAreaPadding.left+4)
      .attr("y", -centerAreaPadding.right+4)
      // .attr("width", centerAreaSize.width)
      // .attr("height", centerAreaSize.height)
      .attr("width", centerAreaSize.outer_width-8)
      .attr("height", centerAreaSize.outer_height-8)
      .attr("stroke-width", "1px")
      .attr("stroke", "grey")
      .attr("rx", "5%")
      .attr("fill", "#e8e8e8")
      .attr("opacity", 0.2)
      .attr("filter", "url(#drop-shadow-border)")
      .attr("pointer-events", "none")

    center_area.append("g").attr("class", "article-border-group")
    center_area.append("g").attr("class", "article-node-group")
    // center_area.append("g").attr("class", "article-border-tag-group")
    center_area.append("path").attr("class", "highlight-border")
    center_area.append("g").attr("class", "link-group")
    addBrush()
    sfc.initPeripheral(peripheral)
    sfc.initGosper(gosper)  
    // listenKeyDown()
    listenZoom()
    setTooltipData(initialTooltipData)
  }

  function listenZoom() {
    zoom.resetZoom()
    zoom.setProps(
      svgId,
      articleClusterBorderPoints,
      article_graph,
      articleSubClusterColorDict
    )
    const svg = d3.select('#' + svgId)
      .call(zoom)
  }

  // function listenKeyDown() {
  //   d3.select("body").on("keydown", function(e) {
  //     if(hoveredArticleCluster && (e.keyCode === 224 || e.keyCode === 17)) {
  //       console.log("ctrl key down", hoveredArticleCluster)
  //       const d = hoveredArticleCluster
  //       tags.updateArticleSubClusterLabels(
  //         svgId,
  //         articleClusterBorderPoints[d.cluster_label],
  //         article_graph,
  //         d.cluster_label, 
  //         article_graph.sub_clusters[d.cluster_label],
  //         articleSubClusterColorDict,
  //         1.5
  //       )
  //       tags.liftArticleClusterLabel(svgId, d)

  //       // update border color
  //       d3.selectAll("path.concave-hull").filter((d: any) => d.cluster_label === hoveredArticleCluster.cluster_label)
  //         .attr("stroke-width", 4)
  //         .attr("stroke", articleClusterColorDict[d.cluster_label])
  //     }
  //   })
  // }

  function update_article_color() {
    const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
    const article_node_group = centerArea.select("g.article-node-group")
    article_node_group.selectAll("circle.article-node")
      .attr("fill", (d: any) => d.cluster_color = articleClusterColorDict[d.cluster_label])
  }

  function update_article_cluster() {
    const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
    // coords
    sfc.generate_gosper_coord(article_graph.article_nodes, centerAreaSize)

    // articles nodes
    const t_delay = 100
    const t_duration = 1500
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
            .attr("fill", (d: any) => {
              d.cluster_color = articleClusterColorDict[d.cluster_label]
              if(clickedClusters.includes(d.cluster_label)) {
                d.sub_cluster_color = articleSubClusterColorDict[d.sub_cluster_label]
                return d.sub_cluster_color;
              } else {
                return d.cluster_color
              }
            })
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

    let tmp_dict = {}
    cluster_borders.forEach(border => {
      tmp_dict[border.cluster_label] = border.points
    })
    setArticleClusterBorderPoints(tmp_dict)

    // cluster label
    tags.addArticleClusterLabel(svgId, cluster_borders, article_graph.hierarchical_topics, articleClusterColorDict, showArticleClusterLabelDefault)

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
    // sub clusters
    border_group.selectAll("path.concave-hull")
        .each(function(d: any) {
          if(clickedClusters.includes(d.cluster_label)) {
            tags.removeSubClusterLabels(svgId)
            tags.restoreLiftedArticleClusterLabel(svgId, d)
            showSubClusterStructure(undefined, d)
          }
        })

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
      d3.select(this).attr("stroke-width", 4)
        .attr("stroke", articleClusterColorDict[d.cluster_label])
        .attr("opacity", 1)
        .attr("filter", "url(#drop-shadow-border)")
      d3.selectAll("rect.cluster-label-border")
        .filter((rect_data: any) => d.cluster_label === rect_data.cluster_label)
        .attr("stroke-width", 10)
        .attr("opacity", 1)
      d3.selectAll("g.article-border-tag-group")
        .filter((tag_data: any) => d.cluster_label === tag_data.cluster_label)
        .attr("opacity", 1)
    },

    mouseout: function(e, d) {
      if(clickedClusters.includes(d.cluster_label)) return
      d3.select(this).attr("stroke-width", 1)
        .attr("stroke", "black")
        .attr("opacity", 0.5)
        .attr("filter", "none")
      d3.selectAll("rect.cluster-label-border")
        .attr("stroke-width", 3)
        .attr("opacity", 0.5)
      d3.selectAll("g.article-border-tag-group")
        .attr("opacity", showArticleClusterLabelDefault? 1 : 0)
        .filter((tag_data: any) => clickedCluster.cluster_label === tag_data.cluster_label)
        .attr("opacity", 1)
    },

    click: function(e, d) {
      const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
      if(!e.defaultPrevented) {
        // remove sub cluster labels
        if(e.ctrlKey || e.metaKey) {
          // reset highlight
          if(clickedCluster !== undefined) {
            if(clickedCluster.cluster_label === d.cluster_label) {
              tags.removeSubClusterLabels(svgId)
              const tag_border_connector = centerArea.select("line.cluster-label-border-connector").remove()
              const target_border_group = centerArea.selectAll("g.article-border-tag-group")
                .select("g.cluster-label-group")
                .filter((filter_data: any) => clickedCluster.cluster_label === filter_data.cluster_label)
                .remove()
            } else {
              hideSubClusterStructure(e, clickedCluster)
            }
          }
          onArticleClusterClicked(e, d.cluster_label, article_graph.clusters)
          setClickedCluster(undefined)
        } else {
          // if clicking on a highlighted cluster, un-highlight it
          if(clickedCluster && clickedCluster.cluster_label === d.cluster_label) {
            setClickedCluster(undefined)
            hideSubClusterStructure(e, clickedCluster)
          } else { // highlight clicked cluster
            if(clickedCluster) hideSubClusterStructure(e, clickedCluster)
            setClickedCluster(d)
            showSubClusterStructure(e, d)
          }
          // if(clickedClusters.includes(d.cluster_label)) {
          //   removeClickedCluster(d.cluster_label)
          //   hideSubClusterStructure(e, d)
          // } else {
          //   setClickedClusters([d.cluster_label])
          //   showSubClusterStructure(e, d)
          // }
        }
      }
    },
    sub_cluster: {
      mouseover: function(e, d) {
        // nodes
        d3.selectAll("circle.article-node")
          .attr("opacity", 0.3)
          .filter((node: any) => node.sub_cluster_label === d.sub_cluster_label)
          .attr("opacity", 1)
        // border
        d3.selectAll("path.sub-cluster-border")
          .attr("opacity", 0.5)
        d3.select(this).attr("opacity", 1)
          .attr("stroke-width", 4)
        // tags
        d3.selectAll("g.sub-cluster-label-group")
          .attr("opacity", 0.5)
          .filter((tag_data: any) => tag_data.label === d.sub_cluster_label)
          .attr("opacity", 1)
          .select("rect.sub-cluster-label-border")
          .attr("stroke-width", 6)
          
      },
      mouseout: function(e, d) {
        // nodes
        d3.selectAll("circle.article-node")
          .attr("opacity", 0.5)
        // border
        d3.select(this).attr("opacity", 0)
          .attr("stroke-width", 1)
        //tags
        d3.selectAll("g.sub-cluster-label-group")
          .attr("opacity", 1)
          .selectAll("rect.sub-cluster-label-border")
          .attr("stroke-width", 2)

      }
    }
  }

  const entity_border_handlers = {
    mouseover: function(e, d) {
      const canvas = d3.select('#' + svgId).select("g.margin")
      // highlight nodes
      canvas.selectAll("circle.entity-node")
        .filter((node: any) => node.cluster_label === d.cluster_label)
        .attr("fill", (d: any) => { 
          d.sub_cluster_color = entitySubClusterColorDict[d.sub_cluster_label]
          return d.sub_cluster_color;
        })
        .attr("opacity", clickedCluster? 0.5 : 1)
      if(clickedCluster) {
        show_connected_entities(clickedCluster.cluster_label)
      }
      // highlight border
      d3.select(this).attr("stroke-width", 4)
        .attr("stroke", entityClusterColorDict[d.cluster_label])
        .attr("opacity", 1)
        .attr("filter", "url(#drop-shadow-border)")
      const hovered_entity_tag = canvas.selectAll("g.entity-border-tag-group")
        .filter((rect_data: any) => d.cluster_label === rect_data.cluster_label)
        .attr("opacity", 1)
      hovered_entity_tag.select("rect.entity-cluster-label-border")
        .attr("stroke-width", 10)
        .attr("opacity", 1)
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
      // reset hovered cluster color
      canvas.selectAll("circle.entity-node")
        .filter((node: any) => node.cluster_label === d.cluster_label)
        .attr("fill", (d: any) => d.cluster_color = entityClusterColorDict[d.cluster_label])
        .attr("opacity", 0.5)
      if(clickedCluster) {
        show_connected_entities(clickedCluster.cluster_label)
      }
      // border
      d3.select(this).attr("stroke-width", 1)
        .attr("stroke", "black")
        .attr("opacity", 0.5)
      canvas.selectAll("g.entity-border-tag-group")
        .attr("opacity", showEntityClusterLabelDefault? 1 : 0)
      canvas.selectAll("rect.entity-cluster-label-border")
        .attr("stroke-width", 3)
        .attr("opacity", 0.5)
      setHoveredEntityCluster("")
      
      // hide tooltip
      // tooltipDiv.style("opacity", 0)
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

    // cluster label
    tags.addEntityClusterLabel(svgId, cluster_borders, entity_graph.entity_hierarchical_topics, entityClusterColorDict, showEntityClusterLabelDefault)
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
  }

  function showSubClusterStructure(e, d) {
      const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
      // update sub-cluster labels
      tags.updateArticleSubClusterLabels(
        svgId,
        articleClusterBorderPoints[d.cluster_label],
        article_graph,
        d.cluster_label, 
        article_graph.sub_clusters[d.cluster_label],
        articleSubClusterColorDict,
        1.5
      )
      tags.liftArticleClusterLabel(svgId, d)

      // update border color
      d3.select(this).attr("stroke-width", 4)
        .attr("stroke", articleClusterColorDict[d.cluster_label])
        .attr("opacity", 1)
        .attr("filter", "url(#drop-shadow-border)")
      // const sub_cluster_borders = generate_sub_cluster_borders(
      //   article_graph.article_nodes,
      //   article_graph.sub_clusters[d.cluster_label],
      //   1.5,
      //   "rounded"
      // )
      // centerArea.select("g.article-border-group")
      //   .selectAll("path.sub-cluster-border")
      //   .data(sub_cluster_borders, (d: any) => d.sub_cluster_label)
      //   .join("path")
      //   .attr("class", "sub-cluster-border")
      //   .attr("d", dpath => dpath.path)
      //   .attr("fill", "#e1e1e1")
      //   .attr("stroke", (dpath: any) => articleSubClusterColorDict[dpath.sub_cluster_label])
      //   .attr("stroke-width", 1)
      //   .attr("transform", "translate(0,0)")
      //   .attr("opacity", 0)
        // .on("mouseover", article_border_handlers.sub_cluster.mouseover)
        // .on("mouseout", article_border_handlers.sub_cluster.mouseout)

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

      // setHoveredArticleCluster(d)
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
  }

  function hideSubClusterStructure(e, d) {
      const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
      const tooltipDiv = d3.select(".tooltip");

      // remove sub-cluster labels
      tags.removeSubClusterLabels(svgId)
      tags.restoreLiftedArticleClusterLabel(svgId, d)

      // remove connected entities
      remove_connected_entities(d.cluster_label)
      
      d3.select(this).attr("stroke-width", 1)
        .attr("stroke", "black")
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
      // setHoveredArticleCluster(undefined)
      
      // hide tooltip
      setTooltipData(initialTooltipData)
  }

  function generate_cluster_borders(nodes, clusters, cluster_order, update_cluster_order, concavity=0.2, smoothing='rounded') {
    let border_paths: any[] = []
    Object.keys(clusters).forEach(cluster_label => {
      const cluster_node_ids = clusters[cluster_label]
      const nodes_data = nodes.filter(node => cluster_node_ids.includes(node.id))
      // if(nodes_data.length === 0) return

      const {polygon, path, centroid, max_x, min_y} = borders.generate_border(nodes_data, concavity, smoothing)
      border_paths.push({
        "cluster_label": cluster_label,
        "cluster_order": cluster_order.indexOf(cluster_label),
        "update_cluster_order": update_cluster_order[cluster_label],
        "points": polygon,
        "path": path,
        "max_x": max_x,
        "min_y": min_y,
        "centroid": centroid,
      })
    })
    return border_paths
  }

  function generate_sub_cluster_borders(nodes, sub_clusters, concavity=0.2, smoothing='rounded') {
    let border_paths: any[] = []
    sub_clusters.forEach(sub_cluster_label => {
      const sub_cluster_nodes = nodes.filter(node => node.sub_cluster_label === sub_cluster_label)
      const {polygon, path, centroid, max_x, min_y} = borders.generate_border(sub_cluster_nodes, concavity, smoothing)
      border_paths.push({
        "sub_cluster_label": sub_cluster_label,
        "points": polygon,
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
                    <feBlend in="SourceGraphic" in2="blurOut" mode="normal" floodColor="rgba(0, 0, 0, 0.8)" />
                </filter>
              </defs>
            </svg>
        </div>
      </div>
    </>
  )
}

export default ClusterOverview
