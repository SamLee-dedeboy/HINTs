import * as d3 from "d3"
import { useState, useMemo, useEffect } from 'react'
import "./Storyline.css"
import { t_EventHGraph, t_Cluster, t_StorylineData } from "../../types.ts"

function formatDate(date_str) {
  const date = new Date(date_str)
  let mm = date.getMonth() + 1; // getMonth() is zero-based
  let dd = date.getDate();
  return [date.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
         ].join('/');
}

function compareDateStr(date_str1, date_str2, reverse=false) {
  const date1 = new Date(formatDate(date_str1)).getTime()
  const date2 = new Date(formatDate(date_str2)).getTime()
  return date1 - date2
}

interface StorylineProps {
  svgId: string
  data: t_StorylineData,
  article_num_threshold: number
  onNodesSelected?: (node_ids: string[]) => void
}

function Storyline({svgId, data, article_num_threshold, onNodesSelected}: StorylineProps) {
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
  }, [margin, svgSize])

  const articleClusterColorScale = d3.scaleOrdinal(d3.schemeTableau10)

  const storylineData: any = useMemo(() => {
    let res: any = {
      protagonists: [],
      arguments: [], 
    }
    Object.keys(data.storyline).forEach((entity) => {
      let total_articles: number = 0
      const entity_storyline = data.storyline[entity]
      Object.keys(entity_storyline).forEach((cluster_label) => {
        const articles = entity_storyline[cluster_label]
        articles.sort((a1, a2) => compareDateStr(a1.date, a2.date))
        total_articles += articles.length
      })
      if(total_articles < article_num_threshold) {
        res.arguments.push({
          "id": entity,
          "total_articles": total_articles,
        })
      } else {
        res.protagonists.push({
          "id": entity,
          "storylines": entity_storyline,
          "total_articles": total_articles,
        })
      }
    })
    return res
  }, [data.storyline])

  // scales & constants
  const node_radius = 5.5

  // const timeRange = useMemo(() => {
  //   const max_date = new Date(Math.max.apply(null, data.hyperedge_nodes.map(node => new Date(formatDate(node.date))) as any[]))
  //   const min_date = new Date(Math.min.apply(null, data.hyperedge_nodes.map(node => new Date(formatDate(node.date))) as any[]))
  //   return [min_date, max_date]
  // }, [data])

  // const dateScale = d3.scaleTime().domain(timeRange).range([canvasSize.start_y, canvasSize.end_y])

    
  useEffect(() => {
    init()
  }, []);

  useEffect(() => {
    update_storyline()
  }, [data]);

  function init() {
    const svg = d3.select('#' + svgId)
      .attr("viewBox", `0 0 ${svgSize.width} ${svgSize.height}`)
      .attr("overflow", "visible")
    const canvas = svg.append("g")
      .attr("class", "margin")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    const protagonist_group = canvas.append("g").attr("class", "protagonist_group")
    const entity_group = canvas.append("g").attr("class", "entity_group")
  }


  function update_storyline() {
    console.log(storylineData)
    const canvas = d3.select('#' + svgId).select("g.margin")
    const protagonist_group = canvas.select("g.protagonist_group")
    const protagonist_width = 180
    const protagonist_offset = 50
    const storylines = protagonist_group.selectAll("g.storyline")
      .data(storylineData.protagonists)
      .join("g")
      .attr("class", "storyline")
      .attr("transform", (d: any, protagonist_index) => `translate(${protagonist_index*(protagonist_width+protagonist_offset)}, 0)`)
      .each(function(protagonist_data: any) {
        const id = protagonist_data.id
        const title = data.entity_data[id].title
        const storylines_grouped = protagonist_data.storylines
        const clusters = Object.keys(storylines_grouped)
        const total_articles = protagonist_data.total_articles
        const entity_node_radius = 4*node_radius
        const protagonist = d3.select(this).selectAll("circle.protagonist_node")
          .data([protagonist_data])
          .join("circle")
          .attr("class", "protagonist_node")
          .attr("r", entity_node_radius)
          .attr("cx", (clusters.length-1)*2*node_radius)
          .attr("cy", 30)
          .attr("stroke", "black")
          .attr("stroke-width", 1)
          .attr("fill", "white")
          .attr("pointer-events", "none")

        const protagonist_label = d3.select(this).selectAll("text.protagonist_label")
          .data([title])
          .join("text")
          .text(d => d)
          .attr("class", "protagonist_label")
          .attr("x", -20)
          .attr("y", 0)
          .attr("pointer-events", "none")
        
        d3.select(this).selectAll("g.storyline")
          .data(clusters)
          .join("g")
          // .attr("transform", (d: any, cluster_index) => `translate(${cluster_index*((protagonist_width-clusters.length*2*node_radius)/(clusters.length-1))}, 100)`)
          .attr("transform", (d: any, cluster_index) => `translate(${cluster_index*4*node_radius}, 100)`)
          .each(function(cluster_label: string) {
            const articles = storylines_grouped[cluster_label]
            d3.select(this).selectAll("circle.storyline_node")
              .data(articles)
              .join("circle")
              .attr("class", "storyline_node")
              .attr("r", node_radius)
              .attr("cx", 0)
              .attr("cy", (d: any, i) => i * 2.5*node_radius)
              .attr("stroke", "black")
              .attr("stroke-width", 1)
              .attr("fill", articleClusterColorScale(cluster_label))
              .attr("pointer-events", "none")
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
          Storyline
        </div>
        <div className="svg-container flex overflow-hidden"> 
            <svg id={svgId} className='single-cluster-svg'> </svg>
        </div>
        <div className='tooltip'></div>
      </div>
    </>
  )
}

export default Storyline
