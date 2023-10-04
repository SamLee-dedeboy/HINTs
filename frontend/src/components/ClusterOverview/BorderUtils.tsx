import concaveman from "concaveman"
import * as d3 from "d3"
const borders = {
    generate_border(nodes_data, concavity=0.2, smoothing='rounded', curve_type) {
        // 0.6873313602390351, 9.935177303243627
        let offsets: any[] = []
        const offset_x = (nodes_data[0] as any).cell_width
        const offset_y = (nodes_data[0] as any).cell_height
        if(curve_type === "gosper") {
            const kx = 0.6873313602390351
            const ky = 9.935177303243627
            const vertical_dx = Math.sqrt((offset_y * offset_y) / (1 + ky * ky))
            const vertical_dy = ky * vertical_dx
            const horizontal_dx = Math.sqrt((offset_x * offset_x) / (1 + kx * kx))
            const horizontal_dy = kx * horizontal_dx
            offsets = [
                [-vertical_dx-horizontal_dx, -vertical_dy+horizontal_dy], // 1
                [-vertical_dx, -vertical_dy], // 2
                // [-vertical_dx+horizontal_dx, -vertical_dy-horizontal_dy], // 3
                [-horizontal_dx, horizontal_dy], // 4
                [horizontal_dx, -horizontal_dy], // 6
                // [vertical_dx-horizontal_dx, vertical_dy+horizontal_dy], // 7
                [vertical_dx, vertical_dy], // 8
                [vertical_dx+horizontal_dx, vertical_dy-horizontal_dy] // 9
            ]
        } else {
            offsets = [
                [-offset_x, -offset_y], // 1
                [0, -offset_y], // 2
                [offset_x, -offset_y], // 3
                [-offset_x, 0], // 4
                [offset_x, 0], // 6
                [-offset_x, offset_y], // 7
                [0, offset_y], // 8
                [offset_x, offset_y] // 9
            ]
        }
        // add concave hull forst to make its z-index lower
        let points: any[] = []
        nodes_data.forEach((node: any) => {
            offsets.forEach(offset => {
                points.push([node.x + offset[0], node.y + offset[1]])
            })
        })
        // d3.select("#article-cluster-overview-svg").select("g.center-area")
        //     .selectAll("circle.test_polygon")
        //     .data(points)
        //     .join("circle")
        //     .attr('class', 'test_polygon')
        //     .attr('cx', d => d[0])
        //     .attr('cy', d => d[1])
        //     .attr('r', 4.5)
        //     .attr("fill", "black")
        //     .attr("opacity", 0.5)
        //     .lower()
        const max_x = Math.max(...points.map(p => p[0]))
        const min_x = Math.min(...points.map(p => p[0]))
        const max_y = Math.max(...points.map(p => p[1]))
        const min_y = Math.min(...points.map(p => p[1]))
        // const polygon = concaveman(points, concavity, 0)
        const polygon = concaveman(points, concavity, 0)
        const centroid = this.get_border_centroid(polygon)
        // const path = createRoundedCornersFromPointsWithLines(polygon);
        // const path = this.createSmoothPathFromPointsWithCurves(polygon);
        let path;
        if(smoothing === 'rounded') {
            // path = this.createRoundedCornersFromPointsWithLines(polygon)
            path = this.createSmoothPath(polygon)
        } else if(smoothing === 'sketch') {
            path = this.createSmoothPathFromPointsWithCurves(polygon)
        } else {
            path = this.createSmoothPathFromPointsWithLines(polygon)
        }
        return { polygon, path, centroid, min_x, max_x, min_y, max_y }
    },

    generate_polygon(points, concavity=0.2) {
        if(points.length === 1) return { polygon: points, centroid: points[0]}
        if(points.length === 2) return { polygon: points, centroid: [(points[0][0]+points[1][0])/2, (points[0][1]+points[1][1])/2]}
        console.log(points.length)
        const polygon = concaveman(points, concavity, 0)
        const centroid = this.get_border_centroid(polygon)
        return { polygon, centroid }
    },

    findIntersection(polygon, centroid) {
        const parent_centroid = this.get_border_centroid(polygon)
        const d_centroid = [2000*(centroid[0]-parent_centroid[0]) + centroid[0], 2000*(centroid[1]-parent_centroid[1]) + centroid[1]]
        let intersection_points: any[] = []
        for(let i=0; i<polygon.length-1; i++) {
            const p1 = polygon[i]
            const p2 = polygon[i+1]
            const p_intersect = borders.intersect(
                p1[0], p1[1], 
                p2[0], p2[1],
                parent_centroid[0], parent_centroid[1],
                d_centroid[0], d_centroid[1]
            )
            if(p_intersect) intersection_points.push(p_intersect)
        }
        if(intersection_points.length === 0) {
            const { closest_point } = this.findClosetPoint(polygon, centroid)
            return { intersection_point: closest_point }
        } else {
            // find the closes point to the centroid
            const { closest_point } = this.findClosetPoint(intersection_points, centroid)
            return { intersection_point: closest_point }
        }
    },

    findClosetPoint(plist, centroid) {
        const distances = plist.map(p => (p[0]-centroid[0])**2 + (p[1]-centroid[1])**2)
        const min_distance = Math.min(...distances)
        const closest_point_index = distances.indexOf(min_distance)
        const closest_point = plist[closest_point_index]
        return { closest_point }
    },

    createSmoothPathFromPointsWithLines(points) {
        let path = `M ${points[0][0]},${points[0][1]}`;
        for (let i = 1; i < points.length; i++) {
            path += ` L ${points[i][0]},${points[i][1]}`;
        }
        path += ' Z';
        return path;
    },

    createSmoothPathFromPointsWithCurves(points) {
        // Function to create a smooth path from points using Bezier curves
        // This turns out to be unexpectedly aesthetic (sketchy style) 
        let path = `M ${points[0][0]},${points[0][1]}`;
        const numPoints = points.length;

        for (let i = 1; i < numPoints; i++) {
            const smoothing = 0.5;
            // Calculate control points for cubic Bezier curves
            const p0 = points[i-1]
            const p1 = points[i]
            const p2 = points[(i+1)%numPoints]
            const x0 = smoothing*p0[0] + (1-smoothing)*p1[0]
            const y0 = smoothing*p0[1] + (1-smoothing)*p1[1]

            const x1 = smoothing*p2[0] + (1-smoothing)*p1[0]
            const y1 = smoothing*p2[1] + (1-smoothing)*p1[1]
            path += ` C ${x0},${y0} ${x1},${y1} ${p2[0]},${p2[1]}`;
        }

        path += ' Z';
        return path;
    },

    createRoundedCornersFromPointsWithLines(points) {
        // Create a smooth path based on the concave hull points with rounded corners
        let path = `M ${points[0][0]},${points[0][1]}`;
        const numPoints = points.length;

        for (let i = 1; i < numPoints; i++) {
            const prevPoint = points[i - 1];
            const curPoint = points[i];
            const nextPoint = points[(i + 1) % numPoints];

            const x0 = (curPoint[0] + prevPoint[0]) / 2;
            const y0 = (curPoint[1] + prevPoint[1]) / 2;

            const x1 = (curPoint[0] + nextPoint[0]) / 2;
            const y1 = (curPoint[1] + nextPoint[1]) / 2;

            path += ` L ${x0},${y0}`;
            path += ` Q ${curPoint[0]},${curPoint[1]} ${x1},${y1}`;
        }

        path += ' Z';
        return path
    },
    createSmoothPath(points: [number, number][]) {
        const path_generator = d3.line()
            .x((p) => p[0])
            .y((p) => p[1])
            // .curve(d3.curveLinear);
            .curve(d3.curveBasis);
        return path_generator(points)
    },

    get_border_centroid(pts) {
        let first = pts[0], last = pts[pts.length-1];
        if (first[0] != last[0] || first[1] != last[1]) pts.push(first);
        let twicearea=0,
        x=0, y=0,
        nPts = pts.length,
        p1, p2, f;
        for ( let i=0, j=nPts-1 ; i<nPts ; j=i++ ) {
           p1 = pts[i]; p2 = pts[j];
           f = (p1[1] - first[1]) * (p2[0] - first[0]) - (p2[1] - first[1]) * (p1[0] - first[0]);
           twicearea += f;
           x += (p1[0] + p2[0] - 2 * first[0]) * f;
           y += (p1[1] + p2[1] - 2 * first[1]) * f;
        }
        f = twicearea * 3;
        return [ x/f + first[0], y/f + first[1] ];
     },

     intersect(x1, y1, x2, y2, x3, y3, x4, y4) {

        // Check if none of the lines are of length 0
          if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
              return false
          }
      
          let denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))
      
        // Lines are parallel
          if (denominator === 0) {
              return false
          }
      
          let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
          let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator
      
        // is the intersection along the segments
          if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
              return false
          }
      
        // Return a object with the x and y coordinates of the intersection
          let x = x1 + ua * (x2 - x1)
          let y = y1 + ua * (y2 - y1)
      
          return [x, y]
      }
}
export default borders