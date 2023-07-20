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

        self.nodes, self.links = atn_gpt_network_data['nodes'], atn_gpt_network_data['links']
        self.hyperedge_nodes = list(filter(lambda node: node['type'] == 'hyper_edge', self.nodes))
        self.hyperedge_dict = {node['id']: node for node in self.hyperedge_nodes}
        self.entity_nodes = list(filter(lambda node: node['type'] == 'entity', self.nodes))
        self.ravasz_partitions = atn_gpt_partitions
        self.hyperedge_nodes = addLeafLabel(self.hyperedge_nodes, self.ravasz_partitions[0])
        self.hierarchy = atn_gpt_hierarchy
        # self.nodes, self.links = rams_network_data['nodes'], rams_network_data['links']

    def apply_filters(self, filters, test=False):
        if test:
            return _get_hierarchy(self.nodes, self.links, self.ravasz_partitions, filters)
        return _apply_filters(filters, self.nodes, self.links, self.community_size_dict)

    def binPartitions(self, level):
        return _binPartitions(self.nodes, self.ravasz_partitions[level])

def addLeafLabel(nodes, partition):
    for node in nodes:
        node['leaf_label'] = partition[node['id']]
    return nodes

def _binPartitions(nodes, partition):
    node_dict = {node['id']: node for node in nodes}
    clusters = defaultdict(list)
    for node_id, cluster_label in partition.items():
        clusters[cluster_label].append(node_dict[node_id])
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

        



