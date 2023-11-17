import json
import random
import math
import itertools
from collections import defaultdict
def getArticleClusterLinks(links, article_dict, entity_dict):
    cluster_links_dict = defaultdict(list)
    for link in links:
        source = link['source']
        target = link['target']
        source_node = entity_dict[source] if source in entity_dict else article_dict[source]
        target_node = entity_dict[target] if target in entity_dict else article_dict[target]
        entity_node = source_node if source_node['type'] == 'entity' else target_node
        article_node = source_node if source_node['type'] == 'article' else target_node
        cluster_label = article_node['cluster_label']
        cluster_links_dict[cluster_label].append([article_node['id'], entity_node['id']])
    return cluster_links_dict

    # cluster_entities_dict = {}
    # for cluster_label, article_nodes in clusters.items():
    #     cluster_links = list(filter(lambda link: link['source'] in article_nodes or link['target'] in article_nodes, user_hgraph.entity_links))
    #     cluster_link_sources = [link['source'] for link in cluster_links]
    #     cluster_link_targets = [link['target'] for link in cluster_links]
    #     cluster_entity_nodes = list(filter(lambda entity: entity['id'] in cluster_link_sources or entity['id'] in cluster_link_targets, user_hgraph.entity_nodes))
    #     cluster_entities_dict[cluster_label] = cluster_entity_nodes 

    # return cluster_entities_dict
def getClusterEntityInnerLinks(article_dict):
    cluster_links_dict = defaultdict(list)
    for article_id, article_data in article_dict.items():
        cluster_label = article_data['cluster_label']
        sub_cluster_label = article_data['sub_cluster_label']
        participant_ids = [participant['entity_id'] for participant in article_data['event']['participants']]
        combinations = itertools.combinations(participant_ids, 2)
        for source, target in combinations:
            cluster_links_dict[cluster_label].append([source, target])
            cluster_links_dict[sub_cluster_label].append([source, target])
    return cluster_links_dict

def prepareData(user_hgraph, level, type='article'):
    if type == 'article':
        clusters = user_hgraph.binPartitions(level)
        sub_clusters = user_hgraph.binPartitions(level - 1) if int(level) > 0 else None

        return addClusterLabelAndOrder(user_hgraph.article_dict, clusters, sub_clusters)
        # add cluster label to article nodes
        # article_node_dict = addClusterLabel(user_hgraph.article_dict, clusters, sub_clusters)
        # # generate cluster order
        # cluster_order = generateClusterOrder(list(article_node_dict.values()))
        # update_cluster_order = generateUpdateClusterOrder(cluster_order, clusters.keys(), top_level=True)
        # # add cluster order to article nodes
        # article_node_dict = addClusterOrder(clusters, cluster_order, update_cluster_order, article_node_dict)
        # return clusters, article_node_dict, cluster_order, update_cluster_order
    elif type == 'entity':
        clusters = user_hgraph.binPartitions(level, type='entity')
        sub_clusters = user_hgraph.binPartitions(level - 1, type="entity") if int(level) > 0 else None
        return addClusterLabelAndOrder(user_hgraph.entity_dict, clusters, sub_clusters)
        # add cluster label to article nodes
        entity_node_dict = addClusterLabel(user_hgraph.entity_dict, clusters, sub_clusters)
        # generate cluster order
        cluster_order = generateClusterOrder(list(entity_node_dict.values()))
        update_cluster_order = generateUpdateClusterOrder(cluster_order, clusters.keys(), top_level=True)
        # add cluster order to article nodes
        entity_node_dict = addClusterOrder(clusters, cluster_order, update_cluster_order, entity_node_dict)
        return clusters, entity_node_dict, cluster_order, update_cluster_order

