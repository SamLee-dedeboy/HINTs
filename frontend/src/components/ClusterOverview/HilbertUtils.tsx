
import d3Hilbert from 'd3-hilbert';
import spacing from "./SpacingUtils"
import { t_EntityNode, t_ArticleNode } from '../../types';
import { d_HilbertNode } from '../../types/Node';

const hilbert = {
  generate_hilbert_coord(nodes: t_ArticleNode[], clusters, cluster_order, canvasSize, spacing_flag='even') {
    let node_dict = {}
    nodes.forEach(node => { node_dict[node.id] = node })
    // const hilbert_order = Math.ceil(Math.log(nodes.length) / Math.log(4))+0 // log_4(nodes.length)
    const hilbert_order = Math.ceil(Math.log(7546) / Math.log(4))+0 // log_4(nodes.length)
    const hilbert = d3Hilbert().order(hilbert_order)
    const grid_length = Math.pow(2, hilbert_order)
    const cell_width = canvasSize.width / grid_length
    const cell_height = canvasSize.height / grid_length
    console.log("center area", cell_width, cell_height)
    const total_cluster_gap = Math.pow(4, hilbert_order) - 1 - nodes.length
    // const total_volume = 2*nodes.length - clusters[cluster_order[0]].length - clusters[cluster_order[cluster_order.length-1]].length
    const total_volume = nodes.length
    // const gaps = centerGaps(cluster_order, total_volume, total_cluster_gap)
    const padding = total_cluster_gap / nodes.length 
    console.log(padding, total_cluster_gap * 0.2, nodes.length, total_cluster_gap)
    const gaps = spacing_flag === 'even' ? spacing.evenGaps(clusters, cluster_order, total_volume, total_cluster_gap) : spacing.centerGaps(clusters, cluster_order, total_volume, total_cluster_gap, padding)

    // assign hilbert coord to nodes
    nodes.sort((a, b) => a.order - b.order)
    const node_coords = {}
    nodes.forEach((node, index) => {
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
  },

  generate_entity_hilbert_coord(nodes: t_EntityNode[], clusters, cluster_order, canvasSize) {
    const width = peripheral_hilbert.width
    const height = peripheral_hilbert.height
    const cell_width = Math.floor(canvasSize.width/(width+2*height))
    const cell_height = Math.floor(canvasSize.height/(width+2*height))
    console.log("peripheral: ", cell_width, cell_height, canvasSize)
    let node_dict = {}
    nodes.forEach(node => { node_dict[node.id] = node })
    nodes.sort((a, b) => a.order - b.order)
    const total_volume = nodes.length
    const total_cluster_gap = peripheral_hilbert.points.length - 1 - nodes.length
    const padding = total_cluster_gap / nodes.length 
    const gaps = spacing.evenGaps(clusters, cluster_order, total_volume, total_cluster_gap)
    nodes.forEach((node, index) => {
        const node_hilbert_order = Math.min(index + gaps[node.cluster_order], peripheral_hilbert.points.length - 1)
        const xy = peripheral_hilbert.getXyAtVal(node_hilbert_order)
        node.x = cell_width * xy[0]
        node.y = cell_height * xy[1] 
        node.hilbert_order = node_hilbert_order
        // if(previousNodeDict[node.id] !== undefined)
        // if(previousNodeDict[node.id].x != node.x || previousNodeDict[node.id].y != node.y) {
        //   console.log("node moved", node.id, node.cluster_label, node.x, node.y, node.order, node_hilbert_order, previousNodeDict[node.id].x, previousNodeDict[node.id].y, previousNodeDict[node.id].order, previousNodeDict[node.id].hilbert_order)
        // }
        // node_coords[node.id] = [node.x, node.y]
        // node_coords[node.id] = node
        node.cell_width = cell_width,
        node.cell_height = cell_height
        // node.radius = Math.min(cell_width, cell_height) / 2.8
    })
  },

  updatePeripheral(peripheral, svgSize, svg) {
    const node_radius = 4
    const width = peripheral.width
    const height = peripheral.height
    const cell_width = Math.floor(svgSize.width/(width+2*height))
    const cell_height = Math.floor(svgSize.height/(width+2*height))
    const point_group = svg.select("g.peripheral-group").attr("transform", "translate(30, 30)")
    point_group.selectAll("circle.point")
      .data(peripheral.points)
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
  },

  initPeripheral(peripheral) {
    peripheral_hilbert.init(peripheral.points, peripheral.width, peripheral.height)
  }

}

const peripheral_hilbert = {
    points: [],
    width: 0,
    height: 0,
    init(points, width, height) {
        this.points = points
        this.width = width
        this.height = height
    },

    getXyAtVal(val) {
        return this.points[val]
    }
}
export default hilbert;