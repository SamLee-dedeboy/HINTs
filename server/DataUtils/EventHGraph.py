import json
from collections import defaultdict
from pprint import pprint
import numpy as np
import copy
import itertools
def save_json(data, path="data.json"):
    with open(path, 'w') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
class EventHGraph:
    def __init__(self, data_path, init=True) -> None:
        if not init:
            return 
        gpt_network_data = json.load(open(data_path + 'frontend.json'))
        gpt_partitions_article = json.load(open(data_path + 'ravasz_partitions_article.json'))
        gpt_hierarchy_article = json.load(open(data_path + 'ravasz_hierarchies_article.json'))
        gpt_partitions_entity = json.load(open(data_path + 'ravasz_partitions_entity.json'))
        gpt_hierarchy_entity = json.load(open(data_path + 'ravasz_hierarchies_entity.json'))
        article_hierarchical_topics = json.load(open(data_path + 'hierarchical_topics_articles.json'))
        entity_hierarchical_topics = json.load(open(data_path + 'hierarchical_topics_entities.json'))
        def fake_topics(partitions):
            res = {}
            for level, partition in enumerate(partitions):
                cluster_labels = list(set(partition.values()))
                for cluster_label in cluster_labels:
                    cluster_label = "L-{level}-{cluster_label}".format(level=level, cluster_label=cluster_label)
                    res[cluster_label] = cluster_label + ", " + cluster_label + ", " + cluster_label
            return res
        # article_hierarchical_topics = fake_topics(gpt_partitions_article)
        # entity_hierarchical_topics = fake_topics(gpt_partitions_entity)

        self.hierarchy_article = gpt_hierarchy_article
        self.hierarchy_entity = gpt_hierarchy_entity
        self.article_hierarchical_topics = article_hierarchical_topics
        self.entity_hierarchical_topics = entity_hierarchical_topics

        #################
        #################
        # prepare data
        nodes = gpt_network_data['nodes']
        self.links = gpt_network_data['links']
        self.partitions_article = gpt_partitions_article
        self.partitions_entity = gpt_partitions_entity

        # self.hierarchy_article = gpt_hierarchy_article
        # self.hierarchy_entity = gpt_hierarchy_entity

        self.article_nodes, \
        self.article_dict, \
        self.node_dict, \
        self.entity_nodes, \
        self.entity_dict, \
        self.entity_links, \
         = prepare_data(nodes, self.links)
        # print("Data prepared", len(self.article_nodes), len(self.entity_nodes))
        #################
        #################
        # prepare for frontend
        self.article_nodes, \
        self.hierarchy_flattened_article, \
        self.entity_nodes, \
        self.hierarchy_flattened_entity = prepare_frontend(
            self.entity_nodes, 
            self.article_nodes,
            self.hierarchy_article, self.partitions_article, self.article_dict, 
            self.hierarchy_entity, self.partitions_entity, self.entity_dict, 
        )
        save_json(self.hierarchy_flattened_article, 'debug_hierarchy_flattened_article.json')

        self.filtered = False
    def get_highest_level(self, cluster_type):
        if cluster_type == 'article':
            return len(self.partitions_article)
        elif cluster_type == 'entity':
            return len(self.partitions_entity)
    def save_states(self):
        return {
            "article_nodes": [article_node['id'] for article_node in self.article_nodes],
            "entity_nodes": [entity_node['id'] for entity_node in self.entity_nodes],
            "links": self.links,
            "filtered": self.filtered,
        }

    def resetFiltering(self):
        if self.filtered:
            # article
            self.article_nodes = self.original_article_nodes
            self.article_dict = {node['id']: node for node in self.article_nodes}
            # entity
            self.entity_nodes = self.original_entity_nodes
            self.entity_dict = {node['id']: node for node in self.entity_nodes}
            # link
            self.entity_links = self.original_entity_links
        return

    def filter_article_nodes(self, target_article_ids):
        self.filtered = True
        self.article_nodes = list(filter(lambda node: node['id'] in target_article_ids, self.article_nodes))
        self.article_nodes = sorted(self.article_nodes, key=lambda node: node['order'])
        self.article_dict = {node['id']: node for node in self.article_nodes}
        self.entity_links = list(filter(lambda link: link['source'] in target_article_ids or link['target'] in target_article_ids, self.entity_links))
        self.entity_nodes = list(filter(lambda entity: entity['id'] in [link['source'] for link in self.entity_links] + [link['target'] for link in self.entity_links], self.entity_nodes))
        self.entity_dict = {node['id']: node for node in self.entity_nodes}
        return

    def getArticleNodes(self, article_node_ids):
        return [self.article_dict[article_node_id] for article_node_id in article_node_ids]

    def getDocData(self, doc_id, fieldName):
        article_id = self.doc_id_to_article_id[doc_id]
        return self.article_dict[article_id][fieldName]

    def binPartitions(self, level, cluster_type):
        if cluster_type == 'article':
            return _binPartitions(self.partitions_article[int(level)], level)
        elif cluster_type == 'entity':
            return _binPartitions(self.partitions_entity[int(level)], level)
    
    def adjustClusterLevel(self, clusters, cluster_type):
        if cluster_type == "article":
            total_volume = len(self.article_nodes)
        else:
            total_volume = len(self.entity_nodes)
        total_clusters = len(clusters)
        avg_cluster_size = total_volume / total_clusters
        res = {}
        for cluster_label, node_ids in clusters.items():
            cluster_size = len(node_ids)
            if cluster_size > 3*avg_cluster_size or cluster_size > 0.7*total_volume:
                # expand this cluster
                sub_clusters, _ = self.getSubClusters(cluster_label, cluster_type=cluster_type, isList=False)
                for sub_cluster_label, sub_cluster_article_node_ids in sub_clusters.items():
                    res[sub_cluster_label] = sub_cluster_article_node_ids
            else:
                res[cluster_label] = node_ids
        return res
    
    def getSubClusterNumDict(self, cluster_labels, cluster_type):
        if cluster_type == 'article':
            hierarchy_flattened = self.hierarchy_flattened_article
        else:
            hierarchy_flattened = self.hierarchy_flattened_entity

        sub_cluster_num_dict = {}
        for cluster_label in cluster_labels:
            hierarchy_of_cluster = hierarchy_flattened[cluster_label]
            sub_cluster_num_dict[cluster_label] = hierarchy_of_cluster['children']
        return sub_cluster_num_dict

    def getSubClusterLabels(self, cluster_labels, cluster_type, isList=False):
        if cluster_type == 'article':
            hierarchy_flattened = self.hierarchy_flattened_article
        else:
            hierarchy_flattened = self.hierarchy_flattened_entity
        if isList:
            res = []
            for cluster_label in cluster_labels:
                # check if children has only one element
                if 'children' not in hierarchy_flattened[cluster_label]: 
                    res.append(cluster_label)
                else:
                    sub_cluster_labels = hierarchy_flattened[cluster_label]['children']
                    while len(sub_cluster_labels) == 1 and 'children' in hierarchy_flattened[sub_cluster_labels[0]]:
                        sub_cluster_labels = hierarchy_flattened[sub_cluster_labels[0]]['children']
                    res += sub_cluster_labels
            return res
        else:
            # check if children has only one element
            if 'children' not in hierarchy_flattened[cluster_labels]: 
                return [cluster_labels]
            else:
                sub_cluster_labels = hierarchy_flattened[cluster_labels]['children']
                while len(sub_cluster_labels) == 1 and 'children' in hierarchy_flattened[sub_cluster_labels[0]]:
                    sub_cluster_labels = hierarchy_flattened[sub_cluster_labels[0]]['children']
                return sub_cluster_labels
    
    def aboveLevel(self, cluster_label, level, cluster_type):
        if cluster_type == 'article':
            hierarchy_flattened = self.hierarchy_flattened_article
        else:
            hierarchy_flattened = self.hierarchy_flattened_entity
        hierarchy_obj = hierarchy_flattened[cluster_label]
        if 'children' not in hierarchy_obj: return False
        for child in hierarchy_obj['children']:
            if 'children' not in hierarchy_flattened[child]: return False
        return True

    def hasSubCluster(self, cluster_label, cluster_type):
        if cluster_type == 'article':
            hierarchy_flattened = self.hierarchy_flattened_article
        else:
            hierarchy_flattened = self.hierarchy_flattened_entity
        hierarchy_obj = hierarchy_flattened[cluster_label]
        return 'children' in hierarchy_obj

    def getSubClusters(self, cluster_labels, cluster_type, isList=False):
        if isList:
            targeted_sub_clusters = {}
            cluster_children_dict = {}
            for cluster_label in cluster_labels:
                targeted_sub_cluster_labels = self.getSubClusterLabels(cluster_label, cluster_type=cluster_type)
                cluster_children_dict[cluster_label] = targeted_sub_cluster_labels
                # get the cluster data from label
                # this assumes that all targeted_sub_cluster_labels are at the same level
                sub_cluster_level = int(targeted_sub_cluster_labels[0].split("-")[1])
                all_sub_cluster_at_level = self.binPartitions(sub_cluster_level, cluster_type=cluster_type)
                # keep only the sub clusters that are in the sub_cluster_labels
                for sub_cluster_label in targeted_sub_cluster_labels:
                    targeted_sub_clusters[sub_cluster_label] = all_sub_cluster_at_level[sub_cluster_label]

            return targeted_sub_clusters, cluster_children_dict
        else:
            cluster_children_dict = {}
            targeted_sub_cluster_labels = self.getSubClusterLabels(cluster_labels, cluster_type=cluster_type) 
            cluster_children_dict[cluster_labels] = targeted_sub_cluster_labels
            # get the cluster data from label
            # this assumes that all targeted_sub_cluster_labels are at the same level
            sub_cluster_level = int(targeted_sub_cluster_labels[0].split("-")[1])
            all_sub_cluster_at_level = self.binPartitions(sub_cluster_level, cluster_type=cluster_type)
            # keep only the sub clusters that are in the sub_cluster_labels
            targeted_sub_clusters = {sub_cluster_label: all_sub_cluster_at_level[sub_cluster_label] for sub_cluster_label in targeted_sub_cluster_labels}
            return targeted_sub_clusters, cluster_children_dict
    
    def getClusterLabelSetFrom(self, nonFilteredClusterLabels, level):
        partition = self.partitions_article[level]
        all_partition_labels = partition.keys()
        filteredClusterLabels = list(filter(lambda cluster_label: cluster_label in all_partition_labels, nonFilteredClusterLabels))
        return filteredClusterLabels
    