def addClusterLabelAndOrder(node_dict, clusters, sub_clusters, sfc_points, expanded_cluster=None, curve_type='gosper'):
    node_dict = addClusterLabel(node_dict, clusters, sub_clusters)
    # generate cluster order
    cluster_order = generateClusterOrder(list(node_dict.values()))
    update_cluster_order = generateUpdateClusterOrder(cluster_order, clusters.keys(), top_level=True)
    # add cluster order to article nodes
    node_dict = addClusterOrder(clusters, cluster_order, update_cluster_order, node_dict)
    node_dict = addSFCOrder(clusters, cluster_order, node_dict, sfc_points, expanded_cluster=expanded_cluster, curve_type=curve_type)

    return clusters, node_dict, cluster_order, update_cluster_order

def generateClusterOrder(nodes):
    nodes = sorted(nodes, key=lambda x: x['order'])
    cur_cluster = nodes[0]['cluster_label']
    cluster_count = 0
    cluster_order = [cur_cluster]
    for node in nodes:
        if node['cluster_label'] != cur_cluster:
            cur_cluster = node['cluster_label']
            cluster_count += 1
            # cluster_order[cur_cluster] = cluster_count
            cluster_order.append(cur_cluster)
    return cluster_order

def generateUpdateClusterOrder(cluster_order, new_clusters, top_level=False):
    if top_level:
        return {cluster_label: 0 for cluster_label in cluster_order}
    find_fisrt_update_cluster_index = False
    first_update_cluster_index = 0
    update_cluseter_order = {}
    for index, cluster_label in enumerate(cluster_order):
        update_cluseter_order[cluster_label] = 0
        if cluster_label in new_clusters:
            if find_fisrt_update_cluster_index == False: 
                first_update_cluster_index = index
                find_fisrt_update_cluster_index = True
            # update_cluseter_order[cluster_label] = index - first_update_cluster_index 
            update_cluseter_order[cluster_label] = 1
    return update_cluseter_order

def addClusterLabel(node_dict, clusters, subClusters=None):
    for cluster_id, node_ids in clusters.items():
        for node_id in node_ids:
            if node_id in node_dict:
                node_dict[node_id]['cluster_label'] = cluster_id
    if subClusters:
        for sub_cluster_id, node_ids in subClusters.items():
            for node_id in node_ids:
                if node_id in node_dict:
                    node_dict[node_id]['sub_cluster_label'] = sub_cluster_id
    return node_dict

def addClusterOrder(clusters, cluster_order, update_cluster_order, node_dict):
    for cluster_label in cluster_order:
        if cluster_label not in clusters: continue
        article_node_ids = clusters[cluster_label]
        for article_node_id in article_node_ids:
            if article_node_id in node_dict:
                node_dict[article_node_id]['cluster_order'] = cluster_order.index(cluster_label)
                node_dict[article_node_id]['update_cluster_order'] = update_cluster_order[cluster_label]
    return node_dict

def filterClusters(clusters, targeted_node_ids):
    res = {}
    for cluster_label, node_ids in clusters.items():
        filtered_cluster_node_ids = [id for id in node_ids if id in targeted_node_ids]
        if len(filtered_cluster_node_ids) > 0:
            res[cluster_label] = filtered_cluster_node_ids
    return res
    
def filterClusterChildren(children_dict, sub_clusters):
    for cluster_label, children_labels in children_dict.items():
        filtered_children_labels = [label for label in children_labels if label in sub_clusters.keys()]
        children_dict[cluster_label] = filtered_children_labels
    return children_dict


def flattenClusters(clusters, targeted_cluster_labels):
    res = []
    for cluster_label, cluster_article_node_ids in clusters.items():
        if cluster_label in targeted_cluster_labels:
            res += cluster_article_node_ids
    return res
def generateNewClusterLabel(existing_cluster_labels):
    level = 5
    while True:
        new_cluster_label = random.randint(1, 8000)
        if "L-{}-{}".format(level, new_cluster_label) in existing_cluster_labels:
            continue
        else:
            return "L-{}-{}".format(level, new_cluster_label)

