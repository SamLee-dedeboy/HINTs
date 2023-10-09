// import { t_EntityNode, t_ArticleNode } from '../../types';

const sfc = {
  generate_entity_hilbert_coord(nodes: any[], canvasSize) {
    const width = peripheral_hilbert.width
    const height = peripheral_hilbert.height
    const cell_width = Math.floor(canvasSize.width/(width+2*height))
    const cell_height = Math.floor(canvasSize.height/(width+2*height))
    // let node_dict = {}
    // nodes.forEach(node => { node_dict[node.id] = node })
    nodes.sort((a, b) => a.sfc_order - b.sfc_order)
    // const total_volume = nodes.length
    // const total_spaces = peripheral_hilbert.points.length
    // const gaps = spacing.evenGaps(clusters, total_volume, total_spaces)
    nodes.forEach((node) => {
        // const node_hilbert_order = Math.min(index + gaps[node.cluster_order], peripheral_hilbert.points.length - 1)
        // console.log(node_hilbert_order, gaps)
        const node_hilbert_order = node.sfc_order
        const xy = peripheral_hilbert.getXyAtVal(node_hilbert_order)
        node.x = cell_width * xy[0]
        node.y = cell_height * xy[1] 
        // node.sfc_order = node_hilbert_order
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
  generate_gosper_coord(nodes: any[], canvasSize) {
    nodes.sort((a, b) => a.sfc_order - b.sfc_order)
    // const node_coords = {}
    // const total_volume = nodes.length
    // const total_spaces = gosper.points.length
    // const gaps = spacing.evenGaps(clusters, total_volume, total_spaces)
    nodes.forEach((node) => {
        // const node_gosper_order = Math.min(index + gaps[node.cluster_order], gosper.points.length - 1)
        const node_gosper_order = node.sfc_order
        // const node_gosper_order = node.order
        const xy = gosper.getXyAtVal(node_gosper_order)
        node.x = xy[0] * canvasSize.width
        node.y = xy[1] * canvasSize.height
        // node.sfc_order = node_gosper_order
        // node_coords[node.id] = [node.x, node.y]
        // node_coords[node.id] = node
        node.cell_width = 10
        node.cell_height = 10
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
      .transition().delay((_, i) => i*2).duration(5)
      .attr("opacity", 1)
  },

  initPeripheral(peripheral) {
    if(peripheral) 
    peripheral_hilbert.init(peripheral.points, peripheral.width, peripheral.height)
  },
  initGosper(gosper_data) {
    if(gosper_data) 
    gosper.init(gosper_data)
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

const gosper = {
    points: [],
    init(points) {
        this.points = points
    },
    getXyAtVal(val) {
        return this.points[val]
    }
}

export default sfc;