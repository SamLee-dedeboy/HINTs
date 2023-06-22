import { useState, useEffect, useMemo } from 'react'
import * as d3 from "d3"
import './EventHGraph.css'
import * as Colors from '../../colors'
import * as parameters from './parameters'
import tooltip from './Tooltip'
// import lasso frim './lasso'
import { Checkbox } from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import { server_address } from '../../shared'

function EventHGraph({ network_data, svgId, total_communities, nodeOnClick }) {
  const [node_pos_dict, setNodePosDict] = useState({})
  const [link_pos_dict, setLinkPosDict] = useState({})
  const margin = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    }
  
  const svgSize = useMemo(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    return { width, height }
  }, [])

  const canvasSize = useMemo(() => { 
    return {
      width: svgSize.width - margin.left - margin.right,
      height: svgSize.height - margin.top - margin.bottom,
    }
  }, [])

  const community_colors = useMemo(() => {
    let comm_color_dict = {}
    const colors = d3.scaleOrdinal(d3.schemeCategory10)
    Object.keys(network_data.communities).forEach(node => {
      const comm = network_data.communities[node]
      comm_color_dict[comm] = colors(comm)
    })
    return comm_color_dict
  }, [network_data.communities])
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
  }, [network_data]);

  function init() {
    const svg = d3.select('#' + svgId)
      .attr("viewBox", `0 0 ${svgSize.width} ${svgSize.height}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("overflow", "visible")
      // .attr("preserveAspectRatio", "none")
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
    // canvas.select("g.node-group").selectAll("*").remove()
    // canvas.select("g.edge-group").selectAll("*").remove()
    const links = network_data.links.map(d => Object.create(d));
    const nodes = network_data.nodes.map(d => {
      const datum = Object.create(d)
      if(node_pos_dict[d.id] != undefined) {
        datum.x = node_pos_dict[d.id][0]
        datum.y = node_pos_dict[d.id][1]
      }
      return datum
    });
  


    const simulation = d3.forceSimulation(nodes)
        .alphaMin(0.001)
        .force("link", d3.forceLink(links).id((d: any) => d.id).distance(10))
        .force("charge", d3.forceManyBody().strength(-25))  
        .force("center", d3.forceCenter(svgSize.width / 2, svgSize.height / 2)) 
        .force("collision", d3.forceCollide().radius((d: any) => {
          return d.type == "entity"? parameters.entity_node_size : parameters.hyperedge_node_size
        }))
        .force("x", d3.forceX(100).strength(0.04))
        .force("y", d3.forceY())
    console.log({links})
    const link = svg.select("g.edge-group")
        .attr("stroke", "black")
        .attr("stroke-opacity", 0.3)
        // .attr("stroke-opacity", 1)
      .selectAll("line")
      .data(links)
      .join("line")
        .attr("class", "edge")
        .attr("stroke-width", (d: any) => 1)

    const tooltipDiv = d3.select(".tooltip");
    console.log({nodes})
    console.log({community_colors})
    // add circle node
    svg.select("g.node-group")
        .selectAll("circle")
        .data(nodes, (d: any) => d.id)
        // .data(nodes, function(d: any) { console.log(network_data.nodes[d.index].id); return network_data.nodes[d.index].id })
        .join(
          enter => enter.append("circle").attr("class", "node")
            .attr("r", (d: any) => {
              if(d.type === "entity") 
                return parameters.entity_node_size
              else 
                return parameters.hyperedge_node_size
            })
            .attr("fill", (d: any) => {
              if(d.type === 'hyper_edge') {
                const comm_label = String(network_data.communities[d.id])
                // console.log(comm_label, community_colors(comm_label), community_colors("5"), community_colors("6"))
                return community_colors[comm_label]
                // return Colors.hyper_edge_node_color
              } else {
                return "white"
              }
            })
            .attr("stroke", 'black')
            .attr("stroke-width", 1)
            .attr("cursor", (d: any) => "pointer")
            .call(tooltip, tooltipDiv, svgSize.width, svgSize.height, margin),
          update => update,
          exit => exit.transition().duration(500).attr("transform", "translate(0, 0)").remove()
        )
    const radius = 5;
    
    let node_pos = {}
    simulation.on("tick", function(this: any) {
      svg.select("g.edge-group").selectAll("line.edge")
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);
      
      svg.select("g.node-group").selectAll("circle.node").attr("transform", (d: any) => {
          // if(d.index == 500) console.log(network_data.nodes[d.index].id)
          node_pos[d.id] = [d.x, d.y]
          return `translate(${d.x}, ${d.y})`
            // (d: any) =>
            //   `translate(${Math.max(
            //     radius,
            //     Math.min(svgSize.width - radius, d.x)
            //   )}, ${Math.max(radius, Math.min(svgSize.height - radius, d.y))})`
      });
    })
    .on("end", () => setNodePosDict(node_pos))

    // const expandNode = (selection) => {
    //   selection.attr("r", (d) => d.type == "entity"? parameters.entity_node_size + 7 : parameters.hyperedge_node_size + 7)
    //             .attr("stroke", 'red')
    //             .attr("stroke-width", 2)
    // }
    // const restoreNodeExpand = (selection) => {
    //   selection.attr("r", (d) => d.type == "entity"? parameters.entity_node_size : parameters.hyperedge_node_size)
    //             .attr("stroke", 'black')
    //             .attr("stroke-width", 1)
    // }
    // svg.call(lasso, svg.selectAll("g.node-group"), expandNode, restoreNodeExpand)
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

  async function filter_community(checkedCommunities: CheckboxValueType[]) {
    fetch(`${server_address}/filter`, {
      method: "POST",
      headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
      },
      body: JSON.stringify({communities: checkedCommunities})
  })
      .then(res => res.json())
      .then(filtered_network => {
        
      })
  }

  // const communitySelectionChanged = (checkedValues: CheckboxValueType[]) => {
  //   console.log('checked = ', checkedValues);
  // };


    // invalidation.then(() => simulation.stop());
    
  return (
    <>
      <div className="event-network-container">
        <div className='event-network-header'>
          Event Network
        </div>
        <svg id={svgId} className='event-network-svg'> </svg>
        <div className='tooltip'></div>
      </div>
    </>
  )
}

export default EventHGraph
