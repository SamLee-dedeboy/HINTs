import * as d3 from "d3"
let start_pos: number[] = []
let original_pos: number[] = [0, 0]
let merge_found = false
export function dragStarted(e, d) {
    console.log("drag started")
    start_pos = [e.x, e.y]
    const regex = /translate\((-?\d+\.?\d*),(-?\d+\.?\d*)\)/;
    const cluster_border = d3.select(this)
    const original_translate_regex = cluster_border.attr("transform").match(regex);
    if(original_translate_regex != null) {
        original_pos = [parseFloat(original_translate_regex[1]), parseFloat(original_translate_regex[2])]
    }
}

export function dragged(e, d) { 
    console.log("dragged")
    const cur_pos = [e.x, e.y]
    const mouse_offset = [cur_pos[0] - start_pos[0], cur_pos[1] - start_pos[1]]
    const border_offset = [original_pos[0] + cur_pos[0] - start_pos[0], original_pos[1] + cur_pos[1] - start_pos[1]]

    const centerArea = d3.select("g.margin").select("g.center-area")
    const dragged_cluster_label = d.cluster_label
    const cluster_nodes = centerArea.selectAll("circle.article-node").filter((node: any) => node.cluster_label === d.cluster_label)
        .attr("transform", `translate(${mouse_offset[0]},${mouse_offset[1]})`)
    const cluster_border = d3.select(this)
    const tooltipDiv = d3.select(".tooltip");
    cluster_border.attr("transform", (d: any) => {
            return `translate(${border_offset[0]},${border_offset[1]})`
        })
    if(mouse_offset[0] + mouse_offset[1] > 10)
        d3.selectAll("path.concave-hull").attr("pointer-events", "none")
}

export function dragEnded(e, d) {
    console.log("drag ended")
    d3.selectAll("path.concave-hull").attr("pointer-events", "auto")
    const centerArea = d3.select("g.margin").select("g.center-area")
    const cluster_nodes = centerArea.selectAll("circle.article-node").filter((node: any) => node.cluster_label === d.cluster_label)
    const cur_pos = [e.x, e.y]
    const offset = [original_pos[0] + cur_pos[0] - start_pos[0], original_pos[1] + cur_pos[1] - start_pos[1]]
    cluster_nodes.attr("cx", (node: any) => node.x + offset[0])
        .attr("cy", (node: any) => node.y + offset[1])
        .attr("transform", "translate(0,0)")

    // if(!merge_found) {
    //     cluster_nodes.attr("transform", "translate(0,0)")
    //     d3.select(this).attr("transform", `translate(${original_pos[0]},${original_pos[1]})`)
    // } else {
    //     const cur_pos = [e.x, e.y]
    //     const offset = [original_pos[0] + cur_pos[0] - start_pos[0], original_pos[1] + cur_pos[1] - start_pos[1]]
    //     cluster_nodes.attr("cx", (node: any) => node.x + offset[0])
    //         .attr("cy", (node: any) => node.y + offset[1])
    //         .attr("transform", "translate(0,0)")
    // }
}
