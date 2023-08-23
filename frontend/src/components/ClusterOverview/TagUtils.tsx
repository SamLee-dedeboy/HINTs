import * as d3 from "d3"
import borders from "./BorderUtils";
import { d_ArticleGraph } from "../../types";

const tags = {
    liftArticleClusterLabel(svgId, cluster_data) {
      const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
      // move cluster label to top
      const tspans = centerArea.select("g.article-border-tag-group")
        .selectAll("text.cluster-label")
        .filter((filter_data: any) => cluster_data.cluster_label === filter_data.cluster_label)
        .selectAll("tspan")
      const tag_y = Math.max(0, cluster_data.min_y - 18*tspans.nodes().length)
      const lineHeight = (tspans.nodes()[0]! as any).getExtentOfChar(0).height
      tspans.transition().duration(1000)
        .attr("y", tag_y)
      const tag_border = centerArea.select("g.article-border-tag-group")
        .selectAll("rect.cluster-label-border")
        .filter((filter_data: any) => cluster_data.cluster_label === filter_data.cluster_label)
        .transition().duration(1000)
        .attr("transform", (border_d: any) => `translate(0, ${tag_y - border_d.y - lineHeight})`)
    },

    restoreLiftedArticleClusterLabel(svgId, cluster_data) {
      const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
      const cluster_label_node = centerArea.select("g.article-border-tag-group")
        .selectAll("text.cluster-label")
        .filter((filter_data: any) => cluster_data.cluster_label === filter_data.cluster_label)
        .selectAll("tspan")
        .transition().duration(100)
        .attr("y", (label_data: any) => label_data.centroid[1])
      const tag_border = centerArea.select("g.article-border-tag-group")
        .selectAll("rect.cluster-label-border")
        .filter((filter_data: any) => cluster_data.cluster_label === filter_data.cluster_label)
        .transition().duration(100)
        .attr("transform", "translate(0,0)")
    },

    updateArticleSubClusterLabels(
        svgId: string, 
        article_graph: d_ArticleGraph,
        cluster_label: string, 
        sub_cluster_labels: string[], 
        concavity: number
    ) {
        const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
        const cluster_nodes = article_graph.article_nodes.filter(node => node.cluster_label === cluster_label)
        const tag_data: any[] = []
        sub_cluster_labels.forEach(sub_cluster_label => {
            const sub_cluster_node_data = cluster_nodes.filter(node => node.sub_cluster_label === sub_cluster_label)
            if(sub_cluster_node_data.length <= 5) return
            const points = sub_cluster_node_data.map(node => [node.x, node.y])
            const { polygon, centroid } = borders.generate_polygon(points, concavity)
            tag_data.push({
                "label": sub_cluster_label,
                "centroid": centroid
            })
        })
        const border_tag_group = centerArea.select("g.article-border-tag-group")
        border_tag_group.selectAll("text.sub-cluster-label")
        .data(tag_data, (d: any) => d.label)
        .join('text')
        .attr("class", "sub-cluster-label")
        .text(d => article_graph.hierarchical_topics[d.label])
        .attr("x", d => d.centroid[0])
        .attr("y", d => d.centroid[1])
        .attr("font-size", "0.8rem")
        .attr("text-anchor", "middle")
        .attr("pointer-events", "none")
        .call(this.wrap, 150)
    },

    removeSubClusterLabels(svgId: string) {
      const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
      centerArea.selectAll("text.sub-cluster-label").remove()
    },

    wrap(text, width) {
        text.each(function (d, i) {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line: any[] = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                x = text.attr("x"),
                y = text.attr("y"),
                dy = 0, //parseFloat(text.attr("dy")),
                tspan = text.text(null)
                    .append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("dy", dy + "em")
                    .attr("text-anchor", "bottom")
                    .attr("dominant-baseline", "central")
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node()!.getComputedTextLength() > width && line.length > 1) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("dy", ++lineNumber * lineHeight + dy + "em")
                        .attr("dominant-baseline", "central")
                        .text(word);
                }
            }
            const line_num = text.selectAll("tspan").nodes().length
            const em_to_px = 16
            text.selectAll("tspan").attr("y", parseFloat(y) - em_to_px / 2 * lineHeight * (line_num - 1) / 2)
        });
    }
}

export default tags