import json
import dataclasses
from collections import defaultdict
from pprint import pprint
import numpy as np
import functools
from juliacall import Main as jl
from juliacall import Pkg as jlPkg
import hypernetx as hnx
import BratUtils
import networkx as nx
import copy

# import BratUtils
class EventHGraph:
    def __init__(self, data_path) -> None:
        # # event_network = BratUtils.brat_data_to_network(data_path)
        # # TODO: move event network construction from jupyter notebook to here
        # network_data = json.load(open(data_path + 'ID_event_hgraph/event_network_data.json'))

        # # TODO: move from jupyter notebook to here
        # node_to_index_dict = json.load(open(data_path + 'node_to_index.json'))

        # # TODO: move community detection from jupyter notebook to here
        # communities_data = json.load(open(data_path + 'ID_event_hgraph/communities.json'))
        # network_data['nodes'] = add_community_labels(network_data['nodes'], communities_data, node_to_index_dict)

        # self.community_size_dict = compute_community_size_dict(communities_data)
        # self.communities = list(map(lambda label: str(label), self.community_size_dict.keys()))

        # self.nodes, self.links = network_data['nodes'], network_data['links']

        # # RAMS
        # rams_network_data = json.load(open(data_path + 'RAMS/dev_subgraph.json'))
        # # GPT-processsed
        # rams_gpt_network_data = json.load(open(data_path + 'RAMS/gpt_dev_hgraph.json'))
        # rams_gpt_partitions = json.load(open(data_path + 'RAMS/gpt_biHgraph_dev/ravasz_partitions.json'))
        # rams_gpt_hierarchy = json.load(open(data_path + 'RAMS/gpt_biHgraph_dev/ravasz_hierarchies.json'))
        
        # AllTheNews
        atn_gpt_network_data = json.load(open(data_path + 'AllTheNews/network/server/frontend.json'))
        atn_gpt_partitions = json.load(open(data_path + 'AllTheNews/network/server/ravasz_partitions.json'))
        atn_gpt_hierarchy = json.load(open(data_path + 'AllTheNews/network/server/ravasz_hierarchies.json'))
        # self.network_statistics = json.load(open(data_path + 'AllTheNews/network/server/entity_node_statistics.json'))

        #################
        #################
        # prepare data
        self.nodes, self.links = atn_gpt_network_data['nodes'], atn_gpt_network_data['links']
        # hyperedge nodes
        self.hyperedge_nodes = list(filter(lambda node: node['type'] == 'hyper_edge', self.nodes))
        self.hyperedge_node_ids = [node['id'] for node in self.hyperedge_nodes]
        self.hyperedge_dict = {node['id']: node for node in self.hyperedge_nodes}
        # argument nodes
        self.node_dict = {node['id']: node for node in self.nodes}
        self.argument_nodes = list(filter(lambda node: node['type'] == 'entity', self.nodes))
        # entity nodes
        self.entity_nodes = list(filter(lambda node: node['type'] == 'entity' and node['id'] != node['title'], self.nodes))
        self.entity_node_ids = [node['id'] for node in self.entity_nodes]
        # compute statistics
        self.network_statistics = _network_statistics(self.hyperedge_node_ids, self.entity_node_ids, self.links)

        #################
        #################
        # prepare for frontend
        self.entity_nodes_sorted = sorted(self.entity_nodes, key=lambda node: self.network_statistics['entity_node_statistics'][node['id']]['degree'], reverse=True)
        self.ravasz_partitions = atn_gpt_partitions
        # self.hyperedge_nodes = addLeafLabel(self.hyperedge_nodes, self.ravasz_partitions[0])

        # add hyperedge node order
        self.hyperedge_nodes = addOrder(self.hyperedge_nodes, atn_gpt_hierarchy, self.ravasz_partitions[0])
        # sort hyperedge nodes by dfs order
        self.hyperedge_nodes = sorted(self.hyperedge_dict.values(), key=lambda node: node['order'])

        self.hierarchy = atn_gpt_hierarchy
        self.hierarchy_flattened = flatten_hierarchy(self.hierarchy)
        # self.nodes, self.links = rams_network_data['nodes'], rams_network_data['links']

    def apply_filters(self, filters, test=False):
        if test:
            return _get_hierarchy(self.nodes, self.links, self.ravasz_partitions, filters)
        return _apply_filters(filters, self.nodes, self.links, self.community_size_dict)

    def filter_links(self, nodes, links):
        node_ids = list(map(lambda node: node['id'], nodes))
        return [link for link in links if link['source'] in node_ids and link['target'] in node_ids]

    def binPartitions(self, level):
        return _binPartitions(self.ravasz_partitions[int(level)], level)
    
    def getSubClusterNumDict(self, cluster_labels):
        sub_cluster_num_dict = {}
        for cluster_label in cluster_labels:
            hierarchy_of_cluster = self.hierarchy_flattened[cluster_label]
            sub_cluster_num_dict[cluster_label] = hierarchy_of_cluster['children']
        return sub_cluster_num_dict

        # queue = copy.deepcopy(self.hierarchy['children'])
        # sub_cluster_num_dict = {}
        # while(len(queue) > 0):
        #     cur = queue[0]
        #     cur_level = int(cur['title'].split("-")[1])
        #     if cur_level == level:
        #         sub_cluster = cur['children']
        #         sub_cluster_ids = list(map(lambda cluster: cluster['title'], sub_cluster))
        #         sub_cluster_num_dict[cur['title']] = list(map(lambda id: id, sub_cluster_ids))
        #     elif cur_level > level:
        #         queue += cur['children']
        #     queue = queue[1:]
        # return sub_cluster_num_dict
    def getSubClusters(self, cluster_labels, isList=False):
        if isList:
            res = []
            for cluster_label in cluster_labels:
                res += self.hierarchy_flattened[cluster_label]['children']
            return res
        else:
            return self.hierarchy_flattened[cluster_labels]['children']
    
    def getClusterDetail(self, level, cluster_label):
        # get the hyperedge nodes
        hyperedge_node_ids = _binPartitions(self.nodes, self.ravasz_partitions[level])[int(cluster_label)]
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
        target_leaf_node = list(filter(lambda node: str(leaf_partition[node['id']]) == str(cluster_label), nodes))[0]
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

        


