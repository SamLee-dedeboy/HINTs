from flask import Flask, request
from flask_cors import CORS
import json
from openai import OpenAI
from DataUtils import GraphController, DataTransformer, Utils, ArticleController, pHilbert, gosper
import tiktoken
import os
project_dir = os.path.dirname(os.path.abspath(__file__))
relative_path = lambda x: os.path.join(project_dir, x)

openai_api_key = open(relative_path("openai_api_key")).read()
client=OpenAI(api_key=openai_api_key, timeout=30)

app = Flask(__name__)
CORS(app)
# 
# dataset, article_level, entity_level = 'AllTheNews', 5, 5
dataset, article_level, entity_level = 'VisPub', 4, 4
# graph_controller = GraphController(relative_path("../reproduce/VisPub/data/result/server/"))
graph_controller = GraphController(relative_path("data/{}/".format(dataset)))
event_hgraph = graph_controller.static_event_hgraph
# article_controller = ArticleController(relative_path('../reproduce/VisPub/data/result/server/'.format(dataset)), openai_api_key)
article_controller = ArticleController(relative_path('data/{}/'.format(dataset)), openai_api_key)
data_transformer = DataTransformer()

# global vars
users = [0]
for uid in users:
    graph_controller.create_user_hgraph(uid)
user_hgraph = graph_controller.getUserHGraph(0)
# article_level = user_hgraph.get_highest_level('article')
# entity_level = user_hgraph.get_highest_level('entity')
print("article level: ", article_level)
print("entity level: ", entity_level)

# gosper_curve_points, gosper_point_to_distance = gosper.plot_level(article_level)
# philbert_curve_points, philbert_point_to_distance = pHilbert.peripheral_hilbert(128, 20)
print("init done")

@app.route("/user/hgraph/", methods=["POST"])
def get_article_partition():
    gosper_curve_points = request.json['gosper_curve_points']
    philbert_curve_points = request.json['philbert_curve_points']
    uid = 0
    # get candidate entity nodes
    user_hgraph = graph_controller.getUserHGraph(uid)
    # article_level = user_hgraph.get_highest_level('article')
    # entity_level = user_hgraph.get_highest_level('entity')
    ### article
    # clusters and sub clusters
    clusters = user_hgraph.binPartitions(article_level, cluster_type='article')
    clusters = user_hgraph.adjustClusterLevel(clusters, cluster_type='article')
    sub_clusters, cluster_children_dict = user_hgraph.getSubClusters(clusters.keys(), cluster_type='article', isList=True)
    # sub_clusters = user_hgraph.binPartitions(article_level - 1, cluster_type="article") if int(article_level) > 0 else None

    # generate cluster labels and orders
    clusters, article_node_dict, cluster_order, update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.article_dict, clusters, sub_clusters, gosper_curve_points, curve_type='gosper')    

    ### entity
    # clusters and sub clusters
    entity_clusters = user_hgraph.binPartitions(entity_level, cluster_type='entity')
    entity_clusters = user_hgraph.adjustClusterLevel(entity_clusters, cluster_type='entity')
    entity_sub_clusters, entity_cluster_children_dict = user_hgraph.getSubClusters(entity_clusters.keys(), cluster_type='entity', isList=True)
    # entity_sub_clusters = user_hgraph.binPartitions(entity_level - 1, cluster_type="entity") if int(entity_level) > 0 else None

    # generate cluster labels and orders
    entity_clusters, entity_node_dict, entity_cluster_order, entity_update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.entity_dict, entity_clusters, entity_sub_clusters, philbert_curve_points, curve_type="gilbert")

    # link entities to article clusters
    # article_cluster_links = Utils.getArticleClusterLinks(user_hgraph.entity_links, entity_node_dict, article_node_dict)
    cluster_entity_inner_links = Utils.getClusterEntityInnerLinks(article_node_dict)

    # return result
    hgraph = {
        "article_graph": {
            "article_nodes": data_transformer.transform_article_data(article_node_dict.values()),
            "clusters": clusters,
            "cluster_children": cluster_children_dict,
            "sub_clusters": sub_clusters,
            "cluster_order": cluster_order,
            "update_cluster_order": update_cluster_order,   
            "hierarchical_topics": user_hgraph.article_hierarchical_topics,
            "cluster_entity_inner_links": cluster_entity_inner_links,
        },
        "entity_graph": {
            "entity_nodes": data_transformer.transform_entity_data(entity_node_dict.values()),
            "entity_clusters":  entity_clusters,
            "entity_cluster_children": entity_cluster_children_dict,
            "entity_sub_clusters": entity_sub_clusters,
            "entity_cluster_order": entity_cluster_order,
            "entity_update_cluster_order": entity_update_cluster_order,
            "entity_hierarchical_topics": user_hgraph.entity_hierarchical_topics,
        },
        "user_hgraph": user_hgraph.save_states()
    }
    return json.dumps(hgraph, default=vars)

