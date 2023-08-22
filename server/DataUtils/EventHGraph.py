import json
from collections import defaultdict
from pprint import pprint
import numpy as np
import copy

class EventHGraph:
    def __init__(self, data_path) -> None:
        # AllTheNews
        atn_gpt_network_data = json.load(open(data_path + 'AllTheNews/network/server/frontend_2.json'))
        atn_gpt_partitions_article = json.load(open(data_path + 'AllTheNews/network/server/ravasz_partitions_article.json'))
        atn_gpt_hierarchy_article = json.load(open(data_path + 'AllTheNews/network/server/ravasz_hierarchies_article.json'))
        atn_gpt_partitions_entity = json.load(open(data_path + 'AllTheNews/network/server/ravasz_partitions_entity.json'))
        atn_gpt_hierarchy_entity = json.load(open(data_path + 'AllTheNews/network/server/ravasz_hierarchies_entity.json'))
        hierarchical_topics = json.load(open(data_path + 'AllTheNews/network/server/hierarchical_topics_mod.json'))

        self.hierarchy_article = atn_gpt_hierarchy_article
        self.hierarchy_entity = atn_gpt_hierarchy_entity
        self.hierarchical_topics = hierarchical_topics

        #################
        #################
        # prepare data
        # self.nodes, self.links, self.partitions_article, self.partitions_entity = filter_network(
        #     atn_gpt_network_data['nodes'],
        #     atn_gpt_network_data['links'],
        #     atn_gpt_partitions_article,
        #     atn_gpt_partitions_entity,
        # )
        self.nodes = atn_gpt_network_data['nodes']
        self.links = atn_gpt_network_data['links']
        self.partitions_article = atn_gpt_partitions_article
        self.partitions_entity = atn_gpt_partitions_entity

        self.hierarchy_article = atn_gpt_hierarchy_article
        self.hierarchy_entity = atn_gpt_hierarchy_entity

        self.article_nodes, \
        self.article_dict, \
        self.node_dict, \
        self.argument_nodes, \
        self.entity_nodes, \
        self.entity_dict, \
        self.entity_links, \
         = prepare_data(self.nodes, self.links)

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

        self.original_article_nodes = self.article_nodes
        self.original_entity_nodes = self.entity_nodes
        self.original_entity_links = self.entity_links
        self.filtered = False

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

    # def apply_filters(self, filters, test=False):
    #     if test:
    #         return _get_hierarchy(self.nodes, self.links, self.ravasz_partitions, filters)
    #     return _apply_filters(filters, self.nodes, self.links, self.community_size_dict)
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
                res += hierarchy_flattened[cluster_label]['children']
            return res
        else:
            return hierarchy_flattened[cluster_labels]['children']
    
    # def filterClusters(self, cluster_labels):
    #     res = {}
    #     for sub_cluster_label, article_nodes in cluster_labels.items():
    #         article_nodes = list(filter(lambda node: node['id'] in article_nodes, self.article_nodes))
    #         if len(article_nodes) == 0: continue
    #         res[sub_cluster_label] = article_nodes
    #     return res

    def getSubClusters(self, cluster_labels,  cluster_type, isList=False):
        # TODO: add support for entity sub clusters
        if isList:
            targeted_sub_clusters = {}
            for cluster_label in cluster_labels:
                targeted_sub_cluster_labels = self.getSubClusterLabels(cluster_label, cluster_type=cluster_type)
                # some of the targeted sub clusters might not exist
                # user article ids to filter out the non-existing sub clusters
                sub_cluster_level = int(targeted_sub_cluster_labels[0].split("-")[1])
                # if filtered:
                #     targeted_sub_cluster_labels = self.getClusterLabelSetFrom(targeted_sub_cluster_labels, sub_cluster_level)
                all_sub_cluster_at_level = self.binPartitions(sub_cluster_level, cluster_type=cluster_type)
                # keep only the sub clusters that are in the sub_cluster_labels
                for sub_cluster_label in targeted_sub_cluster_labels:
                    targeted_sub_clusters[sub_cluster_label] = all_sub_cluster_at_level[sub_cluster_label]
            return targeted_sub_clusters
        else:
            targeted_sub_cluster_labels = self.getSubClusterLabels(cluster_labels, cluster_type=cluster_type) 
            # some of the targeted sub clusters might not exist
            # user article ids to filter out the non-existing sub clusters
            sub_cluster_level = int(targeted_sub_cluster_labels[0].split("-")[1])
            # if filtered:
            #     targeted_sub_cluster_labels = self.getClusterLabelSetFrom(targeted_sub_cluster_labels, sub_cluster_level)
            all_sub_cluster_at_level = self.binPartitions(sub_cluster_level, cluster_type=cluster_type)
            # keep only the sub clusters that are in the sub_cluster_labels
            targeted_sub_clusters = {sub_cluster_label: all_sub_cluster_at_level[sub_cluster_label] for sub_cluster_label in targeted_sub_cluster_labels}
            return targeted_sub_clusters
    
    def getClusterLabelSetFrom(self, nonFilteredClusterLabels, level):
        partition = self.partitions_article[level]
        all_partition_labels = partition.keys()
        filteredClusterLabels = list(filter(lambda cluster_label: cluster_label in all_partition_labels, nonFilteredClusterLabels))
        return filteredClusterLabels


    
    def getClusterDetail(self, level, cluster_label):
        # get the article nodes
        article_node_ids = _binPartitions(self.nodes, self.partitions_article[level])[int(cluster_label)]
        article_nodes = [self.article_dict[node_id] for node_id in article_node_ids]

        # get the argument links
        cluster_links = [link for link in self.links if link['source'] in article_node_ids or link['target'] in article_node_ids]
        argument_node_ids = [link['source'] if link['target'] in article_node_ids else link['target'] for link in cluster_links]
        argument_nodes = [self.node_dict[node_id] for node_id in argument_node_ids]

        # filter out entities from arguments
        entity_node_ids = [node_id for node_id in argument_node_ids if self.node_dict[node_id]['id'] != self.node_dict[node_id]['title']]
        entity_nodes = [self.node_dict[node_id] for node_id in entity_node_ids] 

        # add up article and entities to form cluster nodes
        cluster_node_ids = article_node_ids + entity_node_ids
        # filter out links that connect article and argument (not entities)
        article_entity_links = [link for link in cluster_links if link['source'] in cluster_node_ids and link['target'] in cluster_node_ids]

        # compute statistics
        # cluster_statistics = _network_statistics(article_node_ids, entity_node_ids, article_entity_links)

        # sort entities by degree
        # entity_nodes_sorted = sorted(entity_nodes, key=lambda node: cluster_statistics['entity_node_statistics'][node['id']]['degree'], reverse=True)
        # candidate_entity_nodes = entity_nodes_sorted[:10]

        return article_nodes, \
                entity_nodes, \
                argument_nodes, \
                article_entity_links, \
                None

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
    argument_nodes = list(filter(lambda node: node['type'] == 'entity', nodes))
    # entity nodes
    entity_nodes = list(filter(lambda node: node['type'] == 'entity', nodes))
    entity_node_ids = [node['id'] for node in entity_nodes]
    entity_dict = {node['id']: node for node in entity_nodes}

    # entity links
    entity_links = list(filter(lambda link: link['source'] in entity_node_ids or link['target'] in entity_node_ids, links))
    # compute statistics
    # network_statistics = _network_statistics(article_node_ids, entity_node_ids, links)

    return article_nodes, article_dict, node_dict, argument_nodes, entity_nodes, entity_dict, entity_links

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

