import * as d3 from "d3"
import { useState, useMemo, useEffect } from 'react'
import d3Hilbert from 'd3-hilbert';
import "./ClusterOverview.css"

function ClusterOverview({svgId, graph, hierarchies, onNodesSelected}) {
  const margin = {
      left: 30,
      right: 0,
      top: 0,
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
  const node_radius = 3.5


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

  function generate_hilbert_coord(nodes, num_of_clusters) {
    const hilbert_order = Math.ceil(Math.log(nodes.length) / Math.log(4))+1 // log_4(nodes.length)
    console.log({num_of_clusters, hilbert_order})
    const hilbert = d3Hilbert().order(hilbert_order)
    const grid_length = Math.pow(2, hilbert_order)
    const cell_width = canvasSize.width / grid_length
    const cell_height = canvasSize.height / grid_length
    const cluster_gap = Math.floor((Math.pow(4, hilbert_order) - nodes.length) / num_of_clusters)
    let cluster_count = 0
    nodes.sort((a, b) => a.order - b.order)
    let cur_cluster = nodes[0].cluster_label
    nodes.forEach(node => {
        // add cluster gap to node order
        // node.order += Number(node.cluster_label) * cluster_gap
        if(node.cluster_label != cur_cluster) {
            cluster_count += 1
            cur_cluster = node.cluster_label
        }
        const node_hilbert_order = node.order + cluster_count * cluster_gap


        // if(original_order < 1000)
        //     console.log(original_order, node_hilbert_order)

        const xy = hilbert.getXyAtVal(node_hilbert_order)
        node.x = cell_width * xy[0]
        node.y = cell_height * xy[1]
    })
  }
  
  function add_cluster_label(graph) {
    let partition_dict = {}
    Object.keys(graph.partition).forEach(cluster_label => {
        const node_ids = graph.partition[cluster_label].map(node => node.id)
        node_ids.forEach(node_id => {
            partition_dict[node_id] = cluster_label
        })
    })
    graph.nodes.forEach(node => {
        node.cluster_label = partition_dict[node.id]
    })
  }
    
  useEffect(() => {
    init()
  }, []);

  useEffect(() => {
    update_cluster()
  }, [graph]);

  function init() {
    const svg = d3.select('#' + svgId)
      .attr("viewBox", `0 0 ${svgSize.width} ${svgSize.height}`)
      // .attr("width", "100%")
      // .attr("height", "100%")
      .attr("overflow", "visible")
      // .attr("preserveAspectRatio", "none")
    const canvas = svg.append("g")
      .attr("class", "margin")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    canvas.append("g").attr("class", "node-group")
    addBrush()
  }


  function update_cluster() {
    const clusterColorScale = d3.scaleOrdinal(d3.schemeCategory10)
    console.log(Object.keys(graph.partition).length)
    const svg = d3.select('#' + svgId)
    add_cluster_label(graph)
    generate_order(graph.nodes, hierarchies)
    generate_hilbert_coord(graph.nodes, Object.keys(graph.partition).length)
    console.log("hilbert: ", graph.nodes)
    const node_group = svg.select('g.node-group')
    // const nodes = node_group.selectAll('circle.node')
    //   .data(graph.nodes, (d: any) => d.id)
    //   .join(
    //     enter => enter.append("circle")
    //         .attr("class", "node")
    //         .attr("r", node_radius)
    //         .attr("stroke", "black")
    //         .attr("stroke-width", 1)
    //         .attr("fill", (d: any) => d.cluster_color = clusterColorScale(d.cluster_label))
    //         .attr("opacity", 0.8)
    //         .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`),
    //     update => update.transition().duration(1000)
    //         .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`)
    //   )
    const node_containers = node_group.selectAll('g.node_container')
      .data(graph.nodes, (d: any) => d.id)
      .join(
        enter => enter.append("g")
            .attr("class", "node_container")
            .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`)
            .each(function(d: any) {
                const node_container = d3.select(this)
                node_container.append("circle") 
                .attr("class", "node")
                .attr("r", node_radius)
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .attr("fill", d.cluster_color = clusterColorScale(d.cluster_label))
                .attr("opacity", 0.8)
                // node_container.selectAll("text.node_label")
                //     .data([node_data])
                //     .join("text")
                //     .attr("class", "node_label")
                //     .attr("x", d => d.x)
                //     .attr("y", d => d.y)
                //     .attr("dx", 5)
                //     .text(d => d.id)
            }),
        update => update.transition().duration(2000)
            .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`)
            // .select("circle")
            //     .attr("fill", (d: any) => d.cluster_color = clusterColorScale(d.cluster_label))
      )
    console.log("node clusters update done")
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
    const circles = svg.selectAll("circle.node").attr("stroke-width", 1)
    circles.each((d: any) => d.scanned = d.selected = false);
    if (selection) search(circles, selection, "brushing");
  }

  function brushed({selection}) {
    const svg = d3.select('#' + svgId)
    const circles = svg.selectAll("circle.node").attr("stroke-width", 1)
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
      <div className="event-cluster-container">
        <div className='event-cluster-header'>
          Event Cluster
        </div>
        <div className="svg-container"> 
            <svg id={svgId} className='event-cluster-svg'> </svg>
        </div>
        <div className='tooltip'></div>
      </div>
    </>
  )
}

export default ClusterOverview