@app.route("/user/filter/", methods=["POST"])
def filter_hgraph():
    # uid = int(uid)
    article_node_ids = request.json['article_ids']
    clusters = request.json['clusters']
    entity_clusters = request.json['entity_clusters']
    gosper_curve_points = request.json['gosper_curve_points']
    philbert_curve_points = request.json['philbert_curve_points']
    user_hgraph = graph_controller.load_user_hgraph(request.json['user_hgraph'])
    # user_hgraph = graph_controller.getUserHGraph(uid)

    # article
    # filter clusters
    clusters = Utils.filterClusters(clusters, article_node_ids)
    clusters = user_hgraph.adjustClusterLevel(clusters, cluster_type='article')
    # filter sub clusters
    sub_clusters, cluster_children_dict = user_hgraph.getSubClusters(clusters.keys(), cluster_type='article', isList=True)
    sub_clusters = Utils.filterClusters(sub_clusters, article_node_ids)
    cluster_children_dict = Utils.filterClusterChildren(cluster_children_dict, sub_clusters)

    # filter article and entity nodes and links at the same time
    # this changes the state of the user hgraph
    user_hgraph.filter_article_nodes(article_node_ids)
    clusters, article_node_dict, cluster_order, update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.article_dict, clusters, sub_clusters, gosper_curve_points)    

    # entity
    entity_node_ids = [node['id'] for node in user_hgraph.entity_nodes]
    # filter clusters
    entity_clusters = Utils.filterClusters(entity_clusters, entity_node_ids)
    # entity_clusters = user_hgraph.adjustClusterLevel(entity_clusters, cluster_type='entity')
    # filter sub clusters
    entity_sub_clusters, entity_cluster_children_dict = user_hgraph.getSubClusters(entity_clusters.keys(), cluster_type='entity', isList=True)
    entity_sub_clusters = Utils.filterClusters(entity_sub_clusters, entity_node_ids)
    entity_cluster_children_dict = Utils.filterClusterChildren(entity_cluster_children_dict, entity_sub_clusters)

    entity_clusters, entity_node_dict, entity_cluster_order, entity_update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.entity_dict, entity_clusters, entity_sub_clusters, philbert_curve_points)

    # article_cluster_links = Utils.getArticleClusterLinks(user_hgraph.entity_links, entity_node_dict, article_node_dict)
    cluster_entity_inner_links = Utils.getClusterEntityInnerLinks(article_node_dict)

    # return result
    hgraph = {
        "article_graph": {
            "article_nodes": data_transformer.transform_article_data(article_node_dict.values()),
            "clusters": clusters,
            "cluster_children": cluster_children_dict,
            "sub_clusters": sub_clusters,
            "cluster_order": cluster_order,
            "update_cluster_order": update_cluster_order,   
            "hierarchical_topics": user_hgraph.article_hierarchical_topics,
            # "article_cluster_links": article_cluster_links,
            "cluster_entity_inner_links": cluster_entity_inner_links,
            "filtered": True,
        },
        "entity_graph": {
            "entity_nodes": data_transformer.transform_entity_data(entity_node_dict.values()),
            "entity_clusters":  entity_clusters,
            "entity_cluster_children": entity_cluster_children_dict,
            "entity_sub_clusters": entity_sub_clusters,
            "entity_cluster_order": entity_cluster_order,
            "entity_update_cluster_order": entity_update_cluster_order,
            "entity_hierarchical_topics": user_hgraph.entity_hierarchical_topics,
            "filtered": True,
        },
        "user_hgraph": user_hgraph.save_states()
    }
    return json.dumps(hgraph, default=vars)

