import json
from collections import defaultdict
from pprint import pprint
import numpy as np
import hypernetx as hnx
import networkx as nx
import copy

class EventHGraph:
    def __init__(self, data_path, target_hyperedge_ids=None) -> None:
        # AllTheNews
        atn_gpt_network_data = json.load(open(data_path + 'AllTheNews/network/server/frontend.json'))
        atn_gpt_partitions_hyperedge = json.load(open(data_path + 'AllTheNews/network/server/ravasz_partitions_hyperedge.json'))
        atn_gpt_hierarchy_hyperedge = json.load(open(data_path + 'AllTheNews/network/server/ravasz_hierarchies_hyperedge.json'))
        atn_gpt_partitions_entity = json.load(open(data_path + 'AllTheNews/network/server/ravasz_partitions_entity.json'))
        atn_gpt_hierarchy_entity = json.load(open(data_path + 'AllTheNews/network/server/ravasz_hierarchies_entity.json'))
        hierarchical_topics = json.load(open(data_path + 'AllTheNews/network/server/hierarchical_topics.json'))
        self.hierarchy_hyperedge = atn_gpt_hierarchy_hyperedge
        self.hierarchy_entity = atn_gpt_hierarchy_entity

        self.hierarchical_topics = hierarchical_topics

        #################
        #################
        # prepare data
        self.nodes, self.links, self.partitions_hyperedge, self.partitions_entity = filter_network(
            atn_gpt_network_data['nodes'],
            atn_gpt_network_data['links'],
            atn_gpt_partitions_hyperedge,
            atn_gpt_partitions_entity,
            target_hyperedge_ids
        )
        self.hierarchy_hyperedge = atn_gpt_hierarchy_hyperedge
        self.hierarchy_entity = atn_gpt_hierarchy_entity
        # self.nodes, self.links = atn_gpt_network_data['nodes'], atn_gpt_network_data['links']
        # self.ravasz_partitions = atn_gpt_partitions
        # if target_hyperedge_ids != None:
        #     self.links = [link for link in self.links if link['source'] in target_hyperedge_ids or link['target'] in target_hyperedge_ids]
        #     self.nodes = [node for node in self.nodes if node['id'] in target_hyperedge_ids or node['id'] in list(map(lambda link: link['source'], self.links)) or node['id'] in list(map(lambda link: link['target'], self.links))]
        #     for level in self.ravasz_partitions:
        #         for hyperedge_node_id in level.keys():
        #             if hyperedge_node_id not in self.nodes:
        #                 del level[hyperedge_node_id]

        # hyperedge nodes
        # self.hyperedge_nodes = list(filter(lambda node: node['type'] == 'hyper_edge', self.nodes))
        # self.hyperedge_node_ids = [node['id'] for node in self.hyperedge_nodes]
        # self.hyperedge_dict = {node['id']: node for node in self.hyperedge_nodes}
        # # argument nodes
        # self.node_dict = {node['id']: node for node in self.nodes}
        # self.argument_nodes = list(filter(lambda node: node['type'] == 'entity', self.nodes))
        # # entity nodes
        # self.entity_nodes = list(filter(lambda node: node['type'] == 'entity' and node['id'] != node['title'], self.nodes))
        # self.entity_node_ids = [node['id'] for node in self.entity_nodes]
        # # compute statistics
        # self.network_statistics = _network_statistics(self.hyperedge_node_ids, self.entity_node_ids, self.links)
        self.hyperedge_nodes, \
        self.hyperedge_dict, \
        self.node_dict, \
        self.argument_nodes, \
        self.entity_nodes, \
        self.entity_dict, \
        self.entity_links, \
        self.network_statistic = prepare_data(self.nodes, self.links)

        #################
        #################
        # prepare for frontend
        self.hyperedge_nodes, \
        self.hierarchy_flattened_hyperedge, \
        self.entity_nodes, \
        self.hierarchy_flattened_entity = prepare_frontend(
            self.entity_nodes, 
            self.hyperedge_nodes,
            self.network_statistic, 
            self.hierarchy_hyperedge, self.partitions_hyperedge, self.hyperedge_dict, 
            self.hierarchy_entity, self.partitions_entity, self.entity_dict, 
        )
        self.original_hyperedge_nodes = copy.deepcopy(self.hyperedge_nodes)
        self.original_partition_hyperedge = self.partitions_hyperedge

        # self.entity_nodes_sorted = sorted(self.entity_nodes, key=lambda node: self.network_statistics['entity_node_statistics'][node['id']]['degree'], reverse=True)
        # # add hyperedge node order
        # self.hyperedge_nodes = addOrder(self.hyperedge_nodes, atn_gpt_hierarchy, self.ravasz_partitions[0])
        # # sort hyperedge nodes by dfs order
        # self.hyperedge_nodes = sorted(self.hyperedge_dict.values(), key=lambda node: node['order'])

        # self.hierarchy_flattened = flatten_hierarchy(self.hierarchy)

    def resetFiltering(self):
        self.hyperedge_nodes = copy.deepcopy(self.original_hyperedge_nodes)
        self.hyperedge_dict = {node['id']: node for node in self.hyperedge_nodes}
        self.partitions_hyperedge = self.original_partition_hyperedge
        return

    def filter_hyperedge_nodes(self, target_hyperedge_ids):
        filtered_hyperedge_nodes = list(filter(lambda node: node['id'] in target_hyperedge_ids, self.hyperedge_nodes))
        return filtered_hyperedge_nodes
        self.nodes, self.links, self.ravasz_partitions = filter_network(
            self.nodes,
            self.links,
            self.ravasz_partitions,
            target_hyperedge_ids
        )

        self.hyperedge_nodes, \
        self.hyperedge_dict, \
        self.node_dict, \
        self.argument_nodes, \
        self.entity_nodes, \
        self.network_statistic = prepare_data(self.nodes, self.links)
        if target_hyperedge_ids:
            for hyperedge_node in self.hyperedge_nodes:
                assert(hyperedge_node['id'] in target_hyperedge_ids)

        self.entity_nodes_sorted, \
        self.hyperedge_nodes, \
        self.hierarchy_flattened = prepare_frontend(
            self.entity_nodes, 
            self.hyperedge_nodes,
            self.network_statistic, 
            self.hierarchy, 
            self.ravasz_partitions, 
            self.hyperedge_dict
        )


    # def apply_filters(self, filters, test=False):
    #     if test:
    #         return _get_hierarchy(self.nodes, self.links, self.ravasz_partitions, filters)
    #     return _apply_filters(filters, self.nodes, self.links, self.community_size_dict)
    def getDocData(self, doc_id, fieldName):
        hyperedge_id = self.doc_id_to_hyperedge_id[doc_id]
        return self.hyperedge_dict[hyperedge_id][fieldName]

    def binPartitions(self, level, type='hyperedge'):
        if type == 'hyperedge':
            return _binPartitions(self.partitions_hyperedge[int(level)], level)
        elif type == 'entity':
            return _binPartitions(self.partitions_entity[int(level)], level)
        
    
    def getSubClusterNumDict(self, cluster_labels, type='hyperedge'):
        if type == 'hyperedge':
            hierarchy_flattened = self.hierarchy_flattened_hyperedge
        else:
            hierarchy_flattened = self.hierarchy_flattened_entity

        sub_cluster_num_dict = {}
        for cluster_label in cluster_labels:
            hierarchy_of_cluster = hierarchy_flattened[cluster_label]
            sub_cluster_num_dict[cluster_label] = hierarchy_of_cluster['children']
        return sub_cluster_num_dict

    def getSubClusterLabels(self, cluster_labels, isList=False, type='hyperedge'):
        if type == 'hyperedge':
            hierarchy_flattened = self.hierarchy_flattened_hyperedge
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
    #     for sub_cluster_label, hyperedge_nodes in cluster_labels.items():
    #         hyperedge_nodes = list(filter(lambda node: node['id'] in hyperedge_nodes, self.hyperedge_nodes))
    #         if len(hyperedge_nodes) == 0: continue
    #         res[sub_cluster_label] = hyperedge_nodes
    #     return res

    def getSubClusters(self, cluster_labels, isList=False, filtered=False):
        # TODO: add support for entity sub clusters
        if isList:
            targeted_sub_clusters = {}
            for cluster_label in cluster_labels:
                targeted_sub_cluster_labels = self.getSubClusterLabels(cluster_label)
                # some of the targeted sub clusters might not exist
                # user hyperedge ids to filter out the non-existing sub clusters
                sub_cluster_level = int(targeted_sub_cluster_labels[0].split("-")[1])
                if filtered:
                    targeted_sub_cluster_labels = self.getClusterLabelSetFrom(targeted_sub_cluster_labels, sub_cluster_level)
                all_sub_cluster_at_level = self.binPartitions(sub_cluster_level)
                # keep only the sub clusters that are in the sub_cluster_labels
                for sub_cluster_label in targeted_sub_cluster_labels:
                    targeted_sub_clusters[sub_cluster_label] = all_sub_cluster_at_level[sub_cluster_label]
            return targeted_sub_clusters
        else:
            targeted_sub_cluster_labels = self.getSubClusterLabels(cluster_labels) 
            # some of the targeted sub clusters might not exist
            # user hyperedge ids to filter out the non-existing sub clusters
            sub_cluster_level = int(targeted_sub_cluster_labels[0].split("-")[1])
            if filtered:
                targeted_sub_cluster_labels = self.getClusterLabelSetFrom(targeted_sub_cluster_labels, sub_cluster_level)
            all_sub_cluster_at_level = self.binPartitions(sub_cluster_level)
            # keep only the sub clusters that are in the sub_cluster_labels
            targeted_sub_clusters = {sub_cluster_label: all_sub_cluster_at_level[sub_cluster_label] for sub_cluster_label in targeted_sub_cluster_labels}
            return targeted_sub_clusters
    
    def getClusterLabelSetFrom(self, nonFilteredClusterLabels, level):
        partition = self.partitions_hyperedge[level]
        all_partition_labels = partition.keys()
        filteredClusterLabels = list(filter(lambda cluster_label: cluster_label in all_partition_labels, nonFilteredClusterLabels))
        return filteredClusterLabels


    
    def getClusterDetail(self, level, cluster_label):
        # get the hyperedge nodes
        hyperedge_node_ids = _binPartitions(self.nodes, self.partitions_hyperedge[level])[int(cluster_label)]
        hyperedge_nodes = [self.hyperedge_dict[node_id] for node_id in hyperedge_node_ids]

        # get the argument links
        cluster_links = [link for link in self.links if link['source'] in hyperedge_node_ids or link['target'] in hyperedge_node_ids]
        argument_node_ids = [link['source'] if link['target'] in hyperedge_node_ids else link['target'] for link in cluster_links]
        argument_nodes = [self.node_dict[node_id] for node_id in argument_node_ids]

        # filter out entities from arguments
        entity_node_ids = [node_id for node_id in argument_node_ids if self.node_dict[node_id]['id'] != self.node_dict[node_id]['title']]
        entity_nodes = [self.node_dict[node_id] for node_id in entity_node_ids] 

        # add up hyperedge and entities to form cluster nodes
        cluster_node_ids = hyperedge_node_ids + entity_node_ids
        # filter out links that connect hyperedge and argument (not entities)
        hyperedge_entity_links = [link for link in cluster_links if link['source'] in cluster_node_ids and link['target'] in cluster_node_ids]

        # compute statistics
        cluster_statistics = _network_statistics(hyperedge_node_ids, entity_node_ids, hyperedge_entity_links)

        # sort entities by degree
        entity_nodes_sorted = sorted(entity_nodes, key=lambda node: cluster_statistics['entity_node_statistics'][node['id']]['degree'], reverse=True)
        candidate_entity_nodes = entity_nodes_sorted[:10]

        return hyperedge_nodes, \
                entity_nodes, \
                argument_nodes, \
                candidate_entity_nodes, \
                hyperedge_entity_links, \
                None

