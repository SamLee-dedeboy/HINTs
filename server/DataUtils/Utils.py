import json
def getArticleClusterEntities(user_hgraph, clusters):
    cluster_entities_dict = {}
    for cluster_label, article_nodes in clusters.items():
        cluster_links = list(filter(lambda link: link['source'] in article_nodes or link['target'] in article_nodes, user_hgraph.entity_links))
        cluster_link_sources = [link['source'] for link in cluster_links]
        cluster_link_targets = [link['target'] for link in cluster_links]
        cluster_entity_nodes = list(filter(lambda entity: entity['id'] in cluster_link_sources or entity['id'] in cluster_link_targets, user_hgraph.entity_nodes))
        cluster_entities_dict[cluster_label] = cluster_entity_nodes 

    return cluster_entities_dict

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

def addClusterLabelAndOrder(node_dict, clusters, sub_clusters):
    node_dict = addClusterLabel(node_dict, clusters, sub_clusters)
    # generate cluster order
    cluster_order = generateClusterOrder(list(node_dict.values()))
    update_cluster_order = generateUpdateClusterOrder(cluster_order, clusters.keys(), top_level=True)
    # add cluster order to article nodes
    node_dict = addClusterOrder(clusters, cluster_order, update_cluster_order, node_dict)

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

def filterClusters(clusters, article_ids):
    res = {}
    for cluster_label, cluster_article_node_ids in clusters.items():
        filtered_cluster_article_node_ids = [id for id in cluster_article_node_ids if id in article_ids]
        if len(filtered_cluster_article_node_ids) > 0:
            res[cluster_label] = filtered_cluster_article_node_ids
    return res

def save_json(data, filepath=r'new_data.json'):
   with open(filepath, 'w') as fp:
      json.dump(data, fp, indent=4)