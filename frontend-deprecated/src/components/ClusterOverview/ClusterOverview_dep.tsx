import { useState, useEffect, useMemo, useRef } from 'react'
import * as d3 from "d3"
import { hydrate } from 'react-dom';

function formatDate(date_str) {
  const date = new Date(date_str)
  let mm = date.getMonth() + 1; // getMonth() is zero-based
  let dd = date.getDate();

  return [date.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
         ].join('/');
}

function ClusterOverview({svgId, graph, hierarchies, level, onNodesSelected}) {
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

  // metadata
  const timeRange = useMemo(() => {
    const max_date = new Date(Math.max.apply(null, graph.nodes.map(node => new Date(formatDate(node.date))) as any[]))
    const min_date = new Date(Math.min.apply(null, graph.nodes.map(node => new Date(formatDate(node.date))) as any[]))
    return [min_date, max_date]
  }, [graph])

  // scales & constants
  const monthBinWidth = (canvasSize.width) / 12
  const dateScale = d3.scaleTime().domain(timeRange).range([canvasSize.start_x, canvasSize.end_x])
  const monthScale = d3.scaleTime().domain([0, 11]).range([canvasSize.start_x, canvasSize.end_x])
  const dayScale = d3.scaleTime().domain([0, 6]).range([0, monthBinWidth])

  const clusterColorScale = d3.scaleOrdinal(d3.schemeCategory10)
  const node_radius = 2
  const bin_max_height = 50

  // re-organizing data
  const boxes: any[] = useMemo(() => generate_bbox(graph.partition, hierarchies, level), [graph])

  function generate_bbox(partition, hierarchy, level) {
    console.log({hierarchy})
    // calculate width and height of each cluster bbox
    let cluster_bboxes: any = []
    let previous_ymax: number = 0
    Object.keys(partition).forEach((cluster_label) => {
      const nodes = partition[cluster_label]
      const dates_bin = {}
      nodes.forEach(node => {
        const date = formatDate(node.date)
        // const date = node.date
        if(!dates_bin[date]) dates_bin[date] = 0
        dates_bin[date]++;
        node.bin_index = dates_bin[date]
      })
      const min_date = new Date(Math.min.apply(null, nodes.map(node => new Date(formatDate(node.date)))))
      const max_date = new Date(Math.max.apply(null, nodes.map(node => new Date(formatDate(node.date)))))

      const bbox_x0 = dateScale(min_date)
      const bbox_x1 = dateScale(max_date)
      const bbox_y_max_node = Math.max.apply(null, Object.keys(dates_bin).map(date_str => dates_bin[date_str]))
      const bbox_height = bbox_y_max_node * node_radius * 2 
      cluster_bboxes.push({
        "label": cluster_label,
        "hierarchy": `L-${level}-${cluster_label}`,
        "x0": bbox_x0,
        "x1": bbox_x1,
        // "y0": previous_ymax,
        "height": bbox_height,
        "bins": dates_bin
      })
      previous_ymax += bbox_height + 50
    })
    const order = generate_order(hierarchy, level)
    console.log({order})
    let y0 = 0
    order.forEach((cluster_label) => {
      const cluster_bbox = cluster_bboxes.filter(bbox => bbox.hierarchy == cluster_label)[0]
      cluster_bbox.y0 = y0
      y0 += cluster_bbox.height + 50
    })
    // let parent_bboxes = []
    // generate_bbox_hierarchy(cluster_bboxes, hierarchy, level, parent_bboxes)
    // cluster_bboxes = parent_bboxes.concat(cluster_bboxes)
    // order_bboxes(hierarchy, cluster_bboxes)
    return cluster_bboxes
  }

  function generate_bbox_hierarchy(leaf_cluster_bboxes, hierarchy, level, res) {
    const cur_level = hierarchy.title.split('-')[1]
    let children_bboxes: any[] = []
    console.log({cur_level, level})
    if(cur_level == level+1) {
      hierarchy.children.forEach((child) => {
        console.log(leaf_cluster_bboxes, child)
        const child_bbox = leaf_cluster_bboxes.filter(cluster => cluster.hierarchy == child.title)[0]
        children_bboxes.push(child_bbox)
      })
    } else {
      hierarchy.children.forEach((child) => {
        const child_bbox = generate_bbox_hierarchy(leaf_cluster_bboxes, child, level, res)
        children_bboxes.push(child_bbox)
      })
    }
    console.log({children_bboxes})
    // merge bboxes
    let x0 = 0
    let x1 = 0
    let height = 0
    children_bboxes.forEach((child_bbox) => {
      x0 = Math.min(x0, child_bbox.x0)
      x1 = Math.max(x1, child_bbox.x1)
      height += child_bbox.height + 40 // padding
    })
    const bbox = {
      "label": hierarchy.title,
      "hierarchy": hierarchy.title,
      "x0": x0,
      "x1": x1,
      "height": height,
    }
    console.log({bbox})
    res.push(bbox)
    return bbox
  }

  function order_bboxes(hierarchy, bboxes) {
    // order bboxes
    let current = hierarchy.children
    while(true) {
      const current_bbox = bboxes.filter(bbox => bbox.hierarchy == current.title)[0]
      let y0 = current_bbox.y0
      current.forEach(child_bbox => {
        child_bbox.y0 = y0
        y0 += child_bbox.height + 40 // padding
      })
    }
  }

  function generate_order(hierarchy, level) {
    let order = []
    dfs(hierarchy, order, level)
    return order
  }

  function dfs(hierarchy, order, level) {
    const cur_level = hierarchy.title.split('-')[1]
    if(cur_level == level) {
      order.push(hierarchy.title)
      return
    } else {
      hierarchy.children.forEach(child => {
        dfs(child, order, level)
      })
      // order.push(hierarchy.title)
      return
    }
  }
    
  useEffect(() => {
    init()
  }, []);

  useEffect(() => {
    updateClusterBoxes()
    update_cluster()
    addBrush()
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
    canvas.append("g").attr("class", "clusters")
    canvas.append("g").attr("class", "bbox-group")
    canvas.append("g").attr("class", "label-group")
    // initLegend()
    // update_cluster()
    // updateClusterBoxes()
  }

  function updateClusterBoxes() {
    console.log({boxes})
    const svg = d3.select('#' + svgId)
    const box_group = svg.select('g.bbox-group')
    box_group.selectAll("rect.bbox")
      .data(boxes)
      .join("rect")
      .attr("class", "bbox")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.height)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("fill", "none")
    const cluster_label_group = svg.select('g.label-group')
    cluster_label_group.selectAll("text.hierarchy")
      .data(boxes)
      .join("text")
      .attr("class", "hierarchy")
      .attr("x", d => d.x0 - 60)
      .attr("y", d => d.y0+d.height/2)
      .text(d => d.hierarchy)
    // update Bins
    const bins_group = box_group.selectAll("g.bins")
      .data(boxes)
      .join("g")
      .attr("class", "bins-group")
      .each(function(box_data) {
        const bins_value = Object.keys(box_data.bins).map(date_str => box_data.bins[date_str])
        const max_value = Math.max(...bins_value)
        const bin_xScale = d3.scaleBand().domain([...Array(366).keys()]).range([canvasSize.start_x, canvasSize.end_x])
        const bin_width = bin_xScale.bandwidth()
        const bin_yScale = d3.scaleLinear().domain([0, max_value]).range([0, box_data.height])
        d3.select(this).selectAll("rect.bins")
          .data(Object.keys(box_data.bins))
          .join("rect")
          .attr("class", "bins")
          .attr("x", d => {
            return bin_xScale(daysIntoYear(new Date(formatDate(d)))) - bin_width / 2
          })
          .attr("y", d => box_data.y0 + (box_data.height - bin_yScale(box_data.bins[d])))
          .attr("width", bin_width)
          .attr("height", d => bin_yScale(box_data.bins[d]))
          .attr("stroke", "black")
          .attr('stroke-width', 1)
          .attr("fill", "white")
          .attr("opacity", 0)
      })
  }
  function daysIntoYear(date) {
    return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000 - 1;
  }


  function update_cluster() {
    const svg = d3.select('#' + svgId)
    const clusters = svg.select('g.clusters')
    clusters.selectAll('g.node_container')
      .data(Object.keys(graph.partition))
      .join("g")
      .attr("class", "node_container")
      .each(function(cluster_label) {
        const nodes: any[] = graph.partition[cluster_label]
        const node_container = d3.select(this)
        const cluster_box = boxes.filter(box => box.label == cluster_label)[0]

        const box_bins = cluster_box.bins
        const max_bin_height = Math.max.apply(null, Object.keys(box_bins).map(date_str => box_bins[date_str]))
        const bin_pheight = cluster_box.height / max_bin_height
        const cy_start = (bin_height) => {
          const start_height = max_bin_height / 2 - (bin_height-1) / 2
          const start_pheight = start_height * bin_pheight
          return start_pheight + cluster_box.y0
        }

        // const cy_start = cluster_box.y0 + cluster_box.height - node_radius
        node_container.selectAll("circle.node")
          .data(nodes) 
          .join("circle")
          .attr("class", "node")
          .attr("cx", d => d.cx=dateScale(new Date(formatDate(d.date))))
          .attr("cy", d => 
            d.cy = cy_start(box_bins[formatDate(d.date)]) + node_radius*2*(d.bin_index-1)
          )
          .attr("r", node_radius)
          .attr("stroke", "black")
          .attr("stroke-width", 1)
          .attr("fill", d => d.cluster_color = clusterColorScale(cluster_label))
          .attr("opacity", 0.8)
      })
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
      const x = d.cx + margin.left + margin.right
      const y = d.cy + margin.top + margin.bottom
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
        <svg id={svgId} className='event-cluster-svg'> </svg>
        <div className='tooltip'></div>
      </div>
    </>
  )
}

export default ClusterOverview