def filter_network(nodes, links, partitions_hyperedge, partitions_entity, target_hyperedge_ids=None):
    if target_hyperedge_ids != None:
        links = [link for link in links if link['source'] in target_hyperedge_ids or link['target'] in target_hyperedge_ids]
        nodes = [node for node in nodes if node['id'] in target_hyperedge_ids or node['id'] in list(map(lambda link: link['source'], links)) or node['id'] in list(map(lambda link: link['target'], links))]
        for level in partitions_hyperedge:
            del_keys = []
            for hyperedge_node_id in level.keys():
                if hyperedge_node_id not in nodes:
                    del_keys.append(hyperedge_node_id)
            for key in del_keys:         
                del level[key]
        # TODO: add filters for entity partitions
    return nodes, links, partitions_hyperedge, partitions_entity


def prepare_data(nodes, links):
    # hyperedge nodes
    hyperedge_nodes = list(filter(lambda node: node['type'] == 'hyper_edge', nodes))
    hyperedge_node_ids = [node['id'] for node in hyperedge_nodes]
    hyperedge_dict = {node['id']: node for node in hyperedge_nodes}
    # argument nodes
    node_dict = {node['id']: node for node in nodes}
    argument_nodes = list(filter(lambda node: node['type'] == 'entity', nodes))
    # entity nodes
    entity_nodes = list(filter(lambda node: node['type'] == 'entity' and node['id'] != node['title'], nodes))
    entity_node_ids = [node['id'] for node in entity_nodes]
    entity_dict = {node['id']: node for node in entity_nodes}

    # entity links
    entity_links = list(filter(lambda link: link['source'] in entity_node_ids or link['target'] in entity_node_ids, links))
    # compute statistics
    network_statistics = _network_statistics(hyperedge_node_ids, entity_node_ids, links)

    return hyperedge_nodes, hyperedge_dict, node_dict, argument_nodes, entity_nodes, entity_dict, entity_links, network_statistics

