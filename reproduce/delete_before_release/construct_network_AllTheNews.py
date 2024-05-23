import networkx as nx
import json
import time
def save_json(data, filepath=r'new_data.json'):
    with open(filepath, 'w') as fp:
        json.dump(data, fp, indent=4, ensure_ascii=False)

def flatten(xss):
    return [x for xs in xss for x in xs]

def reformat_doc(doc):
    event = doc['events']
    # participants = flatten([event['participants'] for event in events])
    participants = event['participants']
    participant_dict = {
        participant['entity_id']: {
            "entity_id": participant['entity_id'],
            "entity_title": participant['entity_word'],
            "raw_mention": participant['entity_word'],
            "entity_type": participant['entity_type'] if 'entity_type' in participant else "None",
        } 
        for participant in participants
    }
    res_event = {
        "title": "N/A",
        "type": "article",
        "participants": list(participant_dict.values())
    }
    doc['event'] = res_event
    doc['id'] = doc['doc_id']
    del doc['doc_id']
    del doc['events']
    return doc
# create node link graph
def construct_network(docs):
    entity_dict = {}
    article_dict = {}
    links = []
    for doc in docs:
        doc_id = str(doc['doc_id'])
        event = doc['events']
        participants = event['participants']
        # create an entity node for each argument
        for participant in participants:
            entity_id = participant['entity_id']
            # entity_title = participant['entity_id']
            # entity_id = disambiguated_keywords[entity_title] 
            entity_title = participant['entity_title'] if 'entity_title' in participant else participant['entity_word']
            entity_type = participant['entity_type'] if 'entity_type' in participant else "None"
            if entity_id not in entity_dict.keys():
                entity_dict[entity_id] = {
                    "id": entity_id, 
                    "title": entity_title,
                    "entity_type": entity_type,
                    "type": "entity",
                    "mentions": [
                        {
                            "doc_id": doc_id,
                            "mention": participant['entity_word'],
                            # "span": {'start': argument_span[0], 'end': argument_span[1]}
                        }
                    ]
                }
            else:
                entity_dict[entity_id]['mentions'].append(
                        {
                            "doc_id": doc_id,
                            "mention": participant['entity_word'],
                            # "span": {'start': argument_span[0], 'end': argument_span[1]}
                        }
                    )
            links.append((doc_id, entity_id))
        article_dict[doc_id] = reformat_doc(doc)
    return entity_dict, article_dict, links

def merge_network(dataset):
    entity_dict, article_dict, links = construct_network(dataset)
    B = nx.Graph()
    B.add_nodes_from(list(article_dict.keys()), bipartite=0)
    B.add_nodes_from(list(entity_dict.keys()), bipartite=1)
    B.add_edges_from(links)

    return B, entity_dict, article_dict

def transform_frontend(nodes, links, entity_dict, article_dict):
    res_nodes = []
    res_links = []
    for node in nodes:
        if node in entity_dict:
            res_nodes.append(entity_dict[node])
        else:
            res_nodes.append(article_dict[node])

    for link in links:
        source = link[0]
        target = link[1]
        res_links.append({
            "source": source,
            "target": target,
        })
    return {
        "nodes": res_nodes, 
        "links": res_links
    }
def reverse_construct_network(article_nodes, entity_nodes, links):
    article_dict = {article['id']: article for article in article_nodes}
    entity_dict = {entity['id']: entity for entity in entity_nodes}
    links = []
    for article in article_nodes:
        participants = article['event']['participants']
        for participant in participants:
            links.append((article['id'], participant['entity_id']))

    return entity_dict, article_dict, links
def main():
    start_time = time.time()
    # transformed_dataset = json.load(open('data/result/linked/articles_w_keywords.json'))
    # B, entity_dict, article_dict = merge_network(transformed_dataset)
    # hgraph_data = nx.node_link_data(B)
    frontend_data = json.load(open('AllTheNews/frontend.json'))
    nodes = frontend_data['nodes']
    article_nodes = [node for node in nodes if node['type'] == 'article']
    entity_nodes = [node for node in nodes if node['type'] == 'entity']
    links = frontend_data['links']
    entity_dict, article_dict, links = reverse_construct_network(article_nodes, entity_nodes, links)
    B = nx.Graph()
    B.add_nodes_from(list(article_dict.keys()), bipartite=0)
    B.add_nodes_from(list(entity_dict.keys()), bipartite=1)
    B.add_edges_from(links)
    hgraph_data = nx.node_link_data(B)
    save_json(hgraph_data, 'data/result/network/hgraph.json')
    save_json(entity_dict, 'data/result/network/entities.json')
    save_json(article_dict, 'data/result/network/articles.json')

    # network = transform_frontend(list(B.nodes), list(B.edges), entity_dict, article_dict)
    # save_json(network, 'data/result/server/frontend.json')
    print("execution time: ", time.time() - start_time, " seconds")
    return

if __name__ == "__main__":
    main()
