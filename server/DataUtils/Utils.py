def generateClusterOrder(nodes):
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
        hyperedge_node_ids = clusters[cluster_label]
        for hyperedge_node_id in hyperedge_node_ids:
            if hyperedge_node_id in node_dict:
                node_dict[hyperedge_node_id]['cluster_order'] = cluster_order.index(cluster_label)
                node_dict[hyperedge_node_id]['update_cluster_order'] = update_cluster_order[cluster_label]
    return node_dict

def filterClusters(clusters, hyperedge_ids):
    res = {}
    for cluster_label, cluster_hyperedge_node_ids in clusters.items():
        filtered_cluster_hyperedge_node_ids = [id for id in cluster_hyperedge_node_ids if id in hyperedge_ids]
        if len(filtered_cluster_hyperedge_node_ids) > 0:
            res[cluster_label] = filtered_cluster_hyperedge_node_ids
    return res