@app.route("/user/expand_cluster/article/", methods=["POST"])
def expand_article_cluster():
    def check_clusters(clusters, correct_volume):
        check = 0
        for nodes in clusters.values():
            check += len(nodes)
        print(check == correct_volume)
    # uid = int(uid)
    # retain original setups
    cluster_label = request.json['cluster_label']
    clusters = request.json['clusters']
    gosper_curve_points = request.json['gosper_curve_points']
    philbert_curve_points = request.json['philbert_curve_points']
    print("loading user hgraph")
    user_hgraph = graph_controller.load_user_hgraph(request.json['user_hgraph'])
    print("loading done")
    article_node_ids = list(map(lambda node: node['id'], user_hgraph.article_nodes)) 
    check_clusters(clusters, len(article_node_ids))
    # user_hgraph = graph_controller.getUserHGraph(uid)
    sub_clusters, cluster_children_dict = user_hgraph.getSubClusters(clusters.keys(), cluster_type='article', isList=True)
    sub_clusters = Utils.filterClusters(sub_clusters, article_node_ids)
    cluster_children_dict = Utils.filterClusterChildren(cluster_children_dict, sub_clusters)
    check_clusters(sub_clusters, len(article_node_ids))
    ###############
    # expand cluster
    # generate sub clusters of targeted cluster
    targeted_sub_clusters, _ = user_hgraph.getSubClusters(cluster_label, cluster_type='article')
    targeted_sub_clusters = Utils.filterClusters(targeted_sub_clusters, article_node_ids)
    # replace the targeted cluster with targeted_sub_clusters
    del clusters[cluster_label]
    del cluster_children_dict[cluster_label]
    for targeted_sub_cluster_label, targeted_sub_cluster_node_ids in targeted_sub_clusters.items():
        clusters[targeted_sub_cluster_label] = targeted_sub_cluster_node_ids
    check_clusters(clusters, len(article_node_ids))
    # generate sub-clusters of sub_clusters
    # filter out targeted sub-sub-clusters
    targeted_sub_sub_clusters, targeted_sub_cluster_children_dict = user_hgraph.getSubClusters(targeted_sub_clusters.keys(), cluster_type='article', isList=True)
    targeted_sub_sub_clusters = Utils.filterClusters(targeted_sub_sub_clusters, article_node_ids)
    targeted_sub_cluster_children_dict = Utils.filterClusterChildren(targeted_sub_cluster_children_dict, targeted_sub_sub_clusters)
    for sub_cluster_label, children_labels in targeted_sub_cluster_children_dict.items():
        cluster_children_dict[sub_cluster_label] = children_labels
    # replace the sub-clusters of targeted cluster with its sub-sub-clusters
    for targeted_sub_cluster_key in targeted_sub_clusters.keys():
        del sub_clusters[targeted_sub_cluster_key]
    for sub_sub_cluster_label, sub_sub_cluster_node_ids in targeted_sub_sub_clusters.items():
        sub_clusters[sub_sub_cluster_label] = sub_sub_cluster_node_ids
    print("--------- expansion done. ----------")
    check_clusters(sub_clusters, len(article_node_ids))
    ###############
    ###############
    # post-process
    expanded_cluster = {}
    expanded_cluster['parent'] = cluster_label
    expanded_cluster['sub_clusters'] = list(targeted_sub_clusters.keys())
    # article
    clusters, article_node_dict, cluster_order, update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.article_dict, clusters, sub_clusters, gosper_curve_points, expanded_cluster)
    print("--------- article nodes post-process done. ----------")

    # link entities to clusters
    cluster_entity_inner_links = Utils.getClusterEntityInnerLinks(article_node_dict)
    print("--------- Entity links extraction done. ----------")

    # return result
    article_graph = {
        "links": user_hgraph.entity_links,
        "article_nodes": data_transformer.transform_article_data(article_node_dict.values()),
        "clusters": clusters,
        "cluster_children": cluster_children_dict,
        "sub_clusters": sub_clusters,
        "cluster_order": cluster_order,
        "update_cluster_order": update_cluster_order,   
        "hierarchical_topics": user_hgraph.article_hierarchical_topics,
        "cluster_entity_inner_links": cluster_entity_inner_links,
    }
    res = {
        "article_graph": article_graph,
        "user_hgraph": user_hgraph.save_states()
    }
    return json.dumps(res, default=vars)