def save_json(data, filepath=r'new_data.json'):
   with open(filepath, 'w') as fp:
      json.dump(data, fp, indent=4)

def addSFCOrder(clusters, cluster_order, node_dict, sfc_points, expanded_cluster=None, curve_type='gosper'):
    total_volume = len(node_dict)
    total_spaces = len(sfc_points)
    # print(total_spaces)
    # if total_spaces == 16808:
    #     saved = {
    #         'clusters': clusters,
    #         'cluster_order': cluster_order,
    #         'total_volume': total_volume,
    #         'total_spaces': total_spaces,
    #         'sfc_points': sfc_points,
    #         'expanded_cluster': expanded_cluster
    #     }
    #     save_json(saved, "evenGaps_args.json")
    # gaps = evenGaps(clusters, cluster_order, total_volume, total_spaces, sfc_points, expanded_cluster, curve_type)
    gaps = evenGaps(clusters, cluster_order, total_volume, total_spaces, expanded_cluster)
    sorted_nodes = sorted(list(node_dict.values()), key=lambda x: x['order'])
    for index, node in enumerate(sorted_nodes):
        node_sfc_order = min(index + gaps[node['cluster_order']], total_spaces - 1)
        node['sfc_order'] = node_sfc_order
    return node_dict

def euclid_distance(p1, p2):
    return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)

# def evenGaps(clusters, cluster_order, total_volume, total_spaces, distance_to_point, expanded_cluster=None, curve_type='gosper'):
#     border_gaps = [0 for _ in range(total_spaces)]
#     border_points = []
#     cell_width = math.sqrt(1/total_spaces)
#     gaps = []
#     accumulative_gap = 0
#     accumulative_filled = 0 
#     spaces = {}
#     if expanded_cluster:
#         # remove expanded cluster from cluster_order
#         parent_cluster_label = expanded_cluster['parent']
#         sub_cluster_labels = expanded_cluster['sub_clusters']
#         replaced_cluster_order = [parent_cluster_label if cluster_label in sub_cluster_labels else cluster_label for cluster_label in cluster_order]
#         merged_cluster_order = merge_consecutive_duplicates(replaced_cluster_order)
#         clusters[parent_cluster_label] = list(itertools.chain(*[clusters[sub_cluster_label] for sub_cluster_label in sub_cluster_labels]))
#         # calculate spacing for merged cluster order
#         for cluster_label in merged_cluster_order:
#             nodes = clusters[cluster_label]
#             cluster_volume = len(nodes)
#             ratio = cluster_volume / total_volume
#             cluster_space = total_spaces * ratio
#             spaces[cluster_label] = cluster_space
#         # re-distribute the space of merged cluster evenly to sub clusters
#         parent_cluster_volume = len(clusters[parent_cluster_label])
#         parent_clusters_space = spaces[parent_cluster_label]
#         for sub_cluster_label in sub_cluster_labels:
#             nodes = clusters[sub_cluster_label]
#             sub_cluster_volume = len(nodes)
#             ratio = sub_cluster_volume / parent_cluster_volume
#             sub_cluster_space = parent_clusters_space * ratio
#             spaces[sub_cluster_label] = sub_cluster_space
#         # remove parent cluster spaces from spaces
#         del spaces[parent_cluster_label]
#         del clusters[parent_cluster_label]
#         # calculate gaps
#         for cluster_label in cluster_order:
#             cluster_space = spaces[cluster_label]
#             cluster_volume = len(clusters[cluster_label])
#             padding = (cluster_space - cluster_volume)/2
#             gaps.append(math.floor(accumulative_gap + padding))
#             accumulative_gap += 2*padding
#         return gaps
#     else:
#         # calculate gaps
#         for cluster_label in cluster_order:
#             nodes = clusters[cluster_label]
#             cluster_volume = len(nodes)
#             ratio = cluster_volume / total_volume
#             cluster_space = total_spaces * ratio
#             padding = (cluster_space - cluster_volume) / 2
#             occupied = [math.floor(accumulative_gap + padding), math.floor(accumulative_gap + padding + cluster_volume)]
#             # check if the cluster is on the border
#             padding_movement = 0
#             min_distance = 100
#             print("cluster size: ", occupied[1] - occupied[0])
#             for previous_distance, cluster_point_distance in enumerate(range(occupied[0], occupied[1])):
#                 cluster_point = distance_to_point[cluster_point_distance]
#                 for border_point in border_points:
#                     d = euclid_distance(border_point, cluster_point)
#                     if d < min_distance:
#                         min_distance = d
#                     if d < cell_width/2:
#                         padding_movement = previous_distance
#             print("padding movement: ", padding_movement, min_distance, cell_width/2, total_spaces)
#             padding += padding_movement
#                 # if border_gaps[cluster_point] == 1:
#                 #     padding += previous_distance
#             # recalculate occupied
#             occupied = [math.floor(accumulative_gap + padding), math.floor(accumulative_gap + padding + cluster_volume)]
#             print(len(gaps), math.floor(accumulative_gap + padding), occupied)
#             gaps.append(math.floor(accumulative_gap + padding))
#             border_points += find_border_points(occupied[0], occupied[1], distance_to_point, curve_type)
#             # print("border points:", len(border_points))
#             # border_distances = find_border_points(occupied[0], occupied[1], distance_to_point, point_to_distance)
#             # for distance in border_distances:
#             #     border_gaps[distance] = 1
#             accumulative_gap += 2*padding
#             accumulative_filled += cluster_volume
#             print("============================")
#         return gaps

