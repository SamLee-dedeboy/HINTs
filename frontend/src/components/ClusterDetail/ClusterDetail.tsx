import * as d3 from "d3"
import { useState, useMemo, useEffect } from 'react'
import "./ClusterDetail.css"
import { t_EventHGraph, t_Cluster } from "../../types.ts"

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
  const node_radius = 3.5
  const clusterColorScale = d3.scaleOrdinal(d3.schemeCategory10)


    
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
    canvas.append("g").attr("class", "hyperedge-node-group")
    canvas.append("g").attr("class", "other-cluster-node-group")
    canvas.append("g").attr("class", "link-group")
    // addBrush()
  }


  function update_cluster() {
    const svg = d3.select('#' + svgId)
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