@app.route("/user/expand_cluster/entity/", methods=["POST"])
def expand_entity_cluster():
    # retain original setups
    cluster_label = request.json['cluster_label']
    entity_clusters = request.json['clusters']
    gosper_curve_points = request.json['gosper_curve_points']
    philbert_curve_points = request.json['philbert_curve_points']
    user_hgraph = graph_controller.load_user_hgraph(request.json['user_hgraph'])
    entity_node_ids = list(map(lambda node: node['id'], user_hgraph.entity_nodes)) 
    # user_hgraph = graph_controller.getUserHGraph(uid)
    entity_sub_clusters, entity_cluster_children_dict = user_hgraph.getSubClusters(entity_clusters.keys(), isList=True, cluster_type='entity')
    entity_sub_clusters = Utils.filterClusters(entity_sub_clusters, entity_node_ids)
    ###############
    # expand cluster
    # generate sub clusters of targeted cluster
    targeted_sub_clusters, _ = user_hgraph.getSubClusters(cluster_label, cluster_type='entity')
    targeted_sub_clusters = Utils.filterClusters(targeted_sub_clusters, entity_node_ids)
    # replace the targeted cluster with targeted_sub_clusters
    del entity_clusters[cluster_label]
    del entity_cluster_children_dict[cluster_label]
    for targeted_sub_cluster_label, targeted_sub_cluster_node_ids in targeted_sub_clusters.items():
        entity_clusters[targeted_sub_cluster_label] = targeted_sub_cluster_node_ids
    # generate sub-clusters of sub_clusters
    # filter out targeted sub-sub-clusters
    targeted_sub_sub_clusters, targeted_sub_cluster_children_dict = user_hgraph.getSubClusters(targeted_sub_clusters.keys(), isList=True, cluster_type='entity')
    targeted_sub_sub_clusters = Utils.filterClusters(targeted_sub_sub_clusters, entity_node_ids)
    for sub_cluster_label, children_labels in targeted_sub_cluster_children_dict.items():
        entity_cluster_children_dict[sub_cluster_label] = children_labels
    # replace the sub-clusters of targeted cluster with its sub-sub-clusters
    for targeted_sub_cluster_key in targeted_sub_clusters.keys():
        del entity_sub_clusters[targeted_sub_cluster_key]
    for sub_sub_cluster_label, sub_sub_cluster_node_ids in targeted_sub_sub_clusters.items():
        entity_sub_clusters[sub_sub_cluster_label] = sub_sub_cluster_node_ids
    print("--------- expansion done. ----------")
    ###############
    ###############
    # post-process
    expanded_cluster = {}
    expanded_cluster['parent'] = cluster_label
    expanded_cluster['sub_clusters'] = list(targeted_sub_clusters.keys())
    # article
    print("--------- article nodes post-process done. ----------")
    # entity
    entity_clusters, entity_node_dict, entity_cluster_order, entity_update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.entity_dict, entity_clusters, entity_sub_clusters, philbert_curve_points, expanded_cluster)
    print("--------- entity nodes post-process done. ----------")

    # link entities to clusters
    print("--------- Entity links extraction done. ----------")

    # return result
    hgraph = {
        # entities
        "entity_nodes": data_transformer.transform_entity_data(entity_node_dict.values()),
        "entity_clusters":  entity_clusters,
        "entity_cluster_children": entity_cluster_children_dict,
        "entity_sub_clusters": entity_sub_clusters,
        "entity_cluster_order": entity_cluster_order,
        "entity_update_cluster_order": entity_update_cluster_order,
        "entity_hierarchical_topics": user_hgraph.entity_hierarchical_topics,
    }
    res = {
        "entity_graph": hgraph,
        "user_hgraph": user_hgraph.save_states()
    }
    return json.dumps(res, default=vars)

# @app.route("/user/optimize_partition/<uid>", methods=["POST"])
# def optimize_partition(uid):
#     uid = int(uid)
#     # retain original setups
#     clusters = request.json['clusters']
#     target_articles = request.json['docs']
#     user_hgraph = graph_controller.getUserHGraph(uid)

#     sub_clusters, cluster_children_dict = user_hgraph.getSubClusters(clusters.keys(), isList=True, cluster_type='article')
#     ### optimization 
#     optimal_sub_clusters, optimized_cluster_children_dict = Utils.findOptimalPartition(clusters, sub_clusters, cluster_children_dict, target_articles, user_hgraph)

