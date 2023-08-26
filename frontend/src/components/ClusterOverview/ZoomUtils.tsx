import * as d3 from "d3"
const zoom: any = d3.zoom()
            .scaleExtent([0.5, 10])
            .on("zoom", handleZoom)

function handleZoom(event) {
    const { transform } = event
    console.log(transform)
    d3.selectAll("g.article-border-group").attr("transform", transform)
    d3.selectAll("g.article-node-group").attr("transform", transform)
    d3.selectAll("g.entity-node-group").attr("transform", transform)
    d3.selectAll("g.entity-border-group").attr("transform", transform)
    d3.select("rect.center-area-background").attr("transform", transform)

    const cluster_label_group = d3.selectAll("g.cluster-label-group")
        .attr("transform", function() {
            const group = d3.select(this)
            const tag_rect = group.select("rect.cluster-label-border")
            const translateX = +tag_rect.attr("x") * event.transform.k + event.transform.x + +tag_rect.attr("width")/2 * (event.transform.k-1)  - +tag_rect.attr("x")
            const translateY = +tag_rect.attr("y") * event.transform.k + event.transform.y + +tag_rect.attr("height")/2 * (event.transform.k-1) - +tag_rect.attr("y")
            return `translate(${translateX}, ${translateY})`
        })
    // const sub_cluster_label_group = d3.selectAll("g.sub_cluster-label-group")
    //     .attr("transform", function() {
    //         const group = d3.select(this)
    //         const tag_rect = group.select("rect.cluster-label-border")
    //         const translateX = +tag_rect.attr("x") * event.transform.k + event.transform.x + +tag_rect.attr("width")/2 * (event.transform.k-1)  - +tag_rect.attr("x")
    //         const translateY = +tag_rect.attr("y") * event.transform.k + event.transform.y + +tag_rect.attr("height")/2 * (event.transform.k-1) - +tag_rect.attr("y")
    //         return `translate(${translateX}, ${translateY})`
    //     })
}

export default zoom