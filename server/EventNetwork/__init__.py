import json
import dataclasses
from pybrat.parser import BratParser, Entity, Event, Example, Relation
from collections import defaultdict
from pprint import pprint


class EventNetwork:
    def __init__(self, data_path) -> None:
        # self.data_path = (r'../DeepEventMineTest/brat-1.3p1/data/all-brat/')
        # self.nodes, self.links = merge_event_graphs(self.data_path)

        # TODO: move event network construction from jupyter notebook to here
        network_data = json.load(open(data_path + 'event_network_data.json'))
        # TODO: move community detection from jupyter notebook to here
        communities = json.load(open(data_path + 'communities.json'))
        node_to_index_dict = json.load(open(data_path + 'node_to_index.json'))
        network_data['nodes'] = add_community_labels(network_data['nodes'], communities, node_to_index_dict)

        options = {
            "community_size": 5, 
        }
        self.nodes, self.links = filter_nodes(network_data['nodes'], network_data['links'], options)
    
def add_community_labels(nodes, communities, node_to_index_dict):
    # turn list of community labels into dict by list index
    communities_dict = {i: communities[i] for i in range(len(communities))}
    for node in nodes:
        if node['type'] != 'entity': continue
        print(node['id'])
        print(node_to_index_dict[node['id']])
        node['community'] = communities_dict[node_to_index_dict[node['id']] - 1]
    return nodes

def filter_nodes(nodes, links, options):
    # filter nodes with less than options['community_size'] number of nodes
    for option, condition in options.items():
        if option == 'community_size':
            nodes, links = filter_nodes_by_community_size(nodes, links, condition)
    return nodes, links

def filter_nodes_by_community_size(nodes, links, community_size):
    community_size_dict = defaultdict(int)
    for node in nodes:
        if node['type'] == 'hyper_edge': continue
        community_size_dict[node['community']] += 1
    remain_nodes = [node for node in nodes if node['type'] == 'hyper_edge' or community_size_dict[node['community']] >= community_size] 
    remain_links = [link for link in links if link['source'] in list(map(lambda node: node['id'], remain_nodes)) and link['target'] in list(map(lambda node: node['id'], remain_nodes))]
    # clean up degree 0 hyper edge nodes
    remain_nodes = [node for node in remain_nodes if node['type'] == 'entity' or degree(node, remain_links) > 0]

    return remain_nodes, remain_links

def degree(node, links):
    return len(list(filter(lambda link: link['source'] == node['id'] or link['target'] == node['id'], links)))

def merge_event_graphs(data_path):
    brat = BratParser(error="ignore")
    brat_data = brat.parse(data_path)
    nodes_dict = {} 
    links = []
    print("merging event network")
    doc_count = 0
    for doc in brat_data:
        doc_count += 1
        origin_id_to_new_id_dict = {}
        entity_umls = json.load(open(data_path + doc.id + r'.json'))
        print(doc.id)
        for entity in doc.entities:
            # TODO: add candidate selection. For now just choosing the first one.
            entity_ui = entity.id # reassign node id to either doc_id + original id or CUI
            if len(entity_umls[entity.id]) != 0: 
                entity_ui = entity_umls[entity.id][0]['ui']
            else:
                # TODO: consider partial matching to disambiguiate entities without CUIs
                entity_ui = doc.id + "-" + entity_ui
            origin_id_to_new_id_dict[entity.id] = entity_ui

            if entity_ui not in nodes_dict.keys():
                nodes_dict[entity_ui] = {
                    "id": entity_ui,
                    "type": "entity",
                    "mentions": [
                        {
                            "doc_id": doc.id, 
                            "mention": entity.mention, 
                            # "span": [entity.spans.start, entity.spans.end]
                            "span": [entity.spans]
                        }
                    ],
                }
            else:
                nodes_dict[entity_ui]["mentions"].append(
                    {
                        "doc_id": doc.id, 
                        "mention": entity.mention, 
                        # "span": [entity.spans.start, entity.spans.end]
                        "span": [entity.spans]
                    }
                )

        for event in doc.events:
            trigger_id = origin_id_to_new_id_dict[event.trigger.id]
            origin_id_to_new_id_dict[event.id] = trigger_id # account for nested events

            argument_ids = list(map(lambda argument: origin_id_to_new_id_dict[argument.id], event.arguments))
            nodes_dict[trigger_id]['type'] = 'event'
            nodes_dict[trigger_id]['event_type'] = event.trigger.type
            nodes_dict[trigger_id]['arguments'] = argument_ids

            for argument_id in argument_ids:
                links.append({
                    "source": trigger_id, 
                    "target": argument_id
                })
        if doc_count == 10: break
    print(len(list(nodes_dict.values())), len(links))
    # remove nodes that do not have links
    filtered_node_ids = set()
    for link in links:
        filtered_node_ids.add(link['source'])
        filtered_node_ids.add(link['target'])
    filtered_nodes = list(filter(lambda node: node['id'] in filtered_node_ids, nodes_dict.values()))
    # return list(nodes_dict.values()), links
    return filtered_nodes, links

if __name__ == "__main__":
    event_network = EventNetwork()

        



