import json
import networkx as nx
import hypernetx as hnx
from pprint import pprint
def save_json(data, filepath=r'new_data.json'):
    with open(filepath, 'w') as fp:
        json.dump(data, fp, indent=4, ensure_ascii=False)

def transform_vispub(articles):
    res = []
    for article in articles:
        res.append({
            "id": "vis_" + str(article['id']),
            "summary": article['Abstract'],
            "content": article['Abstract'],
            "title": article['Title'],
            "date": article['Year'],
            "publication": article['Conference'],
            "event": {
                "title": article['Title'],
                "type": "publication",
                "participants": [
                    {
                        "entity_id": keyword,
                        "entity_title": keyword,
                        "raw_mention": keyword,
                        "entity_type": None
                    }
                    for keyword in article['keywords']
                ]
            }
        })
    return res

def construct_network(docs):
    entity_dict = {}
    article_dict = {}
    links = []
    for doc in docs:
        doc_id = doc['id']
        article_dict[doc_id] = doc
        event = doc['event']
        article_id = str(doc_id)
        participants = event['participants']
        # create an entity node for each participant
        for participant in participants:
            participant_id = participant['entity_id']
            participant_word = participant['raw_mention']
            participant_title = participant['entity_title'] 
            participant_entity_type = participant['entity_type'] 

            if participant_id not in entity_dict.keys():
                entity_dict[participant_id] = {
                    "id": participant_id, 
                    "title": participant_title,
                    "entity_type": participant_entity_type,
                    "type": "entity",
                    "mentions": [
                        {
                            "doc_id": doc_id,
                            "mention": participant_word,
                        }
                    ]
                }
            else:
                entity_dict[participant_id]['mentions'].append(
                    {
                        "doc_id": doc_id,
                        "mention": participant_word,
                    }
                )
            for participant in participants:
                participant_id = participant['entity_id']
                links.append((article_id, participant_id))

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
            entity_dict[node]['type'] = 'entity'
            res_nodes.append(entity_dict[node])
        else:
            # node = int(node)
            date = article_dict[node]['date'].replace("-", "/")
            date.replace("-", "/")
            article_dict[node]['date'] = date
            article_dict[node]['type'] = 'article'

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

def main():
    print("reading data...")
    articles = json.load(open('test/data/result/VisPub/articles_w_keywords.json'))
    print(len(articles))
    print("transforming data...")
    transformed = transform_vispub(articles)
    print("saving data... to test/data/result/VisPub/linked/linked.json")
    save_json(transformed, 'test/data/result/VisPub/linked/linked.json')

    print("constructing network...")
    B, entity_dict, article_dict = merge_network(transformed)
    hgraph_data = nx.node_link_data(B)
    print("saving network... to test/data/result/VisPub/network/")
    save_json(hgraph_data, 'test/data/result/VisPub/network/hgraph.json')
    save_json(entity_dict, 'test/data/result/VisPub/network/entities.json')
    save_json(article_dict, 'test/data/result/VisPub/network/articles.json')
    print("transforming network for frontend...")
    network = transform_frontend(list(B.nodes), list(B.edges), entity_dict, article_dict)
    print("saving network... to test/data/result/VisPub/network/server/frontend.json")
    save_json(network, 'test/data/result/VisPub/network/server/frontend.json')

if __name__ == "__main__":
    main()