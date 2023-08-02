import * as d3 from "d3"
import { useState, useMemo, useEffect } from 'react'
import { usePrevious } from "@uidotdev/usehooks";

import d3Hilbert from 'd3-hilbert';
import "./ClusterOverview.css"
import { t_EntityNode, t_EventHGraph, t_HyperedgeNode, tooltipContent } from "../../types.ts"
import concaveman from "concaveman"

interface ClusterOverviewProps {
  svgId: string
  graph: t_EventHGraph
  highlightNodeIds: string[]
  onNodesSelected: (node_ids: string[]) => void
  onClusterClicked: (cluster_label: string, clusters: any) => void
  brushMode: boolean
  searchMode: boolean
}

function ClusterOverview({
  svgId, 
  graph, 
  highlightNodeIds, 
  onNodesSelected, 
  onClusterClicked, 
  brushMode, 
  searchMode}: ClusterOverviewProps) {
  const margin = {
      left: 30,
      right: 0,
      top: 30,
      bottom: 0
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

  // scales & constants
  const node_radius = 5.5
  // const clusterColorScale = d3.scaleOrdinal(d3.schemeCategory10)
  // const clusterColorScale = d3.scaleOrdinal(d3.schemeAccent)
  const articleClusterColorScale = d3.scaleOrdinal(d3.schemeTableau10)
  const articleSubClusterColorScale = d3.scaleOrdinal(d3.schemeSet3)
  const entityClusterColorScale = d3.scaleOrdinal(d3.schemeTableau10)

  const [previousClusterColorDict, setPreviousClusterColorDict] = useState<any>(undefined)
  const [previousSubClusterColorDict, setPreviousSubClusterColorDict] = useState<any>(undefined)
  const [tooltipData, setTooltipData] = useState<tooltipContent>()
  
  const articleClusterColorDict = useMemo(() => {
    let cluster_color_dict = {}
    Object.keys(graph.clusters).forEach(cluster_label => {
      if(previousClusterColorDict && previousClusterColorDict[cluster_label]) {
        cluster_color_dict[cluster_label] = previousClusterColorDict[cluster_label]
      } else if(previousSubClusterColorDict && previousSubClusterColorDict[cluster_label]) {
        cluster_color_dict[cluster_label] = previousSubClusterColorDict[cluster_label]
      } else {
        cluster_color_dict[cluster_label] = articleClusterColorScale(cluster_label)
      }
    })
    setPreviousClusterColorDict(cluster_color_dict)
    return cluster_color_dict
  }, [graph])

  const articleSubClusterColorDict = useMemo(() => {
    let sub_cluster_color_dict = {}
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

  // const entityClusterColorDict = useMemo(() => {
  //   let cluster_color_dict = {}
  //   Object.keys(graph.entity_clusters).forEach(cluster_label => {
  //     if(previousClusterColorDict && previousClusterColorDict[cluster_label]) {
  //       cluster_color_dict[cluster_label] = previousClusterColorDict[cluster_label]
  //     } else if(previousSubClusterColorDict && previousSubClusterColorDict[cluster_label]) {
  //       cluster_color_dict[cluster_label] = previousSubClusterColorDict[cluster_label]
  //     } else {
  //       cluster_color_dict[cluster_label] = entityClusterColorScale(cluster_label)
  //     }
  //   })
  //   setPreviousClusterColorDict(cluster_color_dict)
  //   return cluster_color_dict
  // }, [graph])

  function evenGaps(clusters, cluster_order, total_volume, total_cluster_gap) {
    total_volume = 2*total_volume - clusters[cluster_order[0]].length - clusters[cluster_order[cluster_order.length-1]].length
    let gaps: number[] = [0]
    let accumulative_gap = 0
    // generate cluster gaps
    for(let i = 0; i < cluster_order.length-1; i++) {
      const cluster1 = cluster_order[i]
      const cluster2 = cluster_order[i+1]
      const cluster1_volume = clusters[cluster1].length
      const cluster2_volume = clusters[cluster2].length
      const volume_ratio = (cluster1_volume + cluster2_volume) / total_volume
      const gap_num = total_cluster_gap * volume_ratio
      accumulative_gap += Math.round(gap_num)
      gaps.push(accumulative_gap)
    }
    return gaps
  }

  function centerGaps(clusters, cluster_order, total_volume, total_cluster_gap, padding) {
    total_volume = 2*total_volume
    const remain_cluster_gap = total_cluster_gap - padding
    let gaps: number[] = [padding / 2]
    let accumulative_gap = 0
    for(let i = 0; i < cluster_order.length-1; i++) {
      const cluster1 = cluster_order[i]
      const cluster2 = cluster_order[i+1]
      const cluster1_volume = clusters[cluster1].length
      const cluster2_volume = clusters[cluster2].length
      const volume_ratio = (cluster1_volume + cluster2_volume) / total_volume
      const gap_num = remain_cluster_gap * volume_ratio
      accumulative_gap += Math.round(gap_num)
      gaps.push(accumulative_gap)
    }
    return gaps
  }


  function generate_entity_hilbert_coord(nodes, clusters, cluster_order, articles) {
    let node_dict = {}
    nodes.forEach(node => { node_dict[node.id] = node })
    const hilbert_order = Math.ceil(Math.log(7546) / Math.log(4))+0 // log_4(nodes.length)
    const hilbert = d3Hilbert().order(hilbert_order)
    const grid_length = Math.pow(2, hilbert_order)
    const cell_width = canvasSize.width / grid_length
    const cell_height = canvasSize.height / grid_length
    const total_cluster_gap = Math.pow(4, hilbert_order) - 1 - nodes.length - articles.length
    // const total_volume = 2*(nodes.length + articles.length) - clusters[cluster_order[0]].length - clusters[cluster_order[cluster_order.length-1]].length
    const total_volume = nodes.length + articles.length
    
    const padding = total_cluster_gap * 0.2
    const gaps = centerGaps(clusters, cluster_order, total_volume, total_cluster_gap, padding)
    console.log({articles})
    const articles_coord_start = Math.min(...articles.map(article => article.hilbert_order))
    console.log({articles_coord_start})
    // assign hilbert coord to nodes
    nodes.sort((a, b) => a.order - b.order)
    const node_coords = {}
    nodes.forEach((node, index) => {
        const renumbered_cluster_order = cluster_order.indexOf(node.cluster_label)
        let node_hilbert_order = Math.min(index + gaps[renumbered_cluster_order], Math.pow(4, hilbert_order) - 1)
        // console.log(node_hilbert_order, node_hilbert_order + articles.length, Math.pow(4, hilbert_order))
        if(node_hilbert_order >= articles_coord_start) {
          node_hilbert_order += articles.length + 100
        }
        const xy = hilbert.getXyAtVal(node_hilbert_order)
        node.x = cell_width * xy[0]
        node.y = cell_height * xy[1] 
        node.hilbert_order = node_hilbert_order
        // if(previousNodeDict[node.id] !== undefined)
        // if(previousNodeDict[node.id].x != node.x || previousNodeDict[node.id].y != node.y) {
        //   console.log("node moved", node.id, node.cluster_label, node.x, node.y, node.order, node_hilbert_order, previousNodeDict[node.id].x, previousNodeDict[node.id].y, previousNodeDict[node.id].order, previousNodeDict[node.id].hilbert_order)
        // }
        node_coords[node.id] = [node.x, node.y]
        // node_coords[node.id] = node
        node.cell_width = cell_width,
        node.cell_height = cell_height
        // node.radius = Math.min(cell_width, cell_height) / 2.8
    })

  }

  function generate_hilbert_coord(nodes, clusters, cluster_order, spacing='even') {
    // // hyperedge nodes
    // const hyperedge_nodes = graph.hyperedge_nodes
    // let hyperedge_dict = {}
    // graph.hyperedge_nodes.forEach(node => { hyperedge_dict[node.id] = node })
    let node_dict = {}
    nodes.forEach(node => { node_dict[node.id] = node })
    // let entity_node_dict = {}
    // graph.candidate_entity_nodes.forEach(node => { entity_node_dict[node.id] = node })
    // const hilbert_order = Math.ceil(Math.log(hyperedge_nodes.length) / Math.log(4))+0 // log_4(nodes.length)
    const hilbert_order = Math.ceil(Math.log(7546) / Math.log(4))+0 // log_4(nodes.length)
    const hilbert = d3Hilbert().order(hilbert_order)
    const grid_length = Math.pow(2, hilbert_order)
    const cell_width = canvasSize.width / grid_length
    const cell_height = canvasSize.height / grid_length
    const total_cluster_gap = Math.pow(4, hilbert_order) - 1 - nodes.length
    // const total_volume = 2*nodes.length - clusters[cluster_order[0]].length - clusters[cluster_order[cluster_order.length-1]].length
    const total_volume = nodes.length
    // const gaps = centerGaps(cluster_order, total_volume, total_cluster_gap)
    const padding = total_cluster_gap / nodes.length 
    console.log(padding, total_cluster_gap * 0.2, nodes.length, total_cluster_gap)
    const gaps = spacing === 'even' ? evenGaps(clusters, cluster_order, total_volume, total_cluster_gap) : centerGaps(clusters, cluster_order, total_volume, total_cluster_gap, padding)

    // assign hilbert coord to hyperedge nodes
    nodes.sort((a, b) => a.order - b.order)
    const node_coords = {}
    nodes.forEach((node, index) => {
        const node_hilbert_order = Math.min(index + gaps[node.cluster_order], Math.pow(4, hilbert_order) - 1)
        const xy = hilbert.getXyAtVal(node_hilbert_order)
        node.x = cell_width * xy[0]
        node.y = cell_height * xy[1] 
        node.hilbert_order = node_hilbert_order
        // if(previousNodeDict[node.id] !== undefined)
        // if(previousNodeDict[node.id].x != node.x || previousNodeDict[node.id].y != node.y) {
        //   console.log("node moved", node.id, node.cluster_label, node.x, node.y, node.order, node_hilbert_order, previousNodeDict[node.id].x, previousNodeDict[node.id].y, previousNodeDict[node.id].order, previousNodeDict[node.id].hilbert_order)
        // }
        node_coords[node.id] = [node.x, node.y]
        // node_coords[node.id] = node
        node.cell_width = cell_width,
        node.cell_height = cell_height
        // node.radius = Math.min(cell_width, cell_height) / 2.8
    })
    // setPreviousNodeDict(node_coords)
    // entity nodes
    // const entity_nodes = graph.candidate_entity_nodes
    // entity_nodes.forEach((node, i) => {
    //     const node_order = i * cluster_gap + Math.round(cluster_gap / 2)
    //     const xy = hilbert.getXyAtVal(node_order)
    //     node.x = cell_width * xy[0] * 2 - 1
    //     node.y = cell_height * xy[1] * 2 - 1
    //     node_coords[node.id] = [node.x, node.y]
    // })
    // graph.links.forEach(link => {
    //     const source_coords = node_coords[link.source]
    //     const target_coords = node_coords[link.target]
    //     link.source = {
    //         id: link.source,
    //         x: source_coords[0],
    //         y: source_coords[1]
    //       },
    //     link.target = {
    //         id: link.target,
    //         x: target_coords[0],
    //         y: target_coords[1]
    //     }
    //     const hyperedge_node = hyperedge_dict[link.source.id] || hyperedge_dict[link.target.id]
    //     const cluster_color = clusterColorScale(hyperedge_node.cluster_label)
    //     link.color = cluster_color
    // })
  }
  
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
    update_highlight(highlightNodeIds, [])
  }, [highlightNodeIds])

  useEffect(() => {
    update_hyperedge_cluster()
    // update_entity_cluster()
    update_highlight(highlightNodeIds, [])
  }, [graph]);

  function init() {
    const svg = d3.select('#' + svgId)
      .attr("viewBox", `0 0 ${svgSize.width} ${svgSize.height}`)
      .attr("overflow", "visible")
    const canvas = svg.append("g")
      .attr("class", "margin")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    canvas.append("g").attr("class", "article-border-group")
    canvas.append("g").attr("class", "hyperedge-node-group")
    canvas.append("g").attr("class", "entity-border-group")
    canvas.append("g").attr("class", "entity-node-group")
    canvas.append("path").attr("class", "highlight-border")
    canvas.append("g").attr("class", "link-group")
    addBrush()
  }

  function update_hyperedge_cluster() {
    const canvas = d3.select('#' + svgId).select("g.margin")
    // canvas.selectAll("circle.hyperedge-node").attr("opacity", 0)
    generate_hilbert_coord(graph.hyperedge_nodes, graph.clusters, graph.cluster_order, 'center')
    const t_delay = 1000
    const t_duration = 1000
    // hyperedges 
    const hyperedge_node_group = canvas.select("g.hyperedge-node-group")
    hyperedge_node_group.selectAll("circle.hyperedge-node")
      .data(graph.hyperedge_nodes, (d: any, i) => { d.i = i; return d.doc_id })
      .join(
        enter => enter.append("circle")
            .attr("class", "hyperedge-node")
            .attr("r", node_radius)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("fill", (d: any) => d.cluster_color = articleClusterColorDict[d.cluster_label])
            .attr("pointer-events", "none")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("opacity", 0)
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            .attr("opacity", 1)
            .selection(),
        update => update.transition().delay((d, i) => (d.update_cluster_order || 0)*t_delay).duration(t_duration)
            .attr("fill", (d: any) => d.cluster_color = articleClusterColorDict[d.cluster_label])
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            // .attr("opacity", 1)
            ,
      )
    // cluster borders
    const cluster_borders = generate_cluster_borders(graph.hyperedge_nodes, graph.clusters, graph.cluster_order, graph.update_cluster_order)
    const border_group = canvas.select("g.article-border-group")
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
      // .on("mousemove", (e) => {
      //   tooltipDiv.style("opacity", 0)
      // })
      .on("mouseover", function(e, d: any) {
        // highlight nodes in this cluster
        const highlightNodeIds = graph.clusters[d.cluster_label]
        update_highlight(highlightNodeIds, [d.cluster_label], 'id')

        // show connected entities
        // show_connected_entities(d.cluster_label)

        // tooltip
        const tooltip_coord = SVGToScreen(d.max_x, d.min_y)
        tooltipDiv
          .style("left", tooltip_coord.x  + 15 + "px")
          .style("top", tooltip_coord.y + 10 + "px")
        canvas.selectAll("circle.hyperedge-node").filter((node: any) => node.cluster_label === d.cluster_label)
          .attr("fill", (d: any) => { 
            d.sub_cluster_color = articleSubClusterColorDict[d.sub_cluster_label]
            return d.sub_cluster_color;
          })
        setTooltipData({
          cluster_label: graph.hierarchical_topics[d.cluster_label],
          sub_cluster_labels: graph.sub_clusters[d.cluster_label].map((sub_cluster_label: string) => graph.hierarchical_topics[sub_cluster_label])
        })
        tooltipDiv.style("opacity", 1)
      })
      .on("mouseout", function(e, d) {
        // remove highlight
        remove_highlight()

        // remove connected entities
        canvas.select("g.entity-node-group").selectAll("circle.entity-node").attr("opacity", 0)
        canvas.select("g.entity-border-group").selectAll("path").attr("opacity", 0)
        canvas.select("g.link-group").selectAll("line.link").attr("opacity", 0)
        
        // reset hovered cluster color
        canvas.selectAll("circle.hyperedge-node").filter((node: any) => node.cluster_label === d.cluster_label)
          .attr("fill", (d: any) => d.cluster_color = articleClusterColorDict[d.cluster_label])
        
        // hide tooltip
        tooltipDiv.style("opacity", 0)
      })
      .on("click", (e, d) => onClusterClicked(d.cluster_label, graph.clusters))
      .filter((d: any) => d.update_cluster_order !== 0)
      .attr("opacity", 0)
      .transition().delay(d => d.update_cluster_order*t_delay).duration(t_duration)
      .attr("opacity", 1)
  }

  // function update_entity_cluster() {
  //   const canvas = d3.select('#' + svgId).select("g.margin")
  //   generate_hilbert_coord(graph.entity_nodes, graph.entity_clusters, graph.entity_cluster_order, 'even')
  //   const t_delay = 1000
  //   const t_duration = 1000
  //   // entities 
  //   const entity_node_group = canvas.select("g.entity-node-group")
  //   entity_node_group.selectAll("circle.entity-node")
  //     .data(graph.entity_nodes, (d: any, i) => { d.i = i; return d.id })
  //     .join(
  //       enter => enter.append("circle")
  //           .attr("class", "entity-node")
  //           .attr("r", node_radius)
  //           .attr("stroke", "black")
  //           .attr("stroke-width", 1)
  //           .attr("fill", (d: any) => d.cluster_color = entityClusterColorDict[d.cluster_label])
  //           .attr("pointer-events", "none")
  //           .attr("opacity", 0)
  //           .attr("cx", (d: any) => d.x)
  //           .attr("cy", (d: any) => d.y)
  //           .selection(),
  //       update => update.transition().delay((d, i) => (d.update_cluster_order || 0)*t_delay).duration(t_duration)
  //           .attr("fill", (d: any) => d.cluster_color = entityClusterColorDict[d.cluster_label])
  //           .attr("cx", (d: any) => d.x)
  //           .attr("cy", (d: any) => d.y)
  //           // .attr("opacity", 1)
  //           ,
  //     )
  //   // cluster borders
  //   const cluster_borders = generate_cluster_borders(graph.entity_nodes, graph.entity_clusters, graph.entity_cluster_order, graph.entity_update_cluster_order)
  //   const border_group = canvas.select("g.entity-border-group")
  //   const tooltipDiv = d3.select(".tooltip");
  //   border_group.selectAll("path.concave-hull")
  //     .data(cluster_borders, (d: any) => d.cluster_label)
  //     .join("path")
  //     .attr("class", "concave-hull")
  //     .attr("d", d => d.path)
  //     .attr("fill", "#e1e1e1")
  //     .attr("stroke", "black")
  //     .attr("stroke-width", 1)
  //     .attr("cursor", "pointer")
  //     .attr("opacity", 0)
  //     .attr("pointer-events", 'none')
  //     // .on("mousemove", (e) => {
  //     //   tooltipDiv
  //     //     .style("left", e.offsetX  + 15 + "px")
  //     //     .style("top", e.offsetY - 5 + "px")
  //     // })
  //     .on("mouseover", function(e, d: any) {
  //       return
  //       // highlight nodes in this cluster
  //       const highlightNodeIds = graph.clusters[d.cluster_label]
  //       update_highlight(highlightNodeIds, 'id')
  //       const tooltip_coord = SVGToScreen(d.max_x, d.min_y)
  //       tooltipDiv
  //         .style("left", tooltip_coord.x  + 15 + "px")
  //         .style("top", tooltip_coord.y + 10 + "px")
  //       canvas.selectAll("circle.hyperedge-node").filter((node: any) => node.cluster_label === d.cluster_label)
  //         .attr("fill", (d: any) => { 
  //           d.sub_cluster_color = subClusterColorDict[d.sub_cluster_label]
  //           return d.sub_cluster_color;
  //         })
  //       setTooltipData({
  //         cluster_label: graph.hierarchical_topics[d.cluster_label],
  //         sub_cluster_labels: graph.sub_clusters[d.cluster_label].map((sub_cluster_label: string) => graph.hierarchical_topics[sub_cluster_label])
  //       })
  //       tooltipDiv.style("opacity", 1)
  //     })
  //     .on("mouseout", function(e, d) {
  //       return
  //       remove_highlight()
  //       canvas.selectAll("circle.hyperedge-node").filter((node: any) => node.cluster_label === d.cluster_label)
  //         .attr("fill", (d: any) => d.cluster_color = clusterColorDict[d.cluster_label])
  //       tooltipDiv.style("opacity", 0)
  //     })
  //     .on("click", (e, d) => onClusterClicked(d.cluster_label, graph.clusters))
  //     .filter((d: any) => d.update_cluster_order !== 0)
  //     .attr("opacity", 0)
  //     .transition().delay(d => d.update_cluster_order*t_delay).duration(t_duration)
  //     .attr("opacity", 1)
  // }

  function show_connected_entities(article_cluster_label) {
    const canvas = d3.select('#' + svgId).select("g.margin")
    const cluster_entity_ids: string[] = graph.article_cluster_entities[article_cluster_label].map(entity => entity.id)
    const cluster_entities: t_EntityNode[] = graph.entity_nodes.filter(entity => cluster_entity_ids.includes(entity.id))

    let filtered_clusters = {}
    Object.keys(graph.entity_clusters).forEach(cluster_label => {
      const filtered_entities = graph.entity_clusters[cluster_label].filter(entity_id => cluster_entity_ids.includes(entity_id))
      if(filtered_entities.length > 0) {
        filtered_clusters[cluster_label] = filtered_entities
      }
    })
    const filtered_cluster_order = graph.entity_cluster_order.filter(cluster_label => Object.keys(filtered_clusters).includes(cluster_label))
    const cluster_article_ids = graph.clusters[article_cluster_label]
    const cluster_articles = graph.hyperedge_nodes.filter(article => cluster_article_ids.includes(article.id))
    generate_entity_hilbert_coord(cluster_entities, filtered_clusters, filtered_cluster_order, cluster_articles)

    const t_delay = 1000
    const t_duration = 1000
    // entities 
    const entity_node_group = canvas.select("g.entity-node-group")
    entity_node_group.selectAll("circle.entity-node")
      .data(cluster_entities, (d: any, i) => { d.i = i; return d.id })
      .join(
        enter => enter.append("circle")
            .attr("class", "entity-node")
            .attr("r", node_radius)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("fill", (d: any) => d.cluster_color = entityClusterColorDict[d.cluster_label])
            .attr("pointer-events", "none")
            .attr("opacity", 1)
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            .selection(),
        // update => update.transition().delay((d, i) => (d.update_cluster_order || 0)*t_delay).duration(t_duration)
        update => update
            .attr("fill", (d: any) => d.cluster_color = entityClusterColorDict[d.cluster_label])
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            .attr("opacity", 1)
            ,
      )
    // cluster borders
    const cluster_borders = generate_cluster_borders(cluster_entities, filtered_clusters, filtered_cluster_order, graph.entity_update_cluster_order)
    const border_group = canvas.select("g.entity-border-group")
    border_group.selectAll("path.concave-hull")
      .data(cluster_borders, (d: any) => d.cluster_label)
      .join("path")
      .attr("class", "concave-hull")
      .attr("d", d => d.path)
      .attr("fill", "#e1e1e1")
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("cursor", "pointer")
      .attr("pointer-events", 'none')
      .attr("opacity", 1)
    
    // links
    const entity_links = graph.links.filter(link => 
      (cluster_entity_ids.includes(link.source) && cluster_article_ids.includes(link.target))
      || (cluster_entity_ids.includes(link.target)) && cluster_article_ids.includes(link.source))
    const link_data = generate_link_data(entity_links, cluster_entities, cluster_articles)
    const link_group = canvas.select("g.link-group")
      .selectAll("line.link")
      .data(link_data)
      .join("line")
        .attr("class", "link")
        .attr("stroke", (d: any) => d.color || "black")
        .attr("stroke-width", 1)
        .attr("opacity", 0.2)
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)
        .attr("pointer-events", "none")
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
    const hyperedge_node_group = canvas.select("g.hyperedge-node-group")
    hyperedge_node_group.selectAll("circle.hyperedge-node")
      .attr("stroke-width", 1)
      .attr("opacity", 1)
    const article_borders = canvas.select("g.article-border-group")
      .selectAll("path")
      .attr("opacity", 1)
    
  }

  function update_highlight(highlightNodeIds, highlightClusters, attr='doc_id') {
    const canvas = d3.select('#' + svgId).select("g.margin")
    const hyperedge_node_group = canvas.select("g.hyperedge-node-group")
    if(highlightNodeIds.length === 0) {
      if(searchMode) {
        hyperedge_node_group.selectAll("circle.hyperedge-node")
          .attr("stroke-width", 1)
          .attr("opacity", 0.5)
          return
      } else {
        hyperedge_node_group.selectAll("circle.hyperedge-node")
          .attr("stroke-width", 1)
          .attr("opacity", 1)
          return
      }
    }
    // set normal nodes to background
    hyperedge_node_group.selectAll("circle.hyperedge-node")
      .attr("stroke-width", 1)
      .attr("opacity", 0.5)
      // .attr("opacity", 0.1)

    // update highlighted nodes 
    hyperedge_node_group.selectAll("circle.hyperedge-node")
      .filter((node: any) => highlightNodeIds.includes(node[attr]))
      .attr("stroke-width", 2)
      .attr("opacity", 1)
    const article_borders = canvas.select("g.article-border-group")
      .selectAll("path")
    article_borders.attr("opacity", 0.1)
    article_borders.filter((node: any) => highlightClusters.includes(node[attr]))
      .attr("opacity", 1)


    // highlight hyperedge borders
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

  function generate_cluster_borders(nodes, clusters, cluster_order, update_cluster_order) {
    let border_paths: any[] = []
    Object.keys(clusters).forEach(cluster_label => {
      const cluster_node_ids = clusters[cluster_label]
      const nodes_data = nodes.filter(node => cluster_node_ids.includes(node.id))
      // if(nodes_data.length === 0) return

      const {path, max_x, min_y} = generate_border(nodes_data)
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

  function generate_border(nodes_data, concavity=0.2) {
      const offset_x = (nodes_data[0] as any).cell_width
      const offset_y = (nodes_data[0] as any).cell_height
      // add concave hull forst to make its z-index lower
      let points: any[] = []
      nodes_data.forEach((node: any) => {
        points.push([node.x - offset_x, node.y - offset_y]) // 1
        points.push([node.x, node.y - offset_y]) // 2
        points.push([node.x + offset_x, node.y - offset_y]) // 3
        points.push([node.x - offset_x, node.y]) // 4
        points.push([node.x + offset_x, node.y]) // 6
        points.push([node.x - offset_x, node.y + offset_y]) // 7
        points.push([node.x, node.y + offset_y]) // 8
        points.push([node.x + offset_x, node.y + offset_y]) // 9
      })
      const max_x = Math.max(...points.map(p => p[0]))
      const min_y = Math.min(...points.map(p => p[1]))
      // const polygon = concaveman(points, 0.5, 0)
      const polygon = concaveman(points, concavity, 0)
      // const path = createRoundedCornersFromPointsWithLines(polygon);
      const path = createSmoothPathFromPointsWithCurves(polygon);
      return { path, max_x, min_y }
  }

  function createSmoothPathFromPointsWithLines(points) {
    let path = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i][0]},${points[i][1]}`;
    }
    path += ' Z';
    return path;
  }

  function createSmoothPathFromPointsWithCurves(points) {
    // Function to create a smooth path from points using Bezier curves
    // This turns out to be unexpectedly aesthetic (sketchy style) 
    let path = `M ${points[0][0]},${points[0][1]}`;
    const numPoints = points.length;

    for (let i = 1; i < numPoints; i++) {
      const smoothing = 0.5;
      // Calculate control points for cubic Bezier curves
      const p0 = points[i-1]
      const p1 = points[i]
      const p2 = points[(i+1)%numPoints]
      const x0 = smoothing*p0[0] + (1-smoothing)*p1[0]
      const y0 = smoothing*p0[1] + (1-smoothing)*p1[1]

      const x1 = smoothing*p2[0] + (1-smoothing)*p1[0]
      const y1 = smoothing*p2[1] + (1-smoothing)*p1[1]
      path += ` C ${x0},${y0} ${x1},${y1} ${p2[0]},${p2[1]}`;
    }

    path += ' Z';
    return path;
  }

  function createRoundedCornersFromPointsWithLines(points) {
    // Create a smooth path based on the concave hull points with rounded corners
    let path = `M ${points[0][0]},${points[0][1]}`;
    const numPoints = points.length;

    for (let i = 1; i < numPoints; i++) {
      const prevPoint = points[i - 1];
      const curPoint = points[i];
      const nextPoint = points[(i + 1) % numPoints];

      const x0 = (curPoint[0] + prevPoint[0]) / 2;
      const y0 = (curPoint[1] + prevPoint[1]) / 2;

      const x1 = (curPoint[0] + nextPoint[0]) / 2;
      const y1 = (curPoint[1] + nextPoint[1]) / 2;

      path += ` L ${x0},${y0}`;
      path += ` Q ${curPoint[0]},${curPoint[1]} ${x1},${y1}`;
    }

    path += ' Z';
    return path
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
    const circles = svg.selectAll("circle.hyperedge-node").attr("stroke-width", 1)
    circles.each((d: any) => d.scanned = d.selected = false);
    if (selection) search(circles, selection, "brushing");
  }

  function brushed({selection}) {
    const svg = d3.select('#' + svgId)
    const circles = svg.selectAll("circle.hyperedge-node").attr("stroke-width", 1)
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
    });
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
              <p className='w-fit'> Topic: { tooltipData.cluster_label } </p>
              <ul className='w-fit list-disc list-inside'> 
                <p className='w-fit'> Sub-topics: </p>
                { tooltipData.sub_cluster_labels.map(sub_cluster_label => 
                  <li className='w-fit pl-0'> { sub_cluster_label } </li> )
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
