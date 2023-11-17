from math import sin, cos, atan
def create_gosper_fractal(max_level = 6):

    # Segment type and directions for pattern 1
    t1 = 'abbaaab'
    d1 = [0, 5, 3, 4, 0, 0, 1]

    # Segment type and directions for pattern 2
    t2 = 'abbbaab'
    d2 = [1, 0, 0, 4, 3, 5, 0]

    # Lambda function to determine new directions of generated line segments
    fAddModulo6 = lambda m, d: [(m + e) % 6 for e in d]

    res = {0: {'s': 7.0**0.5, 't': ['a'], 'd': [0]}}
    # Iterate on all level, creating each new level with the previous one
    for level in range(1, max_level + 1):
        res[level] = {'s': res[level - 1]['s'] * (1.0/(7.0**.5)),
                      't': [],
                      'd' : []}
        for e, d in zip(res[level - 1]['t'], res[level - 1]['d']):
            res[level]['t'].extend(t1 if e == 'a' else t2)
            res[level]['d'].extend(fAddModulo6(d, d1 if e == 'a' else d2))
    return res


def generate_level(level):
    '''
    convert the formal description of a level to a x, y curve
    '''
    # k1, k2 = cos(pi/3), sin(pi/3)
    k1, k2 = +0.5, +3.0**0.5 / 2.0
    d_cos = {0: +1.0, 1: +k1, 2: -k1, 3: -1.0, 4: -k1, 5: +k1}
    d_sin = {0: +0.0, 1: +k2, 2: +k2, 3: +0.0, 4: -k2, 5: -k2}
    scale = level['s']
    n = len(level['d']) + 1
    x, y = [0] * n, [0] * n
    for i, d in enumerate(level['d']):
        x[i + 1] = x[i] + scale * d_cos[d]
        y[i + 1] = y[i] + scale * d_sin[d]
    return x, y


def plot_level(max_level = 6):
    fRotateX = lambda c, s, x, y: [c * xx - s * yy for xx, yy in zip(x ,y)]
    fRotateY = lambda c, s, x, y: [s * xx + c * yy for xx, yy in zip(x, y)]
    alpha = atan((3**0.5) / 5.0)
    res = create_gosper_fractal(max_level)
    x, y = generate_level(res[max_level])
    c, s = cos(max_level * alpha), sin(max_level * alpha)
    xr, yr = fRotateX(c, s, x, y), fRotateY(c, s, x, y)
    # flip the coordinates
    yr = [-yy for yy in yr]
    # make (0, 0) the top left
    min_x = min(xr)
    min_y = min(yr)
    xr = [xx - min_x for xx in xr]
    yr = [yy - min_y for yy in yr]
    # make the max (1, 1)
    max_x = max(xr)
    max_y = max(yr)
    xr = [xx / max_x for xx in xr]
    yr = [yy / max_y for yy in yr]

    distance_to_point = [(xr[i], yr[i]) for i in range(len(xr))]
    point_to_distance = {(xr[i], yr[i]): i for i in range(len(xr))}

    return distance_to_point, { 'curve_type': 'gosper', 'mapping': point_to_distance}
        
def find_closest_point(point, curve_points):
    min_distance = 100000
    closest_point = (0, 0)
    for curve_point in curve_points:
        distance = (point[0] - curve_point[0]) ** 2 + (point[1] - curve_point[1]) ** 2
        if distance == 0: return curve_point
        if distance < min_distance:
            closest_point = curve_point
            min_distance = distance
    return closest_point


if __name__ == "__main__":
    import math
    gosper_curve_points, gosper_point_to_distance = plot_level(5)
    gosper_point_to_distance = gosper_point_to_distance['mapping']
    for point, distance in gosper_point_to_distance.items():
        print(point, distance)
    total_points = len(gosper_curve_points)
    point = gosper_curve_points[1000]
    offset_x = 1 / math.sqrt(total_points)
    offset_y = 1 / math.sqrt(total_points)
    kx = 0.6873313602390351
    ky = 9.935177303243627
    vertical_dx = math.sqrt((offset_y * offset_y) / (1 + ky * ky))
    vertical_dy = ky * vertical_dx
    horizontal_dx = math.sqrt((offset_x * offset_x) / (1 + kx * kx))
    horizontal_dy = kx * horizontal_dx
    border_points = [
        (-vertical_dx-horizontal_dx, -vertical_dy+horizontal_dy), 
        (-vertical_dx, -vertical_dy), 
        (-horizontal_dx, horizontal_dy), 
        (horizontal_dx, -horizontal_dy), 
        (vertical_dx, vertical_dy), 
        (vertical_dx+horizontal_dx, vertical_dy-horizontal_dy)
    ]
    # print(gosper_point_to_distance[border_points[0]])
    closest_point = find_closest_point(border_points[0], gosper_curve_points)
    print(closest_point, gosper_point_to_distance[closest_point])