def evenGaps(clusters, cluster_order, total_volume, total_spaces, expanded_cluster=None):
    gaps = []
    accumulative_gap = 0
    spaces = {}
    if expanded_cluster:
        # remove expanded cluster from cluster_order
        parent_cluster_label = expanded_cluster['parent']
        sub_cluster_labels = expanded_cluster['sub_clusters']
        replaced_cluster_order = [parent_cluster_label if cluster_label in sub_cluster_labels else cluster_label for cluster_label in cluster_order]
        merged_cluster_order = merge_consecutive_duplicates(replaced_cluster_order)
        clusters[parent_cluster_label] = list(itertools.chain(*[clusters[sub_cluster_label] for sub_cluster_label in sub_cluster_labels]))
        # calculate spacing for merged cluster order
        for cluster_label in merged_cluster_order:
            nodes = clusters[cluster_label]
            cluster_volume = len(nodes)
            ratio = cluster_volume / total_volume
            cluster_space = total_spaces * ratio
            spaces[cluster_label] = cluster_space
        # re-distribute the space of merged cluster evenly to sub clusters
        parent_cluster_volume = len(clusters[parent_cluster_label])
        parent_clusters_space = spaces[parent_cluster_label]
        for sub_cluster_label in sub_cluster_labels:
            nodes = clusters[sub_cluster_label]
            sub_cluster_volume = len(nodes)
            ratio = sub_cluster_volume / parent_cluster_volume
            sub_cluster_space = parent_clusters_space * ratio
            spaces[sub_cluster_label] = sub_cluster_space
        # remove parent cluster spaces from spaces
        del spaces[parent_cluster_label]
        del clusters[parent_cluster_label]
        # calculate gaps
        for cluster_label in cluster_order:
            cluster_space = spaces[cluster_label]
            cluster_volume = len(clusters[cluster_label])
            padding = (cluster_space - cluster_volume)/2
            gaps.append(math.floor(accumulative_gap + padding))
            accumulative_gap += 2*padding
        return gaps
    else:
        # calculate gaps
        for cluster_label in cluster_order:
            nodes = clusters[cluster_label]
            cluster_volume = len(nodes)
            ratio = cluster_volume / total_volume
            cluster_space = total_spaces * ratio
            padding = (cluster_space - cluster_volume) / 2
            gaps.append(math.floor(accumulative_gap + padding))
            accumulative_gap += 2*padding
        return gaps
