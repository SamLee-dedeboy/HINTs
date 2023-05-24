import { useState, useEffect, useMemo } from 'react'
import * as d3 from "d3"
import './EventNetwork.css'
import * as Colors from '../../colors'
import * as parameters from './parameters'
import tooltip from './Tooltip'

function EventNetwork({ network_data, svgId, nodeOnClick }) {
  const margin = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    }
  
  const svgSize = {
    width: 1562,
    height: 1000,
  }
  const canvasSize = useMemo(() => { 
    return {
      width: svgSize.width - margin.left - margin.right,
      height: svgSize.height - margin.top - margin.bottom,
    }
  }, [])


  const total_communities: number = useMemo(() => {
    const communities = new Set()
    network_data.nodes.forEach(node => {
      communities.add(node.community)
    })
    return communities.size
  }, [network_data])

  const community_colors = d3.scaleOrdinal(d3.schemeCategory10)
  // const scale = d3.scaleOrdinal(d3.schemeCategory10)
  // const color = (d) => {
  //   const ord = d.group != "word"? d.id : d.topic
  //   return scale(ord)
  // }

  const drag = simulation => {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
  }

  useEffect(() => {
    init()
  }, []);

  useEffect(() => {
    update_graph()
    // update_dag()
    // if(asTree) {
    //   update_tree()
    // } else {
    //   update_graph()
    // }
  }, [network_data]);

  function init() {
    const svg = d3.select('#' + svgId)
      .attr("viewBox", `0 0 ${svgSize.width} ${svgSize.height}`)
      .attr("width", "100%")
      .attr("height", "100%")
    const canvas = svg.append("g")
      .attr("class", "margin")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    canvas.append("g").attr("class", "edge-group")
    canvas.append("g").attr("class", "node-group")
    canvas.append("g").attr("class", "legend")
    svg.append("defs")
    // initLegend()
    update_graph()
  }

  function update_graph() {
    console.log({network_data})
    const svg = d3.select('#' + svgId)
    const canvas = svg.select("g.margin")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    // svg.selectAll("*").remove()
    canvas.select("g.node-group").selectAll("*").remove()
    canvas.select("g.edge-group").selectAll("*").remove()
    const links = network_data.links.map(d => Object.create(d));
    const nodes = network_data.nodes.map(d => Object.create(d));

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id((d: any) => d.id))
        .force("charge", d3.forceManyBody().strength(-50))  
        .force("center", d3.forceCenter(svgSize.width / 2, svgSize.height / 2)) 
        .force("x", d3.forceX(100).strength(0.04))
        .force("y", d3.forceY())
    
    const link = svg.select("g.edge-group")
        .attr("stroke", "black")
        .attr("stroke-opacity", 0.3)
        // .attr("stroke-opacity", 1)
      .selectAll("line")
      .data(links)
      .join("line")
        .attr("stroke-width", (d: any) => 1)
        // .attr("stroke-width", (d: any) => 10*d.value);

    const tooltipDiv = d3.select(".tooltip");

    const node = svg.select("g.node-group")
        .selectAll(".node")
        .data(nodes)
        .join("g")
        .attr('class', 'node')
        // .call(drag(simulation))
    
    node.append('circle')
        // .attr("r", (d: any) => parameters.node_size + 0*d.mentions.length/10)
        .attr("r", (d: any) => {
          return d.type == "entity"? parameters.node_size : 1
        })
        .attr("fill", (d: any) => {
          if(d.type == 'hyper_edge') {
            return Colors.hyper_edge_node_color
          } else {
            return community_colors(d.community)
          }
        })
        .attr("stroke", 'black')
        .attr("stroke-width", 1)
        .attr("cursor", (d: any) => "pointer")
        .call(tooltip, tooltipDiv, svgSize.width, svgSize.height, margin)
        // .on("click", (e, d: any) => {
        //     console.log(d)
        // })
        // .on("mouseover", function(this: any, e, d: any) {
        //   d3.select(this).attr("stroke-width", 3)
        //   console.log(d.community)
        // })
        // .on("mouseout", function(this: any, e, d: any) {
        //   d3.select(this).attr("stroke-width", 1)
        // })

    




    // node.append("text")
    //     .text(function(d: any) {
    //       return d.group != "topic" ? d.id : d.farm_id;
    //     })
    //     .attr("class", "node-label")
    //     .style('fill', '#000')
    //     .style('font-size', "0.6rem")
    //     .attr('x', (d: any) => (d.group == 'topic') ? -22 : 6)
    //     .attr('y', (d: any) => (d.group == 'topic') ? 5 : 3)
    //     .attr("pointer-events", "none")
    //     .attr("opacity", (d: any) => (d.group == "topic")? 1:0)

    const radius = 5;
    
    simulation.on("tick", function(this: any) {
      link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

      node.attr(
        "transform",
        (d: any) =>
          `translate(${Math.max(
            radius,
            Math.min(svgSize.width - radius, d.x)
          )}, ${Math.max(radius, Math.min(svgSize.height - radius, d.y))})`
      );
    });
  }

  function initLegend() {
    const svg = d3.select('#' + svgId)
    const canvas = svg.select("g.margin")
    const legend_offset = [1480, 0]
    const legend_size = [150, 180]
    const legend_node_size = 10
    canvas.select("g.legend").selectAll("*").remove()
    const legend = canvas.select("g.legend")
      .attr("transform", `translate(${legend_offset[0]}, ${legend_offset[1]})`)
    legend.append("rect")
      .attr("class", "legend-background")
      .attr("width", legend_size[0])
      .attr("height", legend_size[1])
      .attr("x", 0)
      .attr("y", 0)
      .attr("stroke", "black")
      .attr("stroke-width", "1")
      .attr("fill", "#f9e7bd")
    // node color
    // - positive
    legend.append("circle")
      .attr("class", "positive")
      .attr("r", legend_node_size)
      .attr("cx", 2*legend_node_size)
      .attr("cy", 2*legend_node_size)
      .attr("stroke", "black")
      .attr("stroke-width", "1")
      .attr("fill", "#fb8888")
    legend.append("text")
      .attr("class", "positive-label")
      .attr("x", 2*legend_node_size + 2*legend_node_size + legend_node_size)
      .attr("y", 2*legend_node_size)
      .attr("font-size", "1rem")
      .text("positive")
      .attr("text-anchor", "bottom")
      .attr("dominant-baseline", "central")
    // - normal
    legend.append("circle")
      .attr("class", "normal")
      .attr("r", legend_node_size)
      .attr("cx", 2*legend_node_size)
      .attr("cy", 5*legend_node_size)
      .attr("stroke", "black")
      .attr("stroke-width", "1")
      .attr("fill", "white")
    legend.append("text")
      .attr("class", "normal-label")
      .attr("x", 2*legend_node_size + 2*legend_node_size + legend_node_size)
      .attr("y", 5*legend_node_size)
      .attr("font-size", "1rem")
      .text("normal")
      .attr("text-anchor", "bottom")
      .attr("dominant-baseline", "central")
    // node size 
    // - farm
    legend.append("circle")
      .attr("class", "farm")
      .attr("r", 6*parameters.node_size)
      .attr("cx", 10 + 6*parameters.node_size)
      .attr("cy", 12*legend_node_size)
      .attr("stroke", "black")
      .attr("stroke-width", "1")
      .attr("fill", "white")
    legend.append("text")
      .attr("class", "farm-label")
      .attr("x", 10 + 12*parameters.node_size + 25)
      .attr("y", 12*legend_node_size)
      .attr("font-size", "1rem")
      .text("farm")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
    legend.append("circle")
      .attr("class", "concept")
      .attr("r", parameters.node_size)
      .attr("cx", 10 + 6*parameters.node_size)
      .attr("cy", 12*legend_node_size + 6*parameters.node_size + 15)
      .attr("stroke", "black")
      .attr("stroke-width", "1")
      .attr("fill", "white")
    legend.append("text")
      .attr("class", "concept-label")
      .attr("x", 10 + 12*parameters.node_size + 25)
      .attr("y", 12*legend_node_size + 6*parameters.node_size + 15)
      .attr("font-size", "1rem")
      .text("concept")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
  }


    // invalidation.then(() => simulation.stop());
    
  return (
    <>
      <div className="event-network-container">
        <div className='event-network-header'>Event Network</div>
        <svg id={svgId} className='event-network-svg'>

        </svg>
        <div className='tooltip'></div>
      </div>
    </>
  )
}

export default EventNetwork