#     ### apply the optimized result to the user hgraph
#     clusters, \
#     article_node_dict, \
#     cluster_order, \
#     update_cluster_order = \
#         Utils.addClusterLabelAndOrder(
#             user_hgraph.article_dict, 
#             clusters, 
#             optimal_sub_clusters, gosper_curve_points
#         )
#     article_cluster_entities = Utils.getArticleClusterEntities(user_hgraph.entity_links, user_hgraph.entity_dict, article_node_dict)

    
#     article_graph = {
#         "links": user_hgraph.entity_links,
#         "article_nodes": data_transformer.transform_article_data(article_node_dict.values()),
#         "clusters": clusters,
#         "sub_clusters": optimized_cluster_children_dict,
#         "cluster_order": cluster_order,
#         "update_cluster_order": update_cluster_order,
#         "hierarchical_topics": user_hgraph.hierarchical_topics,
#         "article_cluster_linked_entities": article_cluster_entities,
#     }
#     return json.dumps(article_graph, default=vars)


@app.route("/static/p_hilbert/", methods=["POST"])
def peripheral_hilbert():
    width = request.json['width']
    height = request.json['height']
    p_hilbert, _ = pHilbert.peripheral_hilbert(width, height)
    return json.dumps(p_hilbert)

@app.route("/static/gosper/", methods=["POST"])
def gosper_curve():
    level = 5
    coords, _ = gosper.plot_level(level)
    return json.dumps(coords)


@app.route("/static/search/", methods=["POST"])
def search():
    query = request.json['query']
    base = request.json['base']
    doc_id_relevance = article_controller.search(query=query, base=base, hyde=True)
    # binary search to find the most appropriate threshold
    # suggested_threshold = GptUtils.binary_search_threshold(doc_id_relevance, query)
    suggested_threshold = 0.8

    doc_data = []
    for (doc_id, doc_title, relevance, summary) in doc_id_relevance:
        doc_data.append({
            "id": doc_id,
            "relevance": relevance,
            "summary": summary
        })
    return json.dumps({"docs": doc_data, "suggested_threshold": suggested_threshold})

@app.route("/static/articles/", methods=["POST"])
def get_articles():
    doc_ids = request.json['doc_ids']
    articles = article_controller.searchByID(doc_ids, includeContent=False)
    return json.dumps(articles, default=vars)

@app.route("/static/hierarchy", methods=["GET"])
def get_hierarcy():
    return json.dumps(event_hgraph.hierarchy_article)

# @app.route("/static/topic", methods=["POST"])
# def generate_topic():
#     article_ids = request.json
#     # messages = GptUtils.generate_summary_message(article_ids, event_hgraph.article_dict)
#     example_summaries = example['summaries']
#     example_topic = example['topic']
#     topic = GptUtils.explain_articles(article_ids, event_hgraph.article_dict, example_summaries, example_topic)
#     return json.dumps(topic, default=vars)

@app.route("/static/chat", methods=["POST"])
def chat():
    messages = request.json['query_messages']
    response = request_gpt4(messages)
    return json.dumps(response)

@app.route("/static/baseline_chat", methods=["POST"])
def baseline_chat():
    messages = request.json['query_messages']
    response = request_gpt4(messages)
    return json.dumps(response)

@app.route("/static/rag", methods=["POST"])
def rag():
    user_input = request.json['user_input']
    hyde = request.json['hyde']
    doc_id_relevance = article_controller.search(user_input, hyde=hyde)

    doc_data = []
    for (doc_id, doc_title, _, summary) in doc_id_relevance[:60]:
        doc_data.append({
            "id": doc_id,
            "title": doc_title,
            "summary": summary
        })
    return json.dumps(doc_data)

def request_gpt4(messages):
    enc = tiktoken.encoding_for_model("gpt-3.5-turbo-1106")
    text = json.dumps(messages)
    print(len(enc.encode(text)))
    while len(enc.encode(text)) > 16385:
    # while len(enc.encode(text)) > 128000:
        print("truncating...")
        # find the first user input
        for index, message in enumerate(messages):
            if message['role'] == 'user' and len(message['content']) > 1000:
                messages[index] = {
                    "role": "user",
                    "content": message['content'][:-1000]
                }
                break
        # messages = [messages[0], messages[kept_index]]
        text = json.dumps(messages)
        print(len(enc.encode(text)))
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo-1106",
            messages=messages,
        )
    except Exception as e:
        print(e)
        print("retrying...")
        return request_gpt4(messages)
    return response.choices[0].message.content
