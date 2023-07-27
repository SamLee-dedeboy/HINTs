import * as d3 from "d3"
import { useState, useMemo, useEffect } from 'react'
import "./ClusterDetail.css"
import { t_EventHGraph, t_Cluster } from "../../types.ts"

function formatDate(date_str) {
  const date = new Date(date_str)
  let mm = date.getMonth() + 1; // getMonth() is zero-based
  let dd = date.getDate();
  return [date.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
         ].join('/');
}

interface ClusterDetailProps {
  svgId: string
  cluster_data: t_Cluster
  onNodesSelected: (node_ids: string[]) => void
}

function ClusterDetail({svgId, cluster_data, onNodesSelected}: ClusterDetailProps) {
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
  const node_radius = 5.5
  const clusterColorScale = d3.scaleOrdinal(d3.schemeCategory10)

  const timeRange = useMemo(() => {
    const max_date = new Date(Math.max.apply(null, cluster_data.hyperedge_nodes.map(node => new Date(formatDate(node.date))) as any[]))
    const min_date = new Date(Math.min.apply(null, cluster_data.hyperedge_nodes.map(node => new Date(formatDate(node.date))) as any[]))
    return [min_date, max_date]
  }, [cluster_data])

  const dateScale = d3.scaleTime().domain(timeRange).range([canvasSize.start_y, canvasSize.end_y])
  const date_bboxes = generate_date_bboxes()

    
  useEffect(() => {
    init()
  }, []);

  useEffect(() => {
    update_cluster()
  }, [cluster_data]);

  function init() {
    const svg = d3.select('#' + svgId)
      .attr("viewBox", `0 0 ${svgSize.width} ${svgSize.height}`)
      .attr("overflow", "visible")
    const canvas = svg.append("g")
      .attr("class", "margin")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    canvas.append("g").attr("class", "date-bboxes-group")
    canvas.append("g").attr("class", "hyperedge-node-group")
    canvas.append("g").attr("class", "other-cluster-node-group")
    canvas.append("g").attr("class", "link-group")
    // addBrush()
    drawDateBboxes(date_bboxes)
  }


  function update_cluster() {
    const svg = d3.select('#' + svgId)
    add_coord_by_date(cluster_data)
    // add_cluster_label(graph)
    const link_group = svg.select('g.link-group')
    const links = link_group.selectAll("line.link")
      .data(cluster_data.links)
      .join("line")
        .attr("class", "link")
        .attr("stroke", (d: any) => d.color)
        .attr("stroke-width", 1)
        .attr("opacity", 0.2)
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)
    console.log(cluster_data.hyperedge_nodes)
    const hyperedge_node_group = d3.select('#' + svgId).select('g.hyperedge-node-group')
    const hyperedge_nodes = hyperedge_node_group.selectAll("circle.hyperedge_node")
      .data(cluster_data.hyperedge_nodes)
      .join("circle")
        .attr("class", "hyperedge_node")
        .attr("r", node_radius)
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("fill", (d: any) => d.cluster_color = clusterColorScale(d.cluster_label))
        .attr("opacity", 0.8)
        .attr("pointer-events", "none")
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y)
  }

  function add_coord_by_date(cluster_data: t_Cluster) {
    const dates_bin = {}
    cluster_data.hyperedge_nodes.forEach(hyperedge_node => {
      const dateStr = formatDate(hyperedge_node.date)
      const date = new Date(dateStr)
      // month offset
      const month = date.getMonth() // JAN = 0, DEC=11
      const month_offset_x = date_bboxes[month].x
      const month_offset_y = date_bboxes[month].y

      // day offset
      const dateIntoMonth = date.getDate()-1
      console.log(dateIntoMonth, month, date_bboxes, date_bboxes[month].dates)
      const date_offset_x = date_bboxes[month].dates[dateIntoMonth].x
      const date_offset_y = date_bboxes[month].dates[dateIntoMonth].y

      if(!dates_bin[dateStr]) dates_bin[dateStr] = 0
      const bin_index = dates_bin[dateStr]
      const node_offset = node_radius
      const bbox_offset = [month_offset_x + date_offset_x, month_offset_y + date_offset_y]
      const bbox_width = date_bboxes[month].dates[dateIntoMonth].width
      const bbox_height = date_bboxes[month].dates[dateIntoMonth].height
      const coordIntoCell = generate_spiral_coord(bbox_offset, bbox_width, bbox_height, bin_index, node_radius)
      hyperedge_node.x = coordIntoCell[0]
      hyperedge_node.y = coordIntoCell[1]
      // hyperedge_node.x = month_offset_x + date_offset_x + node_offset * bin_index
      // hyperedge_node.y = month_offset_y + date_offset_y + node_offset * bin_index
      dates_bin[dateStr]++;
    })
  }

  function generate_spiral_coord(start, width, height, order, radius) {
    console.log("coord of ", order)
    const cellWidth = width / radius
    const cellHeight = height / radius
    const center = [start[0] + width/2, start[1] + height/2]
    const coords = [
      center, // 1
      [center[0] + cellWidth, center[1]], // 2
      [center[0] + cellWidth, center[1] - cellHeight], // 3
      [center[0], center[1] - cellHeight], //4
      [center[0] - cellWidth, center[1] - cellHeight], // 5
      [center[0] - cellWidth, center[1]], // 6
      [center[0] - cellWidth, center[1] + cellHeight], // 7
      [center[0], center[1] + cellHeight], // 8
      [center[0] + cellWidth, center[1] + cellHeight], // 9
    ]
    return coords[order%9]
  }

  function generate_date_bboxes() {
    let date_bboxes = {}
    const monthMargin = [10, 10]
    // month parameters
    const row_num_month = 4
    const col_num_month = 3
    const monthWidth = (canvasSize.width - monthMargin[0]*(col_num_month-1)) / col_num_month
    const monthHeight = (canvasSize.height - monthMargin[1]*(row_num_month-1)) / row_num_month
    // date parameters
    const col_num_date = 7
    const row_num_date = 5
    const dateWidth = monthWidth / col_num_date
    const dateHeight = monthHeight / row_num_date
    for(let month = 0; month < 12; month++) {
      const row_index_month = Math.floor(month / col_num_month)
      const col_index_month = month % col_num_month
      const month_offset_x = col_index_month * (monthWidth + monthMargin[0])
      const month_offset_y = row_index_month * (monthHeight + monthMargin[1])
      date_bboxes[month] = {
        x: month_offset_x,
        y: month_offset_y,
        width: monthWidth,
        height: monthHeight,
        dates: {}
      }
      const date_num_list = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      for(let date = 0; date < date_num_list[month]; date++) {
        const row_index_date = Math.floor(date / col_num_date)
        const col_index_date = date % col_num_date
        const date_offset_x = col_index_date * dateWidth
        const date_offset_y = row_index_date * dateHeight
        date_bboxes[month].dates[date] = {
          x: date_offset_x,
          y: date_offset_y,
          width: dateWidth,
          height: dateHeight
        }
      }
    }
    return date_bboxes
  }

  function drawDateBboxes(date_bboxes) {
    const bboxes_group = d3.select('#' + svgId).select('g.date-bboxes-group')
    bboxes_group.selectAll("*").remove()
    Object.keys(date_bboxes).forEach(month => {
      const month_bbox = date_bboxes[month]
      bboxes_group.append("rect")
        .attr("class", "month-bbox")
        .attr("x", month_bbox.x)
        .attr("y", month_bbox.y)
        .attr("rx", 10)
        .attr("width", month_bbox.width)
        .attr("height", month_bbox.height)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", "1")
      Object.keys(month_bbox.dates).forEach(date => {
        const date_bbox = month_bbox.dates[date]
        bboxes_group.append("rect")
          .attr("class", "date-bbox")
          .attr("rx", 10)
          .attr("x", month_bbox.x + date_bbox.x)
          .attr("y", month_bbox.y + date_bbox.y)
          .attr("width", date_bbox.width)
          .attr("height", date_bbox.height)
          .attr("fill", "none")
          .attr("stroke", "grey")
          .attr("stroke-width", "1")
      })
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
      <div className="single-cluster-container flex flex-col items-stretch h-full flex-auto">
        <div className='single-cluster-header'>
          Cluster: {cluster_data.id}
        </div>
        <div className="svg-container flex overflow-hidden"> 
            <svg id={svgId} className='single-cluster-svg'> </svg>
        </div>
        <div className='tooltip'></div>
      </div>
    </>
  )
}

export default ClusterDetail
