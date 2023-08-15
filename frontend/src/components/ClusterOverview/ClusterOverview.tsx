import * as d3 from "d3"
import { useState, useMemo, useEffect } from 'react'
import { usePrevious } from "@uidotdev/usehooks";

import "./ClusterOverview.css"
import { t_EntityNode, t_EventHGraph, t_ArticleNode, tooltipContent } from "../../types";
import borders from "./BorderUtils";
import spacing from "./SpacingUtils";
import sfc from "./SFCUtils"
import * as DragUtils from "./DragUtils"

interface ClusterOverviewProps {
  svgId: string
  graph: t_EventHGraph
  highlightNodeIds: string[]
  peripheral: any
  onNodesSelected: (node_ids: string[]) => void
  onClusterClicked: (cluster_label: string, clusters: any) => void
  brushMode: boolean
  searchMode: boolean
  selectionMode: boolean
  selectedClusters: string[]
  mergedClusters: any[]
  gosper: any[]
}

function ClusterOverview({
  svgId, 
  graph, 
  highlightNodeIds, 
  peripheral,
  onNodesSelected, 
  onClusterClicked, 
  brushMode, 
  searchMode,
  selectionMode,
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
    top: 250,
    left: 250,
    right: 250,
    bottom: 280
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

  // scales & constants
  const article_node_radius = 4.5
  const entity_node_radius = 4
  const articleClusterColorScale = d3.scaleOrdinal(d3.schemeTableau10)
  const articleSubClusterColorScale = d3.scaleOrdinal(d3.schemeSet3)
  const entityClusterColorScale = d3.scaleOrdinal(d3.schemeSet2)

  const [previousEntityClusterColorDict, setPreviousEntityClusterColorDict] = useState<any>(undefined)
  const [previousEntitySubClusterColorDict, setPreviousEntitySubClusterColorDict] = useState<any>(undefined)
  const [previousClusterColorDict, setPreviousClusterColorDict] = useState<any>(undefined)
  const [previousSubClusterColorDict, setPreviousSubClusterColorDict] = useState<any>(undefined)
  const [tooltipData, setTooltipData] = useState<tooltipContent>()
  
  const articleClusterColorDict = useMemo(() => {
    let cluster_color_dict = {}
    if(!graph) return cluster_color_dict
    Object.keys(graph.clusters).forEach(cluster_label => {
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
  }, [graph, mergedClusters])

  useEffect(() => {
    update_article_color()
  }, [articleClusterColorDict])

  const articleSubClusterColorDict = useMemo(() => {
    let sub_cluster_color_dict = {}
    if(!graph) return sub_cluster_color_dict
    Object.keys(graph.clusters).forEach(cluster_label => {
      const cluster_color = d3.hsl(articleClusterColorDict[cluster_label])
      const sub_clusters = graph.sub_clusters[cluster_label]
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
  }, [graph])

  const entityClusterColorDict = useMemo(() => {
    let cluster_color_dict = {}
    if(!graph) return cluster_color_dict
    Object.keys(graph.entity_clusters).forEach(cluster_label => {
      cluster_color_dict[cluster_label] = entityClusterColorScale(cluster_label)
      return

      if(previousEntityClusterColorDict && previousEntityClusterColorDict[cluster_label]) {
        cluster_color_dict[cluster_label] = previousClusterColorDict[cluster_label]
      } else if(previousEntitySubClusterColorDict && previousEntitySubClusterColorDict[cluster_label]) {
        cluster_color_dict[cluster_label] = previousEntitySubClusterColorDict[cluster_label]
      } else {
      }
    })
    setPreviousEntityClusterColorDict(cluster_color_dict)
    return cluster_color_dict
  }, [graph])
  
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
    const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
    const border_group = centerArea.select("g.article-border-group")
    border_group.selectAll("path.concave-hull")
      .on("mouseover", border_mouseover)
      .on("mouseout", border_mouseout)
      .call(bindDrag)
      .on("click", border_click)
    if(!selectionMode) {
      border_group.selectAll("path.concave-hull")
        .attr('stroke-width', 1)
    }
  }, [selectionMode, selectedClusters])

  useEffect(() => {
    update_highlight(highlightNodeIds, [])
  }, [highlightNodeIds])

  useEffect(() => {
    update_article_cluster()
    update_entity_cluster()
    // update_highlight(highlightNodeIds, [])
  }, [graph]);

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

    center_area.append("g").attr("class", "article-border-group")
    center_area.append("g").attr("class", "article-node-group")
    center_area.append("path").attr("class", "highlight-border")
    center_area.append("g").attr("class", "link-group")
    addBrush()
    sfc.initPeripheral(peripheral)
    sfc.initGosper(gosper)  
  }

  function update_article_color() {
    const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
    const article_node_group = centerArea.select("g.article-node-group")
    article_node_group.selectAll("circle.article-node")
      .attr("fill", (d: any) => d.cluster_color = articleClusterColorDict[d.cluster_label])
  }

  function update_article_cluster() {
    const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
    // sfc.generate_hilbert_coord(graph.article_nodes, graph.clusters, graph.cluster_order, centerAreaSize, 'center')
    sfc.generate_gosper_coord(graph.article_nodes, centerAreaSize)
    const t_delay = 1000
    const t_duration = 1000
    // articles 
    const article_node_group = centerArea.select("g.article-node-group")
    article_node_group.selectAll("circle.article-node")
      .data(graph.article_nodes, (d: any, i) => { d.i = i; return d.doc_id })
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
            .attr("opacity", 1)
            .attr("transform", "translate(0,0)")
            .selection(),
        update => update.transition().delay((d, i) => (d.update_cluster_order || 0)*t_delay).duration(t_duration)
            .attr("fill", (d: any) => d.cluster_color = articleClusterColorDict[d.cluster_label])
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            // .attr("opacity", 1)
            ,
      )
    // cluster borders
    const cluster_borders = generate_cluster_borders(
      graph.article_nodes, 
      graph.clusters, 
      graph.cluster_order, 
      graph.update_cluster_order,
      1.5, // concavity
      "rounded" // smoothing
      )
    const border_group = centerArea.select("g.article-border-group")
    const tooltipDiv = d3.select(".tooltip");
    border_group.selectAll("path.concave-hull")
      .data(cluster_borders, (d: any) => d.cluster_label)
      .join("path")
      .attr("class", "concave-hull")
      .attr("d", d => d.path)
      .attr("fill", "#e1e1e1")
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("cursor", "pointer")
      .attr("transform", "translate(0,0)")
      // .on("mousemove", (e) => {
      //   tooltipDiv.style("opacity", 0)
      // })
      .on("mouseover", border_mouseover)
      .on("mouseout", border_mouseout)
      .call(bindDrag)
      .on("click", border_click)
      // .on("click", (e, d) => onClusterClicked(d.cluster_label, graph.clusters))
      .filter((d: any) => d.update_cluster_order !== 0)
      .attr("opacity", 0)
      .transition().delay(d => d.update_cluster_order*t_delay).duration(t_duration)
      .attr("opacity", 1)
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
  
  const border_mouseover = function(e, d) {
    const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
    const tooltipDiv = d3.select(".tooltip");
    // highlight nodes in this cluster
    // const highlightNodeIds = graph.clusters[d.cluster_label]
    // update_highlight(highlightNodeIds, [d.cluster_label], 'id')

    // show connected entities
    // show_connected_entities(d.cluster_label)
    if(!selectionMode) {
      centerArea.selectAll("circle.article-node").filter((node: any) => node.cluster_label === d.cluster_label)
        .attr("fill", (d: any) => { 
          d.sub_cluster_color = articleSubClusterColorDict[d.sub_cluster_label]
          return d.sub_cluster_color;
        })
    } else {
      d3.select(this).attr("stroke-width", 4)
    }
    // tooltip
    const tooltip_coord = SVGToScreen(d.max_x+margin.left, d.min_y+margin.top)
    tooltipDiv
      .style("left", tooltip_coord.x + "px")
      .style("top", tooltip_coord.y + "px")
    setTooltipData({
      cluster_label: d.cluster_label,
      cluster_topic: graph.hierarchical_topics[d.cluster_label],
      sub_clusters: graph.sub_clusters[d.cluster_label].map(
        (sub_cluster_label: string) => {
          return {
            cluster_label: sub_cluster_label,
            cluster_topic: graph.hierarchical_topics[sub_cluster_label]
          }
        })
    })
    tooltipDiv.style("opacity", 0)
  }

  function border_mouseout(e, d) {
    const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
    const tooltipDiv = d3.select(".tooltip");
    // remove connected entities
    // canvas.select("g.entity-node-group").selectAll("circle.entity-node").attr("opacity", 0)
    // canvas.select("g.entity-border-group").selectAll("path").attr("opacity", 0)
    // canvas.select("g.link-group").selectAll("line.link").attr("opacity", 0)
    
    // reset hovered cluster color
    centerArea.selectAll("circle.article-node").filter((node: any) => node.cluster_label === d.cluster_label)
      .attr("fill", (d: any) => d.cluster_color = articleClusterColorDict[d.cluster_label])
    
    // hide tooltip
    tooltipDiv.style("opacity", 0)
    if(selectionMode) {
      if(selectedClusters.includes(d.cluster_label)) {
        d3.select(this).attr("stroke-width", 4)
      } else {
        d3.select(this).attr("stroke-width", 1)
      }
    }
  }

  function border_click(e, d) {
    if(!e.defaultPrevented) {
      console.log("on click")
      onClusterClicked(d.cluster_label, graph.clusters)
    }
  }

  function update_entity_cluster() {
    const canvas = d3.select('#' + svgId).select("g.margin")
    sfc.generate_entity_hilbert_coord(graph.entity_nodes, canvasSize)
    const t_delay = 1000
    const t_duration = 1000
    // entities 
    const entity_node_group = canvas.select("g.entity-node-group")
    entity_node_group.selectAll("circle.entity-node")
      .data(graph.entity_nodes, (d: any, i) => { d.i = i; return d.id })
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
            .attr("opacity", 1)
            .selection(),
        update => update.transition().delay((d, i) => (d.update_cluster_order || 0)*t_delay).duration(t_duration)
            .attr("fill", (d: any) => d.cluster_color = entityClusterColorDict[d.cluster_label])
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            // .attr("opacity", 1)
            ,
      )
    // cluster borders
    const cluster_borders = generate_cluster_borders(
      graph.entity_nodes,
      graph.entity_clusters, 
      graph.entity_cluster_order, graph.entity_update_cluster_order, 
      0.2,  // concavity
      'sketch' // smoothing
    )
    const border_group = canvas.select("g.entity-border-group")
    const tooltipDiv = d3.select(".tooltip");
    border_group.selectAll("path.concave-hull")
      .data(cluster_borders, (d: any) => d.cluster_label)
      .join("path")
      .attr("class", "concave-hull")
      .attr("d", d => d.path)
      .attr("fill", "#e1e1e1")
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("cursor", "pointer")
  }


  // function show_connected_entities(article_cluster_label) {
  //   const canvas = d3.select('#' + svgId).select("g.margin")
  //   const cluster_entity_ids: string[] = graph.article_cluster_linked_entities[article_cluster_label].map(entity => entity.id)
  //   const cluster_entities: t_EntityNode[] = graph.entity_nodes.filter(entity => cluster_entity_ids.includes(entity.id))

  //   let filtered_clusters = {}
  //   Object.keys(graph.entity_clusters).forEach(cluster_label => {
  //     const filtered_entities = graph.entity_clusters[cluster_label].filter(entity_id => cluster_entity_ids.includes(entity_id))
  //     if(filtered_entities.length > 0) {
  //       filtered_clusters[cluster_label] = filtered_entities
  //     }
  //   })
  //   const filtered_cluster_order = graph.entity_cluster_order.filter(cluster_label => Object.keys(filtered_clusters).includes(cluster_label))
  //   const cluster_article_ids = graph.clusters[article_cluster_label]
  //   const cluster_articles = graph.article_nodes.filter(article => cluster_article_ids.includes(article.id))
  //   generate_entity_hilbert_coord(cluster_entities, filtered_clusters, filtered_cluster_order, cluster_articles)

  //   const t_delay = 1000
  //   const t_duration = 1000
  //   // entities 
  //   const entity_node_group = canvas.select("g.entity-node-group")
  //   entity_node_group.selectAll("circle.entity-node")
  //     .data(cluster_entities, (d: any, i) => { d.i = i; return d.id })
  //     .join(
  //       enter => enter.append("circle")
  //           .attr("class", "entity-node")
  //           .attr("r", node_radius)
  //           .attr("stroke", "black")
  //           .attr("stroke-width", 1)
  //           .attr("fill", (d: any) => d.cluster_color = entityClusterColorDict[d.cluster_label])
  //           .attr("pointer-events", "none")
  //           .attr("opacity", 1)
  //           .attr("cx", (d: any) => d.x)
  //           .attr("cy", (d: any) => d.y)
  //           .selection(),
  //       // update => update.transition().delay((d, i) => (d.update_cluster_order || 0)*t_delay).duration(t_duration)
  //       update => update
  //           .attr("fill", (d: any) => d.cluster_color = entityClusterColorDict[d.cluster_label])
  //           .attr("cx", (d: any) => d.x)
  //           .attr("cy", (d: any) => d.y)
  //           .attr("opacity", 1)
  //           ,
  //     )
  //   // cluster borders
  //   const cluster_borders = generate_cluster_borders(cluster_entities, filtered_clusters, filtered_cluster_order, graph.entity_update_cluster_order)
  //   const border_group = canvas.select("g.entity-border-group")
  //   border_group.selectAll("path.concave-hull")
  //     .data(cluster_borders, (d: any) => d.cluster_label)
  //     .join("path")
  //     .attr("class", "concave-hull")
  //     .attr("d", d => d.path)
  //     .attr("fill", "#e1e1e1")
  //     .attr("stroke", "black")
  //     .attr("stroke-width", 1)
  //     .attr("cursor", "pointer")
  //     .attr("pointer-events", 'none')
  //     .attr("opacity", 1)
    
  //   // links
  //   const entity_links = graph.links.filter(link => 
  //     (cluster_entity_ids.includes(link.source) && cluster_article_ids.includes(link.target))
  //     || (cluster_entity_ids.includes(link.target)) && cluster_article_ids.includes(link.source))
  //   const link_data = generate_link_data(entity_links, cluster_entities, cluster_articles)
  //   const link_group = canvas.select("g.link-group")
  //     .selectAll("line.link")
  //     .data(link_data)
  //     .join("line")
  //       .attr("class", "link")
  //       .attr("stroke", (d: any) => d.color || "black")
  //       .attr("stroke-width", 1)
  //       .attr("opacity", 0.2)
  //       .attr("x1", (d: any) => d.source.x)
  //       .attr("y1", (d: any) => d.source.y)
  //       .attr("x2", (d: any) => d.target.x)
  //       .attr("y2", (d: any) => d.target.y)
  //       .attr("pointer-events", "none")
  // }

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
      .attr("stroke-width", 1)
      .attr("opacity", 1)
    const article_borders = canvas.select("g.article-border-group")
      .selectAll("path")
      .attr("opacity", 1)
    
  }

  function update_highlight(highlightNodeIds, highlightClusters, attr='doc_id') {
    const canvas = d3.select('#' + svgId).select("g.margin")
    const article_node_group = canvas.select("g.article-node-group")
    if(highlightNodeIds.length === 0) {
      if(searchMode) {
        article_node_group.selectAll("circle.article-node")
          .attr("stroke-width", 1)
          .attr("opacity", 0.5)
          return
      } else {
        article_node_group.selectAll("circle.article-node")
          .attr("stroke-width", 1)
          .attr("opacity", 1)
          return
      }
    }
    // set normal nodes to background
    article_node_group.selectAll("circle.article-node")
      .attr("stroke-width", 1)
      .attr("opacity", 0.5)

    // update highlighted nodes 
    article_node_group.selectAll("circle.article-node")
      .filter((node: any) => highlightNodeIds.includes(node[attr]))
      .attr("stroke-width", 2)
      .attr("opacity", 1)

    // const article_borders = canvas.select("g.article-border-group")
    //   .selectAll("path")
    // article_borders.attr("opacity", 0.1)
    // article_borders.filter((node: any) => highlightClusters.includes(node[attr]))
    //   .attr("opacity", 1)


    // highlight article borders
    // const highlight_hyperedge_nodes = graph.hyperedge_nodes.filter(node => highlightNodeIds.includes(node.doc_id))
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

      const {path, max_x, min_y} = borders.generate_border(nodes_data, concavity, smoothing)
      border_paths.push({
        "cluster_label": cluster_label,
        "cluster_order": cluster_order.indexOf(cluster_label),
        "update_cluster_order": update_cluster_order[cluster_label],
        "path": path,
        "max_x": max_x,
        "min_y": min_y,
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
            <svg id={svgId} className='event-cluster-svg'> </svg>
        </div>
        <div className='tooltip absolute opacity-0 border-2 bg-gray-100 p-0.5 pointer-events-none z-50'>
          { tooltipData &&
            <div className='flex flex-col'>
              <p className='flex items-center w-fit'>
                <span className='mr-2'> Topic: </span>
                <svg width='10' height='10'><rect width='10' height='10' x='0' y='0' fill={articleClusterColorDict[tooltipData.cluster_label]}></rect></svg>
                <span className='ml-2'> { tooltipData.cluster_topic } </span>
              </p>
              {/* <p className='w-fit' style={{ background: 'blue' }}> Topic: { tooltipData.cluster_topic } </p> */}
              <ul className='w-fit list-disc list-inside'> 
                <p className='w-fit'> Sub-topics: </p>
                { tooltipData.sub_clusters.map(sub_cluster => 
                  <li className='flex items-center w-fit pl-1'> 
                    <svg width='10' height='10'><rect width='10' height='10' x='0' y='0' fill={articleSubClusterColorDict[sub_cluster.cluster_label]}></rect></svg>
                    <span className='ml-2'> { sub_cluster.cluster_topic } </span>
                  </li> 
                  )
                }
              </ul>
            </div>
          }
        </div>
      </div>
    </>
  )
}

export default ClusterOverview