# def _network_statistics(article_node_ids, entity_node_ids, links):
#     # construct bipartite network for statistics
#     nx_entity_links = list(map(lambda link: (link['source'], link['target']), links))
#     B = nx.Graph()
#     B.add_nodes_from(article_node_ids, bipartite=0)
#     B.add_nodes_from(entity_node_ids, bipartite=1)
#     B.add_edges_from(nx_entity_links)

#     # entity node statistics
#     # 1. degree
#     entity_node_statistics = {}
#     entity_node_degrees = B.degree(entity_node_ids)
#     for node, degree in entity_node_degrees:
#         entity_node_statistics[node] = {
#             "degree": degree,
#         }

#     return {
#         "entity_node_statistics": entity_node_statistics,
#     }


# def addLeafLabel(nodes, partition):
#     for node in nodes:
#         node['leaf_label'] = partition[node['id']]
#     return nodes

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


# def filter_nodes(nodes, links, options):
#     # filter nodes with less than options['community_size'] number of nodes
#     for option, condition in options.items():
#         if option == 'community_size':
#             nodes, links = filter_nodes_by_community_size(nodes, links, condition)
#     return nodes, links

# def filter_nodes_by_community_size(nodes, links, community_size):
#     community_size_dict = defaultdict(int)
#     for node in nodes:
#         if node['type'] == 'hyper_edge': continue
#         community_size_dict[node['community']] += 1
#     remain_nodes = [node for node in nodes if node['type'] == 'hyper_edge' or community_size_dict[node['community']] >= community_size] 
#     remain_links = [link for link in links if link['source'] in list(map(lambda node: node['id'], remain_nodes)) and link['target'] in list(map(lambda node: node['id'], remain_nodes))]
#     # clean up degree 0 hyper edge nodes
#     remain_nodes = [node for node in remain_nodes if node['type'] == 'entity' or degree(node, remain_links) > 0]

#     return remain_nodes, remain_links

def degree(node, links):
    return len(list(filter(lambda link: link['source'] == node['id'] or link['target'] == node['id'], links)))

if __name__ == "__main__":
    event_network = EventHGraph()

        


