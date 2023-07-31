import * as d3 from "d3"
import { useState, useMemo, useEffect } from 'react'
import { usePrevious } from "@uidotdev/usehooks";

import d3Hilbert from 'd3-hilbert';
import "./ClusterOverview.css"
import { t_EventHGraph, t_HyperedgeNode } from "../../types.ts"
import concaveman from "concaveman"

interface ClusterOverviewProps {
  svgId: string
  graph: t_EventHGraph
  highlightNodeIds: string[]
  hierarchies: any
  onNodesSelected: (node_ids: string[]) => void
  onClusterClicked: (cluster_label: string, clusters: any) => void
  brushMode: boolean
  searchMode: boolean
}

function ClusterOverview({
  svgId, 
  graph, 
  highlightNodeIds, 
  hierarchies, 
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
  const clusterColorScale = d3.scaleOrdinal(d3.schemeTableau10)
  const subClusterColorScale = d3.scaleOrdinal(d3.schemeSet3)
  const [previousClusterColorDict, setPreviousClusterColorDict] = useState<any>(undefined)
  const [previousSubClusterColorDict, setPreviousSubClusterColorDict] = useState<any>(undefined)
  const [previousNodeDict, setPreviousNodeDict] = useState<any>({}) 
  
  const clusterColorDict = useMemo(() => {
    let cluster_color_dict = {}
    console.log(previousClusterColorDict, previousSubClusterColorDict)
    Object.keys(graph.clusters).forEach(cluster_label => {
      if(previousClusterColorDict && previousClusterColorDict[cluster_label]) {
        console.log("kept original cluster color", cluster_label)
        cluster_color_dict[cluster_label] = previousClusterColorDict[cluster_label]
      } else if(previousSubClusterColorDict && previousSubClusterColorDict[cluster_label]) {
        console.log("kept original sub cluster color", cluster_label)
        cluster_color_dict[cluster_label] = previousSubClusterColorDict[cluster_label]
      } else {
        console.log("regenerated cluster color", cluster_label)
        cluster_color_dict[cluster_label] = clusterColorScale(cluster_label)
      }
    })
    setPreviousClusterColorDict(cluster_color_dict)
    return cluster_color_dict
  }, [graph])

  const subClusterColorDict = useMemo(() => {
    let sub_cluster_color_dict = {}
    Object.keys(graph.clusters).forEach(cluster_label => {
      const cluster_color = d3.hsl(clusterColorDict[cluster_label])
      const sub_clusters = graph.num_sub_clusters[cluster_label]
      const sub_cluster_renumber_dict = {}
      sub_clusters.forEach((sub_cluster, index) => sub_cluster_renumber_dict[sub_cluster] = index)
      const sub_cluster_colorScale = d3.scaleLinear()
        .domain([0,  sub_clusters.length - 1])
        .range([0.4, 1]);
      sub_clusters.forEach((sub_cluster_label, i) => {
        // sub_cluster_color_dict[sub_cluster_label] = d3.hsl(cluster_color.h, sub_cluster_colorScale(i), 0.5)
        const offset_color = subClusterColorScale(sub_cluster_label)
        const offset_hsl = d3.hsl(offset_color)
        const sub_cluster_color = d3.hsl(cluster_color.h + offset_hsl.h, offset_hsl.s, offset_hsl.l)
        sub_cluster_color_dict[sub_cluster_label] = sub_cluster_color
      })
      console.log({sub_cluster_color_dict})
    })
    setPreviousSubClusterColorDict(sub_cluster_color_dict)
    return sub_cluster_color_dict
  }, [graph])


  function generate_hilbert_coord(graph) {
    // hyperedge nodes
    const hyperedge_nodes = graph.hyperedge_nodes
    let hyperedge_dict = {}
    graph.hyperedge_nodes.forEach(node => { hyperedge_dict[node.id] = node })
    // let entity_node_dict = {}
    // graph.candidate_entity_nodes.forEach(node => { entity_node_dict[node.id] = node })
    // const hilbert_order = Math.ceil(Math.log(hyperedge_nodes.length) / Math.log(4))+0 // log_4(nodes.length)
    const hilbert_order = Math.ceil(Math.log(7546) / Math.log(4))+0 // log_4(nodes.length)
    const hilbert = d3Hilbert().order(hilbert_order)
    const grid_length = Math.pow(2, hilbert_order)
    const cell_width = canvasSize.width / grid_length
    const cell_height = canvasSize.height / grid_length
    const total_cluster_gap = Math.pow(4, hilbert_order) - 1 - hyperedge_nodes.length
    const cluster_order = graph.cluster_order
    let gaps: number[] = [0]
    let accumulative_gap = 0
    const total_volume = 2*hyperedge_nodes.length - graph.clusters[cluster_order[0]].length - graph.clusters[cluster_order[cluster_order.length-1]].length
    // generate cluster gaps
    for(let i = 0; i < cluster_order.length-1; i++) {
      const cluster1 = cluster_order[i]
      const cluster2 = cluster_order[i+1]
      const cluster1_volume = graph.clusters[cluster1].length
      const cluster2_volume = graph.clusters[cluster2].length
      const volume_ratio = (cluster1_volume + cluster2_volume) / total_volume
      const gap = total_cluster_gap * volume_ratio
      accumulative_gap += Math.round(gap)
      gaps.push(accumulative_gap)
    }

    // assign hilbert coord to hyperedge nodes
    hyperedge_nodes.sort((a, b) => a.order - b.order)
    const node_coords = {}
    hyperedge_nodes.forEach((node, index) => {
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
    if(searchMode) update_highlight()
    if(!searchMode)remove_highlight() 
  }, [searchMode])

  useEffect(() => {
    update_highlight()
  }, [highlightNodeIds])

  useEffect(() => {
    update_hyperedge_cluster()
    update_highlight()
  }, [graph]);

  function init() {
    const svg = d3.select('#' + svgId)
      .attr("viewBox", `0 0 ${svgSize.width} ${svgSize.height}`)
      .attr("overflow", "visible")
    const canvas = svg.append("g")
      .attr("class", "margin")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    canvas.append("g").attr("class", "border-group")
    canvas.append("g").attr("class", "hyperedge-node-group")
    canvas.append("path").attr("class", "highlight-border")
    // canvas.append("g").attr("class", "entity-node-group")
    // canvas.append("g").attr("class", "link-group")
    addBrush()
  }


  function update_hyperedge_cluster() {
    const canvas = d3.select('#' + svgId).select("g.margin")
    // canvas.selectAll("circle.hyperedge-node").attr("opacity", 0)
    generate_hilbert_coord(graph)
    // links
    // const link_group = canvas.select('g.link-group')
    // const links = link_group.selectAll("line.link")
    //   .data(graph.links)
    //   .join("line")
    //     .attr("class", "link")
    //     .attr("stroke", (d: any) => d.color)
    //     .attr("stroke-width", 1)
    //     .attr("opacity", 0.2)
    //     .attr("x1", (d: any) => d.source.x)
    //     .attr("y1", (d: any) => d.source.y)
    //     .attr("x2", (d: any) => d.target.x)
    //     .attr("y2", (d: any) => d.target.y)
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
            .attr("fill", (d: any) => d.cluster_color = clusterColorDict[d.cluster_label])
            .attr("pointer-events", "none")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("opacity", 0)
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            .attr("opacity", 1)
            .selection(),
        update => update.transition().delay((d, i) => (d.update_cluster_order || 0)*t_delay).duration(t_duration)
            .attr("fill", (d: any) => d.cluster_color = clusterColorDict[d.cluster_label])
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            // .attr("opacity", 1)
            ,
      )
    // cluster borders
    const cluster_borders = generate_cluster_borders(graph)
    const border_group = canvas.select("g.border-group")
    border_group.selectAll("path.concave-hull")
      .data(cluster_borders, (d: any) => d.cluster_label)
      .join("path")
      .attr("class", "concave-hull")
      .attr("d", d => d.path)
      .attr("fill", "#e1e1e1")
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("cursor", "pointer")
      .on("mouseover", function(e, d: any) {
        console.log(d.cluster_label)
        // d3.select(this)
        //   .raise()
        //   .attr("opacity", 0.5)
        //   .transition().duration(200)
        //   .attr("stroke-width", 3)
        //   .attr("fill", "rgb(43, 42, 42)")
        canvas.selectAll("circle.hyperedge-node").filter((node: any) => node.cluster_label === d.cluster_label)
          .attr("fill", (d: any) => { 
            d.sub_cluster_color = subClusterColorDict[d.sub_cluster_label]
            return d.sub_cluster_color;
          })
      })
      .on("mouseout", function(e, d) {
        // d3.select(this)
        //   .lower()
        //   .transition().duration(100)
        //   .attr("opacity", 1)
        //   .attr("stroke-width", 1)
        //   .attr("fill", "#e1e1e1")
        canvas.selectAll("circle.hyperedge-node").filter((node: any) => node.cluster_label === d.cluster_label)
          .attr("fill", (d: any) => d.cluster_color = clusterColorDict[d.cluster_label])
      })
      .on("click", (e, d) => onClusterClicked(d.cluster_label, graph.clusters))
      .filter((d: any) => d.update_cluster_order !== 0)
      .attr("opacity", 0)
      .transition().delay(d => d.update_cluster_order*t_delay).duration(t_duration)
      .attr("opacity", 1)

    // entity nodes
    // const entity_node_group = canvas.select('g.entity-node-group')
    // const entity_nodes = entity_node_group.selectAll("circle.entity-node")
    //   .data(graph.candidate_entity_nodes, (d: any, i) => { d.i = i; return d.id })
    //   .join(
    //     enter => enter.append("circle")
    //         .attr("class", "entity-node")
    //         .attr("r", node_radius)
    //         .attr("stroke", "black")
    //         .attr("stroke-width", 1)
    //         .attr("fill", "white")
    //         .attr("opacity", 0.8)
    //         .attr("cx", (d: any) => d.x)
    //         .attr("cy", (d: any) => d.y),
    //     update => update.transition().delay((d, i) => i*t_delay).duration(t_duration)
    //         .attr("cx", (d: any) => d.x)
    //         .attr("cy", (d: any) => d.y),
    //   )
  }

  function remove_highlight() {
    const canvas = d3.select('#' + svgId).select("g.margin")
    const hyperedge_node_group = canvas.select("g.hyperedge-node-group")
    hyperedge_node_group.selectAll("circle.hyperedge-node")
      .attr("stroke-width", 1)
      .attr("opacity", 1)
    
  }

  function update_highlight() {
    console.log("update highight", highlightNodeIds, searchMode)
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

    // update highlighted nodes 
    hyperedge_node_group.selectAll("circle.hyperedge-node")
      .filter((node: any) => highlightNodeIds.includes(node.doc_id))
      .attr("stroke-width", 2)
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

  function generate_cluster_borders(graph) {
    let border_paths: any[] = []
    Object.keys(graph.clusters).forEach(cluster_label => {
      const cluster_hyperedge_node_ids = graph.clusters[cluster_label]
      console.log(cluster_label, graph.clusters[cluster_label])
      const hyperedge_nodes_data = graph.hyperedge_nodes.filter(node => cluster_hyperedge_node_ids.includes(node.id))
      
      const border_path = generate_border(hyperedge_nodes_data)
      border_paths.push({
        "cluster_label": cluster_label,
        "cluster_order": graph.cluster_order.indexOf(cluster_label),
        "update_cluster_order": graph.update_cluster_order[cluster_label],
        "path": border_path
      })
    })
    return border_paths
  }

  function generate_border(hyperedge_nodes_data, concavity=0.2) {
      const offset_x = (hyperedge_nodes_data[0] as any).cell_width
      const offset_y = (hyperedge_nodes_data[0] as any).cell_height
      // add concave hull forst to make its z-index lower
      let points: any[] = []
      hyperedge_nodes_data.forEach((node: any) => {
        points.push([node.x - offset_x, node.y - offset_y]) // 1
        points.push([node.x, node.y - offset_y]) // 2
        points.push([node.x + offset_x, node.y - offset_y]) // 3
        points.push([node.x - offset_x, node.y]) // 4
        points.push([node.x + offset_x, node.y]) // 6
        points.push([node.x - offset_x, node.y + offset_y]) // 7
        points.push([node.x, node.y + offset_y]) // 8
        points.push([node.x + offset_x, node.y + offset_y]) // 9
      })
      // const polygon = concaveman(points, 0.5, 0)
      const polygon = concaveman(points, concavity, 0)
      // const path = createRoundedCornersFromPointsWithLines(polygon);
      const path = createSmoothPathFromPointsWithCurves(polygon);
      return path
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
        <div className='tooltip'></div>
      </div>
    </>
  )
}

export default ClusterOverview
