import * as d3 from "d3"
import borders from "./BorderUtils";
import { d_ArticleGraph } from "../../types";

const tags = {
    addArticleClusterLabel(svgId, cluster_borders, hierarchical_topics, cluster_colors) {
      const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
      const zoom = d3.zoomTransform(centerArea.node() as Element)
      // cluster label
      const tag = centerArea.selectAll("g.article-border-tag-group")
        .data(cluster_borders, (d: any) => d.cluster_label)
        .join("g")
        .attr("class", "article-border-tag-group")
        .each(function(d: any) {
          d3.select(this).select("g.cluster-label-group").remove()
          const group = d3.select(this).append("g").attr("class", "cluster-label-group")
          group.select("text.cluster-label").remove()
          group.select("rect.cluster-label-border").remove()

          // label
          group.append("text")
            .datum(d)
            .attr("class", "cluster-label")
            .text((d: any) => hierarchical_topics[d.cluster_label])
            .attr("x", (d: any) => d.centroid[0])
            .attr("y", (d: any) => d.centroid[1])
            .attr("font-size", "1.8rem")
            .attr("text-anchor", "middle")
            .attr("pointer-events", "none")
            .call(tags.wrap, 150)

          // border
          const tspans = d3.select(this).selectAll("tspan").nodes()
          const start_x = Math.min(...tspans.map((tspan: any) => tspan.getStartPositionOfChar(0).x))
          const start_y = (tspans[0]! as any).getStartPositionOfChar(0).y- (tspans[0]! as any).getExtentOfChar(0).height/2
          const width = Math.max(...tspans.map((tspan: any) => tspan.getComputedTextLength()))
          const height = tspans.reduce((total: number, tspan: any) => total + tspan!.getExtentOfChar(0).height, 0)
          const padding_x = 10
          const padding_y = 10
          const tspan_border = group.append("rect")
            .datum(d)
            .attr("class", "cluster-label-border")
            .attr("x", start_x - padding_x)
            .attr("y", d.y = start_y - padding_y)
            .attr("width", width + 2*padding_x)
            .attr("height", height + 2*padding_y)
            .attr("pointer-events", "none")
            .attr("fill", "white")
            .attr("stroke-width", 3)
            .attr('stroke', (d) => cluster_colors[d.cluster_label])
            .attr("opacity", 0.5)
            .lower()
          // const centroid = group.append("circle")
          //   .datum(d)
          //   .attr("class", "centroid")
          //   .attr("cx", (d: any) => d.centroid[0])
          //   .attr("cy", (d: any) => d.centroid[1])
          //   .attr("r", 5)
          //   .attr("fill", "red")

          const tag_rect = group.select("rect.cluster-label-border")
          const translateX = +tag_rect.attr("x") * zoom.k + zoom.x + +tag_rect.attr("width")/2 * (zoom.k-1)  - +tag_rect.attr("x")
          const translateY = +tag_rect.attr("y") * zoom.k + zoom.y + +tag_rect.attr("height")/2 * (zoom.k-1) - +tag_rect.attr("y")
          d.zoom_translate = `translate(${translateX}, ${translateY})`
          d.zoom = zoom
          group.attr("transform", `translate(${translateX}, ${translateY})`)
        })
    },

    liftArticleClusterLabel(svgId, cluster_data) {
      cluster_data.lifted = true
      const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
      // move cluster label to top
      const target_border_group = centerArea.selectAll("g.cluster-label-group")
        .filter((filter_data: any) => cluster_data.cluster_label === filter_data.cluster_label)
      const tspans = target_border_group.selectAll("tspan")
      const border_rect = target_border_group.select("rect.cluster-label-border")
        .attr("opacity", 1)
      const rect_height = +border_rect.attr("height")
      const rect_y = +border_rect.attr("y")
      const tag_y = Math.max(0, cluster_data.min_y - rect_height)
      const lineHeight = (tspans.nodes()[0]! as any).getExtentOfChar(0).height

      const zoom = (target_border_group.datum() as any).zoom
      const zoom_scale = zoom?.k || 1
      const prev_translate_str = target_border_group.attr("transform") || "translate(0,0)"
      const tag_offset_y = (cluster_data.centroid[1] - lineHeight/2 - tag_y)
      cluster_data.lifted_offset = -tag_offset_y
      target_border_group.transition().duration(1000)
        .attr("transform", prev_translate_str + " " + `translate(0, ${-tag_offset_y*zoom_scale})`)
      

      const rect_transform_y = +prev_translate_str.split(",")[1].replace(")", "") - tag_offset_y*zoom_scale
      const tag_border_connector = centerArea.append("line")
        .datum(cluster_data)
        .attr("class", "cluster-label-border-connector")
        .attr("x1", cluster_data.centroid[0]*zoom.k + zoom.x)
        .attr("y1", cluster_data.centroid[1]*zoom.k + zoom.y)
        .attr("x2", cluster_data.centroid[0]*zoom.k + zoom.x)
        .attr("y2", rect_y + rect_height + rect_transform_y)
        .attr("stroke-width", 3)
        .attr("pointer-events", "none")
        .attr("stroke", d3.select(border_rect.nodes()[0]).attr("stroke"))
        .attr("opacity", 0)
        .transition().delay(300).duration(1000)
        .attr("opacity", 1)
      target_border_group.raise()
    },

    restoreLiftedArticleClusterLabel(svgId, cluster_data) {
      cluster_data.lifted = false
      const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")

      const target_border_group = centerArea.selectAll("g.article-border-tag-group")
        .select("g.cluster-label-group")
        .filter((filter_data: any) => cluster_data.cluster_label === filter_data.cluster_label)
        .attr("transform", (d: any) => { return d.center_zoom_translate || "translate(0,0)"})
      const border_rect = target_border_group.select("rect.cluster-label-border")
        .attr("opacity", 0.5)
      const tag_border_connector = centerArea.select("line.cluster-label-border-connector").remove()
    },

    updateArticleSubClusterLabels(
        svgId: string, 
        parent_border_points: any[],
        article_graph: d_ArticleGraph,
        cluster_label: string, 
        sub_cluster_labels: string[], 
        sub_cluster_colors: any,
        concavity: number
    ) {
        const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
        const cluster_nodes = article_graph.article_nodes.filter(node => node.cluster_label === cluster_label)
        const tag_data: any[] = []
        const parent_cluster_group = centerArea.selectAll("g.article-border-tag-group")
          .filter((filter_data: any) => cluster_label === filter_data.cluster_label)
        sub_cluster_labels.forEach(sub_cluster_label => {
            const sub_cluster_node_data = cluster_nodes.filter(node => node.sub_cluster_label === sub_cluster_label)
            if(sub_cluster_node_data.length <= 5) return
            const points = sub_cluster_node_data.map(node => [node.x, node.y])
            const { polygon, centroid } = borders.generate_polygon(points, concavity)
            const { intersection_point } = borders.findIntersection(parent_border_points, centroid)
            const offset = 50
            const dy = intersection_point[1] - centroid[1] 
            const dx = intersection_point[0] - centroid[0]
            const slope = Math.abs(dy / dx)
            const offset_x = Math.sqrt(offset**2 / (1 + slope**2))
            const offset_y = slope * offset_x
            const tag_position = [intersection_point[0] + offset_x * Math.sign(dx), intersection_point[1] + offset_y * Math.sign(dy)]
            let direction;
            if(dx > 0 && dy > 0 && Math.abs(dx) > Math.abs(dy)) {
              direction = 'left'
            } else if(dx > 0 && dy > 0 && Math.abs(dx) < Math.abs(dy)) {
              direction = 'top'
            } else if(dx < 0 && dy < 0 && Math.abs(dx) > Math.abs(dy)) {
              direction = 'right'
            } else if(dx < 0 && dy < 0 && Math.abs(dx) < Math.abs(dy)) {
              direction = 'bottom'
            } else if(dx > 0 && dy < 0 && Math.abs(dx) > Math.abs(dy)) {
              direction = 'left'
            } else if(dx > 0 && dy < 0 && Math.abs(dx) < Math.abs(dy)) {
              direction = 'bottom'
            } else if(dx < 0 && dy > 0 && Math.abs(dx) > Math.abs(dy)) {
              direction = 'right'
            } else if(dx < 0 && dy > 0 && Math.abs(dx) < Math.abs(dy)) {
              direction = 'top'
            }

            tag_data.push({
                "label": sub_cluster_label,
                "centroid": centroid,
                "position": [Math.max(0, tag_position[0]), Math.max(0, tag_position[1])], // prevent negative position
                "closest_point": intersection_point,
                "direction": direction
            })
        })

        parent_cluster_group.selectAll("g.sub-cluster-label-group")
        .data(tag_data, (d: any) => d.label)
        .join('g')
        .attr("class", "sub-cluster-label-group")
        .each(function(d: any) {
          const group = d3.select(this)
          group.select("text.sub-cluster-label").remove()
          group.select("rect.sub-cluster-label-border").remove()
          group.select("line.sub-cluster-label-border-connector").remove()

          // group.append("circle")
          //   .datum(d)
          //   .attr("class", "centroid")
          //   .attr("cx", (d: any) => d.centroid[0])
          //   .attr("cy", (d: any) => d.centroid[1])
          //   .attr("r", 5)
          //   .attr("fill", "red")
          // group.append("circle")
          //   .datum(d)
          //   .attr("class", "tag")
          //   .attr("cx", (d: any) => d.position[0])
          //   .attr("cy", (d: any) => d.position[1])
          //   .attr("r", 5)
          //   .attr("fill", "blue")
          // group.append("circle")
          //   .datum(d)
          //   .attr("class", "tag")
          //   .attr("cx", (d: any) => d.closest_point[0])
          //   .attr("cy", (d: any) => d.closest_point[1])
          //   .attr("r", 5)
          //   .attr("fill", "black")


          const zoom = (parent_cluster_group?.datum() as any).zoom || d3.zoomIdentity
          const sub_cluster_label = group.append('text')
            .datum(d)
            .attr('class', 'sub-cluster-label')
            .text(article_graph.hierarchical_topics[d.label])
            .attr("x", d.position[0])
            .attr("y", d.position[1])
            .attr("font-size", "1.5rem")
            .attr("text-anchor", "middle")
            .attr("pointer-events", "none")
            .call(tags.wrap, 150)

          // tag borders
          const tspans = group.selectAll("tspan").nodes()
          const start_x = Math.min(...tspans.map((tspan: any) => tspan.getStartPositionOfChar(0).x))
          const start_y = (tspans[0]! as any).getStartPositionOfChar(0).y- (tspans[0]! as any).getExtentOfChar(0).height/2
          const width = Math.max(...tspans.map((tspan: any) => tspan.getComputedTextLength()))
          const height = tspans.reduce((total: number, tspan: any) => total + tspan!.getExtentOfChar(0).height, 0)
          const padding_x = 5
          const padding_y = 5
          // calculations for zoom 
          const tag_rect_x = start_x - padding_x
          const tag_rect_y = start_y - padding_y
          const tag_rect_width = width + 2*padding_x
          const tag_rect_height = height + 2*padding_y
          const translateX = tag_rect_x * zoom.k + zoom.x + tag_rect_width/2 * (zoom.k-1)  - tag_rect_x
          const translateY = tag_rect_y * zoom.k + zoom.y + tag_rect_height/2 * (zoom.k-1)  - tag_rect_y
          const tspan_border = group.append("rect")
            .datum(d)
            .attr("class", "sub-cluster-label-border")
            .attr("x", tag_rect_x)
            .attr("y", (d) => d.y = tag_rect_y)
            .attr("width", tag_rect_width)
            .attr("height", tag_rect_height)
            .attr("pointer-events", "none")
            .attr("fill", "white")
            .attr("stroke-width", 2)
            .attr('stroke', sub_cluster_colors[d.label])
            .attr("opacity", 1)
            .lower()
            .attr("transform", `translate(${translateX}, ${translateY})`)

          // text: account for zoom 
          sub_cluster_label.attr("transform", `translate(${translateX}, ${translateY})`)

          // lines
          const tag_border_connector = group.append("line")
            .datum(d)
            .attr("class", "sub-cluster-label-border-connector")
            .attr("x1", d.centroid[0] * zoom.k + zoom.x)
            .attr("y1", d.centroid[1] * zoom.k + zoom.y)
            .attr("x2", d.position[0] * zoom.k + zoom.x)
            .attr("y2", d.position[1] + translateY)
            .attr("stroke-width", 3)
            .attr("stroke", sub_cluster_colors[d.label])
            .attr("opacity", 0)
            .lower()
            .transition().delay(300).duration(1000)
            .attr("opacity", 1)
            .selection()
        })
        .attr("transform", function(d: any) {
          const group = d3.select(this)
          const tspans = group.selectAll("tspan").nodes()
          const lineHeight = (tspans[0] as any).getExtentOfChar(0).height
          const direction = d.direction
          const tag_width: number = parseFloat(d3.select(this).select("rect.sub-cluster-label-border").attr("width"))
          const tag_height: number = parseFloat(d3.select(this).select("rect.sub-cluster-label-border").attr("height"))
          let tx, ty;
          if(direction === "top") {
            tx = 0
            ty = lineHeight/2 + 5 // 5=padding_y
          } else if(direction === "bottom") {
            tx = 0
            ty = -(tag_height/2-5) // 5=padding_y
          } else if(direction === "left") {
            tx = tag_width/2
            ty = 0
          } else if(direction === "right") {
            tx = -(tag_width/2)
            ty = 0
          }
          group.selectAll("line.sub-cluster-label-border-connector")
            // .attr("transform", `translate(${-tx}, ${-ty})`)

          return `translate(0,0)`
          // return `translate(${tx},${ty})`
        })


    },

    removeSubClusterLabels(svgId: string) {
      const centerArea = d3.select('#' + svgId).select("g.margin").select("g.center-area")
      centerArea.selectAll("g.sub-cluster-label-group").remove()
      // centerArea.selectAll("text.sub-cluster-label").remove()
      // centerArea.selectAll("rect.sub-cluster-label-border").remove()
      // centerArea.selectAll("line.sub-cluster-label-border-connector").remove()
    },

    addEntityClusterLabel(svgId, cluster_borders, hierarchical_topics, cluster_colors, showEntityClusterLabelDefault) {
      const canvas = d3.select('#' + svgId).select("g.margin")
      const zoom = d3.zoomTransform(canvas.node() as Element)
      // cluster label
      const tag = canvas.selectAll("g.entity-border-tag-group")
        .data(cluster_borders, (d: any) => d.cluster_label)
        .join("g")
        .attr("class", "entity-border-tag-group")
        .attr("opacity", showEntityClusterLabelDefault ? 1 : 0)
        .each(function(d: any) {
          d3.select(this).select("g.entity-cluster-label-group").remove()
          const group = d3.select(this).append("g").attr("class", "entity-cluster-label-group")
          group.select("text.entity-cluster-label").remove()
          group.select("rect.entity-cluster-label-border").remove()

          const labels = hierarchical_topics[d.cluster_label]
          const spans = labels.split(", ")
          const maxLabelLength = Math.max(...spans.map((label: string) => label.length)) 
          // label
          group.append("text")
            .datum(d)
            .attr("class", "entity-cluster-label")
            // .text((d: any) => labels)
            .attr("x", (d: any) => Math.max(0, d.centroid[0] - maxLabelLength*8))
            .attr("y", (d: any) => Math.max(0, d.centroid[1] - spans.length*10))
            .attr("font-size", "1.8rem")
            .attr("text-anchor", "middle")
            .attr("pointer-events", "none")
            .each(function() {
              const text = d3.select(this)
              const x = text.attr("x")
              const y = text.attr("y")
              const dy = 1.1
                // lineHeight = 1.1, // ems
              text.selectAll("tspan")
                .data(spans)
                .join("tspan")
                .attr("x", x)
                .attr("y", y)
                .attr("dy", (d, i) => i*dy + "em")
                .text((d: any, i: number) => `${i+1}. ${d}`)
                .attr("text-anchor", "start")
                .attr("dominant-baseline", "central")
            })
            // .call(tags.wrap, 300)

          // border
          const tspans = group.selectAll("tspan").nodes()
          const start_x = Math.min(...tspans.map((tspan: any) => tspan.getStartPositionOfChar(0).x))
          const start_y = (tspans[0]! as any).getStartPositionOfChar(0).y- (tspans[0]! as any).getExtentOfChar(0).height/2
          const width = Math.max(...tspans.map((tspan: any) => tspan.getComputedTextLength()))
          const height = tspans.reduce((total: number, tspan: any) => total + tspan!.getExtentOfChar(0).height, 0)
          const padding_x = 10
          const padding_y = 10
          const tspan_border = group.append("rect")
            .datum(d)
            .attr("class", "entity-cluster-label-border")
            .attr("x", start_x - padding_x)
            .attr("y", d.y = start_y - padding_y)
            .attr("width", width + 2*padding_x)
            .attr("height", height + 2*padding_y)
            .attr("pointer-events", "none")
            .attr("fill", "white")
            .attr("stroke-width", 3)
            .attr('stroke', (d) => cluster_colors[d.cluster_label])
            .attr("opacity", 0.5)
            .lower()
          // const centroid = group.append("circle")
          //   .datum(d)
          //   .attr("class", "centroid")
          //   .attr("cx", (d: any) => d.centroid[0])
          //   .attr("cy", (d: any) => d.centroid[1])
          //   .attr("r", 5)
          //   .attr("fill", "red")

          const tag_rect = group.select("rect.entity-cluster-label-border")
          const translateX = +tag_rect.attr("x") * zoom.k + zoom.x + +tag_rect.attr("width")/2 * (zoom.k-1)  - +tag_rect.attr("x")
          const translateY = +tag_rect.attr("y") * zoom.k + zoom.y + +tag_rect.attr("height")/2 * (zoom.k-1) - +tag_rect.attr("y")
          d.zoom_translate = `translate(${translateX}, ${translateY})`
          d.zoom = zoom
          group.attr("transform", `translate(${translateX}, ${translateY})`)
        })
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
            // text.selectAll("tspan").attr("y", parseFloat(y) - em_to_px / 2 * lineHeight * (line_num - 1) / 2)
            text.selectAll("tspan").attr("y", parseFloat(y))
        });
      
    }
}

export default tags