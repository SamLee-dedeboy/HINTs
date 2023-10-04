import FormItemLabel from "antd/es/form/FormItemLabel"
import * as d3 from "d3"
let start_pos: number[] = []
let original_pos: number[] = [0, 0]
let line_color = "black"
export function dragStarted(e, d) {
    console.log("drag started")
    start_pos = [e.x, e.y]
    const regex = /translate\((-?\d+\.?\d*),(-?\d+\.?\d*)\)/;
    const label_rect = d3.select(this)
    const original_translate_regex = label_rect.attr("transform").match(regex);
    if(original_translate_regex != null) {
        original_pos = [parseFloat(original_translate_regex[1]), parseFloat(original_translate_regex[2])]
    }
    const group = d3.select(this.parentNode)
    line_color = group.select("line.sub-cluster-label-border-connector").attr("stroke")
    group.select("line.sub-cluster-label-border-connector").remove()
}

export function dragged(e, d) { 
    console.log("dragged")
    const cur_pos = [e.x, e.y]
    const border_offset = [original_pos[0] + cur_pos[0] - start_pos[0], original_pos[1] + cur_pos[1] - start_pos[1]]

    const label_rect = d3.select(this)
    label_rect.attr("transform", (d: any) => {
            return d.original_transform + ` translate(${border_offset[0]},${border_offset[1]})`
        })
    const label_text = d3.select(this.parentNode).select("text.sub-cluster-label")
        .attr("transform", (d: any) => {
            return d.original_transform + ` translate(${border_offset[0]},${border_offset[1]})`
        })
}

export function dragEnded(e, d) {
    const cur_pos = [e.x, e.y]
    const border_offset = [original_pos[0] + cur_pos[0] - start_pos[0], original_pos[1] + cur_pos[1] - start_pos[1]]
    // e.preventDefault()
    const label_rect = d3.select(this)
    const group = d3.select(this.parentNode)
    console.log(label_rect.node(), group.node(), d)
    const zoom = (d3.select(this.parentNode.parentNode).datum() as any).zoom || d3.zoomIdentity
    const tag_rect_y = +label_rect.attr("y")
    const tag_rect_height = +label_rect.attr("height")
    const translateY = tag_rect_y * zoom.k + zoom.y + tag_rect_height/2 * (zoom.k-1)  - tag_rect_y

    const tx = group.attr("transform").split(",")[0].split("(")[1]
    const ty = group.attr("transform").split(",")[1].split(")")[0]
    console.log(tx, ty, group.attr("transform"))
    group.append("line")
    .datum(d)
    .attr("class", "sub-cluster-label-border-connector")
    .attr("x1", d.centroid[0] * zoom.k + zoom.x)
    .attr("y1", d.centroid[1] * zoom.k + zoom.y)
    .attr("x2", d.position[0] * zoom.k + zoom.x + border_offset[0])
    .attr("y2", d.position[1] + translateY + border_offset[1])
    .attr("stroke-width", 3)
    .attr("stroke", line_color)
    .attr("transform", `translate(${-tx}, ${-ty})`)
    // .attr("opacity", 0)
    .lower()
    // .transition().delay(300).duration(1000)
    .attr("opacity", 1)
    console.log("drag ended")
    // d3.selectAll("path.concave-hull").attr("pointer-events", "auto")
    // const centerArea = d3.select("g.margin").select("g.center-area")
    // const cluster_nodes = centerArea.selectAll("circle.article-node").filter((node: any) => node.cluster_label === d.cluster_label)
    // const cur_pos = [e.x, e.y]
    // const offset = [original_pos[0] + cur_pos[0] - start_pos[0], original_pos[1] + cur_pos[1] - start_pos[1]]
    // cluster_nodes.attr("cx", (node: any) => node.x + offset[0])
    //     .attr("cy", (node: any) => node.y + offset[1])
    //     .attr("transform", "translate(0,0)")

}
