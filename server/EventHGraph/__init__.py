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
        communities_data = json.load(open(data_path + 'ID_event_hgraph/communities.json'))
        # network_data['nodes'] = add_community_labels(network_data['nodes'], communities_data, node_to_index_dict)

        self.community_size_dict = compute_community_size_dict(communities_data)
        self.communities = list(map(lambda label: str(label), self.community_size_dict.keys()))

        # self.nodes, self.links = network_data['nodes'], network_data['links']

        rams_network_data = json.load(open(data_path + 'RAMS/dev_subgraph.json'))
        rams_gpt_network_data = json.load(open(data_path + 'RAMS/gpt_dev.json'))
        rams_gpt_communities = json.load(open(data_path + 'RAMS/gpt_biHgraph_dev/ravasz_partitions.json'))
        self.nodes, self.links = rams_gpt_network_data['nodes'], rams_gpt_network_data['links']
        self.ravasz_communities = rams_gpt_communities
        # self.nodes, self.links = rams_network_data['nodes'], rams_network_data['links']

    def apply_filters(self, filters):
        return _apply_filters(filters, self.nodes, self.links, self.community_size_dict)

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

        