def filter_network(nodes, links, partitions_article, partitions_entity, target_article_ids=None):
    if target_article_ids != None:
        links = [link for link in links if link['source'] in target_article_ids or link['target'] in target_article_ids]
        nodes = [node for node in nodes if node['id'] in target_article_ids or node['id'] in list(map(lambda link: link['source'], links)) or node['id'] in list(map(lambda link: link['target'], links))]
        for level in partitions_article:
            del_keys = []
            for article_node_id in level.keys():
                if article_node_id not in nodes:
                    del_keys.append(article_node_id)
            for key in del_keys:         
                del level[key]
        # TODO: add filters for entity partitions
    return nodes, links, partitions_article, partitions_entity


def prepare_data(nodes, links):
    # article nodes
    article_nodes = list(filter(lambda node: node['type'] == 'article', nodes))
    article_node_ids = [node['id'] for node in article_nodes]
    article_dict = {node['id']: node for node in article_nodes}
    # argument nodes
    node_dict = {node['id']: node for node in nodes}
    # argument_nodes = list(filter(lambda node: node['type'] == 'entity', nodes))
    # entity nodes
    entity_nodes = list(filter(lambda node: node['type'] == 'entity', nodes))
    entity_node_ids = [node['id'] for node in entity_nodes]
    entity_dict = {node['id']: node for node in entity_nodes}

    # entity links
    entity_links = list(filter(lambda link: link['source'] in entity_node_ids or link['target'] in entity_node_ids, links))

    # compute statistics
    # network_statistics = _network_statistics(article_node_ids, entity_node_ids, links)

    return article_nodes, article_dict, node_dict, entity_nodes, entity_dict, entity_links