def prepare_frontend(
        entity_nodes, 
        hyperedge_nodes, 
        network_statistics, 
        hierarchy_hyperedge, partitions_hyperedge, hyperedge_dict,
        hierarchy_entity, partitions_entity, entity_dict,
        ):
    # prepare for frontend
    # entity_nodes_sorted = sorted(entity_nodes, key=lambda node: network_statistics['entity_node_statistics'][node['id']]['degree'], reverse=True)

    # add hyperedge node order
    addOrder(hyperedge_nodes, hierarchy_hyperedge, partitions_hyperedge[0])
    # sort hyperedge nodes by dfs order
    hyperedge_nodes = sorted(hyperedge_dict.values(), key=lambda node: node['order'])

    # add entity node order
    addOrder(entity_nodes, hierarchy_entity, partitions_entity[0])
    # sort hyperedge nodes by dfs order
    entity_nodes = sorted(entity_dict.values(), key=lambda node: node['order'])


    hierarchy_flattened_hyperedge = flatten_hierarchy(hierarchy_hyperedge)
    hierarchy_flattened_entity = flatten_hierarchy(hierarchy_entity)
    return hyperedge_nodes, hierarchy_flattened_hyperedge, entity_nodes, hierarchy_flattened_entity



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

def _network_statistics(hyperedge_node_ids, entity_node_ids, links):
    # construct bipartite network for statistics
    nx_entity_links = list(map(lambda link: (link['source'], link['target']), links))
    B = nx.Graph()
    B.add_nodes_from(hyperedge_node_ids, bipartite=0)
    B.add_nodes_from(entity_node_ids, bipartite=1)
    B.add_edges_from(nx_entity_links)

    # entity node statistics
    # 1. degree
    entity_node_statistics = {}
    entity_node_degrees = B.degree(entity_node_ids)
    for node, degree in entity_node_degrees:
        entity_node_statistics[node] = {
            "degree": degree,
        }

    return {
        "entity_node_statistics": entity_node_statistics,
    }


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
    
