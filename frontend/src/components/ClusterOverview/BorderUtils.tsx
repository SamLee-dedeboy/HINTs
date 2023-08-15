import concaveman from "concaveman"
const borders = {
    generate_border(nodes_data, concavity=0.2, smoothing='rounded') {
        const offset_x = (nodes_data[0] as any).cell_width
        const offset_y = (nodes_data[0] as any).cell_height
        // add concave hull forst to make its z-index lower
        let points: any[] = []
        nodes_data.forEach((node: any) => {
            points.push([node.x - offset_x, node.y - offset_y]) // 1
            points.push([node.x, node.y - offset_y]) // 2
            points.push([node.x + offset_x, node.y - offset_y]) // 3
            points.push([node.x - offset_x, node.y]) // 4
            points.push([node.x + offset_x, node.y]) // 6
            points.push([node.x - offset_x, node.y + offset_y]) // 7
            points.push([node.x, node.y + offset_y]) // 8
            points.push([node.x + offset_x, node.y + offset_y]) // 9
        })
        const max_x = Math.max(...points.map(p => p[0]))
        const min_y = Math.min(...points.map(p => p[1]))
        // const polygon = concaveman(points, concavity, 0)
        const polygon = concaveman(points, concavity, 0)
        // const path = createRoundedCornersFromPointsWithLines(polygon);
        // const path = this.createSmoothPathFromPointsWithCurves(polygon);
        let path;
        if(smoothing === 'rounded') {
            path = this.createRoundedCornersFromPointsWithLines(polygon)
        } else if(smoothing === 'sketch') {
            path = this.createSmoothPathFromPointsWithCurves(polygon)
        } else {
            path = this.createSmoothPathFromPointsWithLines(polygon)
        }
        return { path, max_x, min_y }
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
}
export default borders