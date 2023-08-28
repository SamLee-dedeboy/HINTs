import * as d3 from "d3"
import tags from "./TagUtils"
const zoom: any = d3.zoom()
            .scaleExtent([0.5, 10])
            .on("zoom", handleZoom)
zoom.resetZoom = resetZoom
zoom.setProps = setProps
const props: any = {}
function setProps(
    svgId=undefined, 
    articleClusterBorderPoints=undefined, 
    article_graph=undefined, 
    articleSubClusterColorDict
) {
    if(svgId) props.svgId = svgId
    if(articleClusterBorderPoints) props.articleClusterBorderPoints = articleClusterBorderPoints
    if(article_graph) props.article_graph = article_graph
    if(articleSubClusterColorDict) props.articleSubClusterColorDict = articleSubClusterColorDict
}

function handleZoom(event) {
    // tags.removeSubClusterLabels(zoom.svgId)
    const svg = d3.select("#" + zoom.svgId)
    svg.select("line.cluster-label-border-connector").remove()
    svg.selectAll("path.concave-hull")
        .attr("stroke-width", 1)
        .attr("stroke", "black")

    const { transform } = event
    d3.selectAll("g.article-border-group").attr("transform", transform)
    d3.selectAll("g.article-node-group").attr("transform", transform)
    // d3.selectAll("g.entity-node-group").attr("transform", transform)
    // d3.selectAll("g.entity-border-group").attr("transform", transform)
    // d3.select("rect.center-area-background").attr("transform", transform)

    const cluster_label_group = d3.selectAll("g.cluster-label-group")
        .attr("transform", function(d: any) {
            const group = d3.select(this)
            const tag_rect = group.select("rect.cluster-label-border")
            const translateX = +tag_rect.attr("x") * event.transform.k + event.transform.x + +tag_rect.attr("width")/2 * (event.transform.k-1)  - +tag_rect.attr("x")
            let translateY = +tag_rect.attr("y") * event.transform.k + event.transform.y + +tag_rect.attr("height")/2 * (event.transform.k-1) - +tag_rect.attr("y")
            d.center_zoom_translate = `translate(${translateX}, ${translateY})`
            
            if(d.lifted) translateY += d.lifted_offset*event.transform.k
            d.zoom_translate = `translate(${translateX}, ${translateY})`
            d.zoom = event.transform
            return `translate(${translateX}, ${translateY})`
        })
    d3.selectAll("line.cluster-label-border-connector")
        .attr("x1", (d: any) => d.centroid[0]*transform.k + transform.x)
        .attr("y1", (d: any) => d.centroid[1]*transform.k + transform.y)
        .attr("x2", (d: any) => d.centroid[0]*transform.k + transform.x)
        .attr("y2", (d: any) => {
            const group = d3.selectAll("g.cluster-label-group").filter((e: any) => e.cluster_label == d.cluster_label)
            const rect_transform = group.attr("transform")
            const rect_transform_y = parseFloat(rect_transform.split(",")[1].replace(")", ""))
            const tag_rect = group.select("rect.cluster-label-border")
            const rect_y = +tag_rect.attr("y")
            const rect_height = +tag_rect.attr("height")
            return rect_y + rect_height + rect_transform_y
        })
    const sub_cluster_label_group = d3.selectAll("g.sub-cluster-label-group")
        .each(function(d: any) {
            const group = d3.select(this)
            // group.selectAll("circle").attr("transform", transform)
            // tag needs to keep original size
            const tag_rect = group.select("rect.sub-cluster-label-border")
            if(tag_rect.empty()) return 
            const translateX = +tag_rect.attr("x") * event.transform.k + event.transform.x + +tag_rect.attr("width")/2 * (event.transform.k-1)  - +tag_rect.attr("x")
            const translateY = +tag_rect.attr("y") * event.transform.k + event.transform.y + +tag_rect.attr("height")/2 * (event.transform.k-1) - +tag_rect.attr("y")
            tag_rect.attr("transform", `translate(${translateX}, ${translateY})`)
            group.selectAll("text.sub-cluster-label").attr("transform", `translate(${translateX}, ${translateY})`)

            // update connectors accordingly
            group.selectAll("line.sub-cluster-label-border-connector")
                .attr("x1", d.centroid[0] * event.transform.k + event.transform.x)
                .attr("y1", d.centroid[1] * event.transform.k + event.transform.y)
                .attr("x2", d.position[0] * event.transform.k + event.transform.x)
                .attr("y2", d.position[1] + translateY)
        })
}
function resetZoom() {
    d3.selectAll("g.article-border-group").call(zoom.transform, d3.zoomIdentity)
    d3.selectAll("g.article-node-group").call(zoom.transform, d3.zoomIdentity)
    d3.selectAll("g.entity-node-group").call(zoom.transform, d3.zoomIdentity)
    d3.selectAll("g.entity-border-group").call(zoom.transform, d3.zoomIdentity)
    d3.select("rect.center-area-background").call(zoom.transform, d3.zoomIdentity)
    d3.selectAll("g.cluster-label-group").call(zoom.transform, d3.zoomIdentity)
}


export default zoom