def prepare_frontend(
        entity_nodes, 
        article_nodes, 
        hierarchy_article, partitions_article, article_dict,
        hierarchy_entity, partitions_entity, entity_dict,
        ):
    # prepare for frontend
    # add article node order
    addOrder(article_nodes, hierarchy_article, partitions_article[0])
    # sort article nodes by dfs order
    article_nodes = sorted(article_dict.values(), key=lambda node: node['order'])

    # add entity node order
    addOrder(entity_nodes, hierarchy_entity, partitions_entity[0])
    # sort article nodes by dfs order
    entity_nodes = sorted(entity_dict.values(), key=lambda node: node['order'])


    hierarchy_flattened_article = flatten_hierarchy(hierarchy_article)
    hierarchy_flattened_entity = flatten_hierarchy(hierarchy_entity)
    return article_nodes, hierarchy_flattened_article, entity_nodes, hierarchy_flattened_entity



def flatten_hierarchy(hierarchy):
    queue = copy.deepcopy(hierarchy['children'])
    hierarchy_flattened = {}
    while(len(queue) > 0):
        cur = queue[0]
        hierarchy_flattened[cur['key']] = {
            "key": cur['key'],
            "title": cur['title'],
        }
        if 'children' in cur:
            queue += cur['children']
            children_keys = list(map(lambda child: child['key'], cur['children']))
            hierarchy_flattened[cur['key']]["children"] = children_keys
        queue = queue[1:]
    return hierarchy_flattened

