import * as d3 from "d3"
import { useState, useMemo, useEffect } from 'react'
import d3Hilbert from 'd3-hilbert';
import "./ClusterOverview.css"
import { t_EventHGraph } from "../../types.ts"
import concaveman from "concaveman"

interface ClusterOverviewProps {
  svgId: string
  graph: t_EventHGraph
  hierarchies: any
  onNodesSelected: (node_ids: string[]) => void
  onClusterSelected: (cluster_label: string) => void
}

function ClusterOverview({svgId, graph, hierarchies, onNodesSelected, onClusterSelected}: ClusterOverviewProps) {
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
  const clusterColorScale = d3.scaleOrdinal(d3.schemeCategory10)


  function generate_order(nodes, hierarchy) {
    let order = []
    dfs(nodes, hierarchy, order)
  }

  function dfs(nodes, hierarchy, order) {
    if(hierarchy.children === undefined) {
        const cluster_label = hierarchy.title.split("-")[2]
        const target_leaf_node = nodes.filter(node => node.leaf_label == cluster_label)[0]
        target_leaf_node.order = order.length
        order.push(target_leaf_node)
        return
    } else {
        hierarchy.children.forEach(child => {
            dfs(nodes, child, order)
        })
        return
    }
  }

  function generate_hilbert_coord(graph, num_of_clusters) {
    // hyperedge nodes
    const hyperedge_nodes = graph.hyperedge_nodes
    let hyperedge_dict = {}
    graph.hyperedge_nodes.forEach(node => { hyperedge_dict[node.id] = node })
    let entity_node_dict = {}
    graph.candidate_entity_nodes.forEach(node => { entity_node_dict[node.id] = node })
    const hilbert_order = Math.ceil(Math.log(hyperedge_nodes.length) / Math.log(4))+0 // log_4(nodes.length)
    console.log(num_of_clusters, hilbert_order, Math.pow(4, hilbert_order))
    const hilbert = d3Hilbert().order(hilbert_order)
    const grid_length = Math.pow(2, hilbert_order)
    const cell_width = canvasSize.width / grid_length
    const cell_height = canvasSize.height / grid_length
    const cluster_gap = Math.floor((Math.pow(4, hilbert_order) - hyperedge_nodes.length) / num_of_clusters)
    let cluster_count = 0
    hyperedge_nodes.sort((a, b) => a.order - b.order)
    let cur_cluster = hyperedge_nodes[0].cluster_label
    const node_coords = {}
    hyperedge_nodes.forEach(node => {
        // add cluster gap to node order
        if(node.cluster_label != cur_cluster) {
            cluster_count += 1
            cur_cluster = node.cluster_label
        }
        const node_hilbert_order = node.order + cluster_count * cluster_gap
        const xy = hilbert.getXyAtVal(node_hilbert_order)
        // node.x = cell_width * xy[0] + math.random() * 2 - 1
        // node.y = cell_height * xy[1] + math.random() * 2 - 1
        node.x = cell_width * xy[0]
        node.y = cell_height * xy[1] 
        node_coords[node.id] = [node.x, node.y]
        node.cell_width = cell_width,
        node.cell_height = cell_height
    })
    // entity nodes
    const entity_nodes = graph.candidate_entity_nodes
    entity_nodes.forEach((node, i) => {
        const node_order = i * cluster_gap + Math.round(cluster_gap / 2)
        const xy = hilbert.getXyAtVal(node_order)
        node.x = cell_width * xy[0] * 2 - 1
        node.y = cell_height * xy[1] * 2 - 1
        node_coords[node.id] = [node.x, node.y]
    })
    graph.links.forEach(link => {
        const source_coords = node_coords[link.source]
        const target_coords = node_coords[link.target]
        link.source = {
            id: link.source,
            x: source_coords[0],
            y: source_coords[1]
          },
        link.target = {
            id: link.target,
            x: target_coords[0],
            y: target_coords[1]
        }
        const hyperedge_node = hyperedge_dict[link.source.id] || hyperedge_dict[link.target.id]
        const cluster_color = clusterColorScale(hyperedge_node.cluster_label)
        link.color = cluster_color
    })
  }
  
  useEffect(() => {
    init()
  }, []);

  useEffect(() => {
    update_hyperedge_cluster()
  }, [graph]);

  function init() {
    const svg = d3.select('#' + svgId)
      .attr("viewBox", `0 0 ${svgSize.width} ${svgSize.height}`)
      .attr("overflow", "visible")
    const canvas = svg.append("g")
      .attr("class", "margin")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    // canvas.append("g").attr("class", "hyperedge-node-group")
    // canvas.append("g").attr("class", "entity-node-group")
    // canvas.append("g").attr("class", "link-group")
    // addBrush()
  }


  function update_hyperedge_cluster() {
    console.log(Object.keys(graph.clusters).length)
    const canvas = d3.select('#' + svgId).select("g.margin")
    // add_cluster_label(graph)
    generate_order(graph.hyperedge_nodes, hierarchies)
    generate_hilbert_coord(graph, Object.keys(graph.clusters).length)
    console.log("hilbert: ", graph.hyperedge_nodes)
    const link_group = canvas.select('g.link-group')
    const links = link_group.selectAll("line.link")
      .data(graph.links)
      .join("line")
        .attr("class", "link")
        .attr("stroke", (d: any) => d.color)
        .attr("stroke-width", 1)
        .attr("opacity", 0.2)
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)
    const t_delay = 10
    const t_duration = 100
    const cluster_group = canvas.selectAll('g.cluster-group')
      .data(Object.keys(graph.clusters))
      .enter()
        .append("g").attr("class", "cluster-group")
        .each(function(cluster_label, i) {
            const cluster_hyperedge_node_ids = graph.clusters[cluster_label]
            const hyperedge_nodes_data = graph.hyperedge_nodes.filter(node => cluster_hyperedge_node_ids.includes(node.id))
            // add concave hull forst to make its z-index lower
            let points: any[] = []
            const offset_x = (hyperedge_nodes_data[0] as any).cell_width
            const offset_y = (hyperedge_nodes_data[0] as any).cell_height
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
            const polygon = concaveman(points, 0.2, 0)
            const path = createRoundedCornersFromPointsWithLines(polygon);
            console.log({points, polygon, path})
            d3.select(this).selectAll("path.concave-hull")
              .data([path])
              .join("path")
              .attr("class", "concave-hull")
              .attr("d", d => d)
              .attr("fill", "#e1e1e1")
              .attr("stroke", "black")
              .attr("stroke-width", 1)
              .attr("cursor", "pointer")
              .on("mouseover", function() {
                d3.select(this)
                  .raise()
                  .attr("opacity", 0.5)
                  .transition().duration(200)
                  .attr("stroke-width", 3)
                  .attr("fill", "rgb(43, 42, 42)")
              })
              .on("mouseout", function() {
                d3.select(this)
                  .lower()
                  .transition().duration(100)
                  .attr("opacity", 1)
                  .attr("stroke-width", 1)
                  .attr("fill", "#e1e1e1")

              })

          // append circles
          const hyperedge_nodes = d3.select(this).selectAll('circle.hyperedge-node')
            .data(hyperedge_nodes_data, (d: any, i) => { d.i = i; return d.id })
            .join(
              enter => enter.append("circle")
                  .attr("class", "hyperedge-node")
                  .attr("r", node_radius)
                  .attr("stroke", "black")
                  .attr("stroke-width", 1)
                  .attr("fill", (d: any) => d.cluster_color = clusterColorScale(d.cluster_label))
                  .attr("opacity", 0.8)
                  .attr("pointer-events", "none")
                  .attr("cx", (d: any) => d.x)
                  .attr("cy", (d: any) => d.y),
              update => update.transition().delay((d, i) => i*t_delay).duration(t_duration)
                  .attr("cx", (d: any) => d.x)
                  .attr("cy", (d: any) => d.y),
            )

        })
        .on("click", (d) => onClusterSelected(d))

    const entity_node_group = canvas.select('g.entity-node-group')
    const entity_nodes = entity_node_group.selectAll("circle.entity-node")
      .data(graph.candidate_entity_nodes, (d: any, i) => { d.i = i; return d.id })
      .join(
        enter => enter.append("circle")
            .attr("class", "entity-node")
            .attr("r", node_radius)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("fill", "white")
            .attr("opacity", 0.8)
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y),
        update => update.transition().delay((d, i) => i*t_delay).duration(t_duration)
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y),
      )
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
  function brushing({selection}) {
    const svg = d3.select('#' + svgId)
    const circles = svg.selectAll("circle.hyperedge_node").attr("stroke-width", 1)
    circles.each((d: any) => d.scanned = d.selected = false);
    if (selection) search(circles, selection, "brushing");
  }

  function brushed({selection}) {
    const svg = d3.select('#' + svgId)
    const circles = svg.selectAll("circle.hyperedge_node").attr("stroke-width", 1)
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
