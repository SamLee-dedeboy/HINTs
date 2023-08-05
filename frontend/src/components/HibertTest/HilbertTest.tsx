import { useState, useEffect, useMemo, useRef } from 'react'
import * as d3 from "d3"


function HilbertTest({svgId, points, width, height}) {
  const margin = {
      left: 0,
      right: 30,
      top: 30,
      bottom: 30
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
  }, [margin, svgSize])

  const cell_width = useMemo(() => Math.floor(svgSize.width/(width+2*height)), [svgSize, width])
  const cell_height = useMemo(() => Math.floor(svgSize.height/(width+2*height)), [svgSize, height])
  const node_radius = 5.5

  useEffect(() => {
    init()
    if(points) update()
  }, []);

  useEffect(() => {
    update()
  }, [points])

  function init() {
    const svg = d3.select('#' + svgId)
      .attr("viewBox", `0 0 ${svgSize.width} ${svgSize.height}`)
      .attr("overflow", "visible")
    const canvas = svg.append("g")
      .attr("class", "margin")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    const point_group = canvas.append("g").attr("class", "point_group")
  }

  function update() {
    const canvas = d3.select('#' + svgId).select("g.margin")
    const point_group = canvas.select("g.point_group")
    point_group.selectAll("circle.point")
      .data(points)
      .enter()
      .append("circle").attr("class", "point")
      .attr("r", node_radius)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("fill", "white")
      .attr("pointer-events", "none")
      .attr("opacity", 0)
      .attr("cx", (d: any) => d[0]*cell_width)
      .attr("cy", (d: any) => d[1]*cell_height)
      .transition().delay((d, i) => i*2).duration(5)
      .attr("opacity", 1)
  }

  return (
    <>
      <div className="container flex flex-col items-stretch h-full flex-auto">
        <div className='header'>
          Peripheral Hilbert
        </div>
        <div className="svg-container flex overflow-visible"> 
            <svg id={svgId} className='svg'> </svg>
        </div>
      </div>
    </>
  )
}

export default HilbertTest