def addOrder(nodes, hierarchy, leaf_partition):
    order = []
    dfs(nodes, hierarchy, order, leaf_partition)
    return order

def dfs(nodes, hierarchy, order, leaf_partition):
    if 'children' not in hierarchy:
        cluster_label = hierarchy['title'].split("-")[2]
        target_leaf_node = list(filter(lambda node: str(leaf_partition[node['id']]) == str(cluster_label), nodes))
        # target leaf node could be filter out, needs to check
        if len(target_leaf_node) == 0: return
        target_leaf_node = target_leaf_node[0]
        target_leaf_node['order'] = len(order)
        order.append(target_leaf_node)
        return
    else:
        for child in hierarchy['children']:
            dfs(nodes, child, order, leaf_partition)
        return

def _binPartitions(partition, level):
    clusters = defaultdict(list)
    for node_id, cluster_label in partition.items():
        full_cluster_label = "L-{level}-{cluster_label}".format(level=level, cluster_label=cluster_label)
        clusters[full_cluster_label].append(node_id)
    return clusters

def _get_hierarchy(nodes, links, communities, hierarchies):
    # get top level hierarchy
    if len(hierarchies) == 0:
        return {}
    top_level = hierarchies[0].split("-")[1]
    top_level_hierarchies = []
    for hierarchy in hierarchies:
        level = hierarchy.split("-")[1]
        if level == top_level:
            top_level_hierarchies.append(hierarchy)
    partition = communities[int(top_level)]
    comm_node_dict = defaultdict(list)
    node_dict = {node['id']: node for node in nodes}
    for node in nodes:
        node_id = node['id']
        if node_id in partition:
            node_comm = partition[node_id]
            comm_node_dict[str(node_comm)].append(node)
    subgraph_nodes_set = set()
    subgraph_links = []
    subgraph_communities = {}
    # construct sub-graph of the selected community
    # 1. get the nodes of the subgraph
    for comm_labels in top_level_hierarchies:
        community_label = comm_labels.split("-")[2]
        comm_nodes = comm_node_dict[str(community_label)]
        for comm_node in comm_nodes:
            subgraph_nodes_set.add(comm_node['id'])
            subgraph_communities[comm_node['id']] = community_label
            for argument in comm_node['arguments']:
                subgraph_nodes_set.add(argument)
            comm_node['argument_titles'] = [node_dict[node_id]['title'] for node_id in comm_node['arguments']]
    subgraph_nodes = [node_dict[node_id] for node_id in subgraph_nodes_set]
    # 2. get the links between the nodes
    for link in links:
        if link['source'] in subgraph_nodes_set and link['target'] in subgraph_nodes_set:
            subgraph_links.append(link)
    return {"nodes": list(subgraph_nodes), "links": subgraph_links, "communities": subgraph_communities}

    
   

def compute_community_size_dict(communities):
    communities, community_size = np.unique(communities, return_counts=True)
    community_size_dict = dict(zip(communities, community_size))
    return community_size_dict
    
def recover_nodes_from_hyper_edges(hyper_edges, nodes_dict):
    entities = set()
    for hyper_edge in hyper_edges:
        arguments = hyper_edge['arguments']
        entities.update(arguments)
    entities = list(map(lambda entity_id: nodes_dict[entity_id], entities))
    return hyper_edges + entities

def add_community_labels(nodes, communities, node_to_index_dict):
    # turn list of community labels into dict by list index
    communities_dict = {i: communities[i] for i in range(len(communities))}
    for node in nodes:
        if node['type'] != 'entity': continue
        node['community'] = communities_dict[node_to_index_dict[node['id']] - 1]
    return nodes


def degree(node, links):
    return len(list(filter(lambda link: link['source'] == node['id'] or link['target'] == node['id'], links)))

if __name__ == "__main__":
    event_network = EventHGraph()

        