def find_border_points(start, end, distance_to_point, curve_type):
    # mapping = point_to_distance['mapping']
    total_points = len(distance_to_point)
    if curve_type == 'gilbert':
        return [[0, 0]]
    elif curve_type == 'gosper':
        offset_x = 1 / math.sqrt(total_points)
        offset_y = 1 / math.sqrt(total_points)
        kx = 0.6873313602390351
        ky = 9.935177303243627
        vertical_dx = math.sqrt((offset_y * offset_y) / (1 + ky * ky))
        vertical_dy = ky * vertical_dx
        horizontal_dx = math.sqrt((offset_x * offset_x) / (1 + kx * kx))
        horizontal_dy = kx * horizontal_dx
        border_offsets = [
            (-vertical_dx-horizontal_dx, -vertical_dy+horizontal_dy), 
            (-vertical_dx, -vertical_dy), 
            (-horizontal_dx, horizontal_dy), 
            (horizontal_dx, -horizontal_dy), 
            (vertical_dx, vertical_dy), 
            (vertical_dx+horizontal_dx, vertical_dy-horizontal_dy)
        ]
        border_points = []
        for distance in range(start, end):
            point = distance_to_point[distance]
            border_points += [(point[0]+border_offset[0], point[1]+border_offset[1]) for border_offset in border_offsets]
            # border_point_distances = [mapping[find_closest_point(border_point, distance_to_point)] for border_point in border_points]
        return border_points
    else:
        print("error!")

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


def merge_consecutive_duplicates(lst):
    merged_list = []
    prev_element = None
    
    for element in lst:
        if element != prev_element:
            merged_list.append(element)
            prev_element = element
    
    return merged_list

def findOptimalPartition(clusters, sub_clusters, cluster_children_dict, target_articles, user_hgraph):
    import sys

    original_stdout = sys.stdout # Save a reference to the original standard output
    f = open('log.txt', 'w')
    sys.stdout = f # Change the standard output to the file we created.

    optimalSubClusters = {}
    # find the optimal hierarchy
    for cluster_label, node_ids in clusters.items():
        # collect the nodes for this child
        children_node_dict = {}
        for child in cluster_children_dict[cluster_label]:
            children_node_dict[child] = sub_clusters[child]
        # find the optimal partition for this child
        clusterOptimalSubClusters = optimalPartitionDfs(children_node_dict, target_articles, user_hgraph)
        # update optimalSubClusters
        for optimal_sub_cluster, node_ids in clusterOptimalSubClusters.items():
            optimalSubClusters[optimal_sub_cluster] = node_ids
        cluster_children_dict[cluster_label] = list(clusterOptimalSubClusters.keys())

    sys.stdout = original_stdout 
    return optimalSubClusters, cluster_children_dict

def optimalPartitionDfs(sub_clusters, target_articles, user_hgraph):
    res = {}
    for child, node_ids in sub_clusters.items():
        targted_node_ids = [node_id for node_id in node_ids if str(node_id) in str(target_articles)]
        ratio = len(targted_node_ids) / len(node_ids)
        level = int(child.split("-")[1])
        print(child, len(targted_node_ids), len(target_articles), ratio, level) 
        if ratio < 0.8 and ratio > 0.3 and level >3: 
            # expand this sub-cluster
            sub_sub_clusters, _ = user_hgraph.getSubClusters(child, isList=False, cluster_type='article')
            optimalSubClusters = optimalPartitionDfs(sub_sub_clusters, target_articles, user_hgraph)
            # update res
            for sub_cluster_label, sub_cluster_nodes in optimalSubClusters.items():
                res[sub_cluster_label] = sub_cluster_nodes
        else:
            res[child] = node_ids
    return res

def save_json(data, filepath=r'new_data.json'):
   with open(filepath, 'w') as fp:
      json.dump(data, fp, indent=4)