def _apply_filters(filters, nodes, links, community_size_dict):
    filtered_nodes = nodes
    filtered_links = links
    return filtered_nodes, filtered_links, []
    nodes_dict = {node['id']: node for node in nodes}
    # calculate community sizes
    for key, value in filters.items():
        if key == 'community_size':
            # filter out entity nodes that are not in the communities with size >= value
            hyper_edges = [node for node in filtered_nodes if node['type'] == 'hyper_edge']

            filtered_hyper_edges = [hyper_edge for hyper_edge in hyper_edges if all([community_size_dict[node['community']] >= value for node in [nodes_dict[node_id] for node_id in (hyper_edge['arguments'])]])]
            filtered_nodes = recover_nodes_from_hyper_edges(filtered_hyper_edges, nodes_dict)
            filtered_entities = [node for node in filtered_nodes if node['type'] != 'hyper_edge']
            communities = list(set(map(lambda node: str(node['community']), filtered_entities)))
        
        if key == 'selected_communities' and value != "all":
            selected_communities = list(map(lambda community: str(community), value))
            # filter out entity nodes that are not in the selected communities
            # do the filtering by filtering links first
            hyper_edges = [node for node in filtered_nodes if node['type'] == 'hyper_edge']
            filtered_hyper_edges = [hyper_edge for hyper_edge in hyper_edges if any([str(node['community']) in selected_communities for node in [nodes_dict[node_id] for node_id in (hyper_edge['arguments'])]])]
            filtered_nodes = recover_nodes_from_hyper_edges(filtered_hyper_edges, nodes_dict)

    # filter out links that are not between the filtered nodes
    filtered_links = [link for link in filtered_links if link['source'] in list(map(lambda node: node['id'], filtered_nodes)) and link['target'] in list(map(lambda node: node['id'], filtered_nodes))]
    # filtered_nodes = [node for node in filtered_nodes if node['id'] in list(map(lambda link: link['source'], filtered_links)) or node['id'] in list(map(lambda link: link['target'], filtered_links))]
    return filtered_nodes, filtered_links, communities

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

        


