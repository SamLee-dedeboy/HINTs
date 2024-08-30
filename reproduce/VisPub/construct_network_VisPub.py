import json
import networkx as nx
import hypernetx as hnx
from pprint import pprint


def save_json(data, filepath=r"new_data.json"):
    with open(filepath, "w") as fp:
        json.dump(data, fp, indent=4, ensure_ascii=False)


def construct_network(docs):
    entity_dict = {}
    article_dict = {}
    links = []
    for doc in docs:
        doc_id = doc["id"]
        article_dict[doc_id] = doc
        event = doc["event"]
        article_id = str(doc_id)
        participants = event["participants"]
        # create an entity node for each participant
        for participant in participants:
            participant_id = participant["entity_id"]
            participant_word = participant["raw_mention"]
            participant_title = participant["entity_title"]
            participant_entity_type = participant["entity_type"]

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
                    ],
                }
            else:
                entity_dict[participant_id]["mentions"].append(
                    {
                        "doc_id": doc_id,
                        "mention": participant_word,
                    }
                )
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
            entity_dict[node]["type"] = "entity"
            res_nodes.append(entity_dict[node])
        else:
            # node = int(node)
            date = article_dict[node]["date"].replace("-", "/")
            date.replace("-", "/")
            article_dict[node]["date"] = date
            article_dict[node]["type"] = "article"

            res_nodes.append(article_dict[node])
    for link in links:
        source = link[0]
        target = link[1]
        res_links.append(
            {
                "source": source,
                "target": target,
            }
        )
    return {"nodes": res_nodes, "links": res_links}


def main():
    import os

    project_dir = os.path.dirname(os.path.abspath(__file__))
    relative_path = lambda x: os.path.join(project_dir, x)

    transformed_dataset = json.load(
        open(relative_path("data/result/linked/articles_w_keywords.json"))
    )
    print("constructing network...")
    B, entity_dict, article_dict = merge_network(transformed_dataset)
    hgraph_data = nx.node_link_data(B)
    print("saving network... to data/result/network/")
    save_json(hgraph_data, relative_path("data/result/network/hgraph.json"))
    save_json(entity_dict, relative_path("data/result/network/entities.json"))
    save_json(article_dict, relative_path("data/result/network/articles.json"))
    print("transforming network for frontend...")
    network = transform_frontend(
        list(B.nodes), list(B.edges), entity_dict, article_dict
    )
    print("saving network... to data/result/server/frontend.json")
    save_json(network, relative_path("data/result/server/frontend.json"))


if __name__ == "__main__":
    main()
