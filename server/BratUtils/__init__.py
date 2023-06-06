import networkx as nx
import json
from pybrat.parser import BratParser, Entity, Event, Example, Relation
import matplotlib.pyplot as plt
from pprint import pprint
import numpy as np
from collections import defaultdict

def read_brat_data(data_path):
    brat = BratParser(error="ignore")
    brat_data = brat.parse(data_path)
    return brat_data

def brat_data_to_network(brat_data, data_path):
    G = nx.Graph()
    nodes_dict = {} 
    links = defaultdict(lambda: defaultdict(int))
    doc_count = 0
    argument_num_dict = defaultdict(int)
    for doc in brat_data:
        doc_count += 1
        origin_id_to_new_id_dict = {}
        entity_umls = json.load(open(data_path + doc.id + r'.json'))
#         print(doc.id)
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
                            "span": {'start': entity.spans[0].start, 'end': entity.spans[0].end}
#                             "span": entity.spans
                        }
                    ],
                }
            else:
                nodes_dict[entity_ui]["mentions"].append(
                    {
                        "doc_id": doc.id, 
                        "mention": entity.mention, 
                        "span": {'start': entity.spans[0].start, 'end': entity.spans[0].end}


#                         "span": [entity.spans.start, entity.spans.end]
#                         "span": entity.spans
                    }
                )
        # each event is treated as a hyper-edge. 
        # First create a hyper edge node, then connect the hyper edge node with the arguments
        # The node id needs to be independent, but the node type is trigger id 
        for event in doc.events:
            trigger_id = origin_id_to_new_id_dict[event.trigger.id]
            origin_id_to_new_id_dict[event.id] = trigger_id # account for nested events
            argument_ids = list(map(lambda argument: origin_id_to_new_id_dict[argument.id], event.arguments))
            
            sorted_argument_ids = sorted(argument_ids)
            # create hyper edge node
            hyper_edge_node_id = trigger_id + "-" + "-".join(sorted_argument_ids)

            if hyper_edge_node_id not in nodes_dict.keys():
                nodes_dict[hyper_edge_node_id] = {
                    "id": hyper_edge_node_id,
                    "type": "hyper_edge",
                    "trigger": trigger_id,
                    "arguments": sorted_argument_ids,
                    "mentions": [
                        {
                            "doc_id": doc.id, 
                            # TODO: add sentence span
                            # "mention": entity.mention, 
                            # "span": [entity.spans]
                        }
                    ],
                }
            else:
                nodes_dict[hyper_edge_node_id]["mentions"].append(
                    {
                        "doc_id": doc.id,
                        # TODO: add sentence span
                    }
                )

            # add links between hyper edge node and arguments
            for argument_id in argument_ids:
                links[hyper_edge_node_id][argument_id] = 1

            # argument_num_dict[len(argument_ids)].append(trigger_id)
            argument_num_dict[len(argument_ids)] += 1
#                 links.append((trigger_id, argument_id, {'attr': 'someAttr'}))
#         if doc_count == 10: break

    # turn overlapping links into link length
    links_as_list = []
    for hyper_edge_node_id, argument_ids in links.items():
        for argument_id in argument_ids.keys():
            links_as_list.append((hyper_edge_node_id, argument_id))
    
    # remove nodes that do not have links
    G.add_nodes_from([(node_id, node_attribute_dict) for node_id, node_attribute_dict in nodes_dict.items()])
    G.add_edges_from(links_as_list)
    
    G.remove_nodes_from(list(n for n in G.nodes() if G.degree(n) == 0))

    print(G.number_of_nodes(), G.number_of_edges())

    return G
