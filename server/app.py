import json
from flask import Flask, request
from flask_cors import CORS
import json
from datetime import datetime
from pprint import pprint
from DataUtils import GraphController, EventHGraph, DataTransformer, Utils, EmbeddingSearch, GptUtils
import copy

from collections import defaultdict
import sys
import os

app = Flask(__name__)
CORS(app)
openai_api_key = open("openai_api_key").read()

graph_controller = GraphController(r'../preprocess/data/result/')
event_hgraph = graph_controller.static_event_hgraph
embedding_searcher = EmbeddingSearch(r'../preprocess/data/result/', openai_api_key)
data_transformer = DataTransformer()
example = json.load(open(r'../preprocess/data/result/AllTheNews/cluster_summary/example.json'))

users = [0]
for uid in users:
    graph_controller.create_user_hgraph(uid, hyperedge_ids=None)
# communities = event_hgraph.apply_filters(['L-0-4'], test=True)

# @app.route("/data/communities", methods=["GET"])
# def get_communities():
#     return json.dumps(event_hgraph.communities)
@app.route("/static/hierarchy", methods=["GET"])
def get_hierarcy():
    return json.dumps(event_hgraph.hierarchy)

@app.route("/static/topic", methods=["POST"])
def generate_topic():
    hyperedge_ids = request.json
    # messages = GptUtils.generate_summary_message(hyperedge_ids, event_hgraph.hyperedge_dict)
    example_summaries = example['summaries']
    example_topic = example['topic']
    topic = GptUtils.explain_articles(hyperedge_ids, event_hgraph.hyperedge_dict, example_summaries, example_topic)
    return json.dumps(topic, default=vars)

@app.route("/user/partition/<uid>", methods=["POST"])
def get_partition(uid):
    uid = int(uid)
    level = request.json['level']
    entity_node_num = request.json['entity_node_num']
    # get candidate entity nodes
    user_hgraph = graph_controller.getUserHGraph(uid)
    # reset filtering
    user_hgraph.resetFiltering()
    candidate_entity_nodes = user_hgraph.entity_nodes_sorted[:entity_node_num]

    # get clusters
    clusters = user_hgraph.binPartitions(level)
    sub_clusters = user_hgraph.binPartitions(level - 1) if int(level) > 0 else None

    # add cluster label to hyperedge nodes
    hyperedge_node_dict = Utils.addClusterLabel(user_hgraph.hyperedge_dict, clusters, sub_clusters)

    # generate cluster order
    cluster_order = Utils.generateClusterOrder(user_hgraph.hyperedge_nodes)
    update_cluster_order = Utils.generateUpdateClusterOrder(cluster_order, clusters.keys(), top_level=True)
    # add cluster order to hyperedge nodes
    hyperedge_node_dict = Utils.addClusterOrder(clusters, cluster_order, update_cluster_order, hyperedge_node_dict)

    # return result
    hgraph = {
        "hyperedge_nodes": data_transformer.transform_hyperedge(hyperedge_node_dict.values()),
        # "entity_nodes": user_hgraph.entity_nodes,
        # "argument_nodes": user_hgraph.argument_nodes,
        # "candidate_entity_nodes": candidate_entity_nodes,
        # "links": user_hgraph.filter_links(user_hgraph.hyperedge_nodes + candidate_entity_nodes, user_hgraph.links),
        "clusters": clusters,
        "num_sub_clusters": user_hgraph.getSubClusterNumDict(clusters.keys()),
        "cluster_order": cluster_order,
        "update_cluster_order": update_cluster_order,   
    }
    return json.dumps(hgraph, default=vars)

@app.route("/user/filter/<uid>", methods=["POST"])
def filter_hgraph(uid: int):
    uid = int(uid)
    hyperedge_node_ids = request.json['hyperedge_ids']
    clusters = request.json['clusters']
    user_hgraph = graph_controller.getUserHGraph(uid)
    # filter clusters
    clusters = Utils.filterClusters(clusters, hyperedge_node_ids)
    sub_clusters = user_hgraph.getSubClusters(clusters.keys(), isList=True)
    # get candidate entity nodes
    filtered_hyperedge_nodes = user_hgraph.filter_hyperedge_nodes(hyperedge_node_ids)

    filtered_hyperedge_node_dict = {node['id']: node for node in filtered_hyperedge_nodes}
    filtered_hyperedge_node_dict = Utils.addClusterLabel(filtered_hyperedge_node_dict, clusters, sub_clusters)
    sorted_filtered_hyperedge_nodes = sorted(list(filtered_hyperedge_node_dict.values()), key=lambda x: x['order'])
    # generate cluster order
    cluster_order = Utils.generateClusterOrder(sorted_filtered_hyperedge_nodes)
    update_cluster_order = Utils.generateUpdateClusterOrder(cluster_order, clusters.keys(), top_level=True)
    filtered_hyperedge_node_dict = Utils.addClusterOrder(clusters, cluster_order, update_cluster_order, filtered_hyperedge_node_dict)

    # record the filtered graph
    user_hgraph.original_hyperedge_nodes = copy.deepcopy(user_hgraph.hyperedge_nodes)
    user_hgraph.hyperedge_nodes = list(filtered_hyperedge_node_dict.values())
    user_hgraph.hyperedge_dict = filtered_hyperedge_node_dict

    # return result
    hgraph = {
        "hyperedge_nodes": data_transformer.transform_hyperedge(filtered_hyperedge_node_dict.values()),
        # "entity_nodes": user_hgraph.entity_nodes,
        # "argument_nodes": user_hgraph.argument_nodes,
        # "candidate_entity_nodes": candidate_entity_nodes,
        # "links": user_hgraph.filter_links(user_hgraph.hyperedge_nodes + candidate_entity_nodes, user_hgraph.links),
        "clusters": clusters,
        "num_sub_clusters": user_hgraph.getSubClusterNumDict(clusters.keys()),
        "cluster_order": cluster_order,
        "update_cluster_order": update_cluster_order,   
    }
    return json.dumps(hgraph, default=vars)

@app.route("/user/expand_cluster/<uid>", methods=["POST"])
def expand_cluster(uid):
    uid = int(uid)
    # retain original setups
    cluster_label = request.json['cluster_label']
    clusters = request.json['clusters']
    user_hgraph = graph_controller.getUserHGraph(uid)
    sub_clusters = user_hgraph.getSubClusters(clusters.keys(), isList=True)
    ###############
    # expand cluster
    # generate sub clusters of targeted cluster
    hyperedge_node_ids = list(map(lambda node: node['id'], user_hgraph.hyperedge_nodes)) 
    targeted_sub_clusters = user_hgraph.getSubClusters(cluster_label)
    targeted_sub_clusters = Utils.filterClusters(targeted_sub_clusters, hyperedge_node_ids)
    # replace the targeted cluster with targeted_sub_clusters
    del clusters[cluster_label]
    for targeted_sub_cluster_label, targeted_sub_cluster_node_ids in targeted_sub_clusters.items():
        clusters[targeted_sub_cluster_label] = targeted_sub_cluster_node_ids
    # generate sub-clusters of sub_clusters
    # filter out targeted sub-sub-clusters
    targeted_sub_sub_clusters = user_hgraph.getSubClusters(targeted_sub_clusters.keys(), isList=True)
    targeted_sub_sub_clusters = Utils.filterClusters(targeted_sub_sub_clusters, hyperedge_node_ids)
    # replace the sub-clusters of targeted cluster with its sub-sub-clusters
    for targeted_sub_cluster_key in targeted_sub_clusters.keys():
        del sub_clusters[targeted_sub_cluster_key]
    for sub_sub_cluster_label, sub_sub_cluster_node_ids in targeted_sub_sub_clusters.items():
        sub_clusters[sub_sub_cluster_label] = sub_sub_cluster_node_ids
    ###############
    ###############
    # post-process
    # add cluster label to hyperedge nodes
    hyperedge_node_dict = Utils.addClusterLabel(user_hgraph.hyperedge_dict, clusters, sub_clusters)

    # generate cluster order
    cluster_order = Utils.generateClusterOrder(user_hgraph.hyperedge_nodes)
    update_cluster_order = Utils.generateUpdateClusterOrder(cluster_order, targeted_sub_clusters.keys())
    # add cluster order to hyperedge nodes
    hyperedge_node_dict = Utils.addClusterOrder(clusters, cluster_order, update_cluster_order, hyperedge_node_dict)

    # return result
    hgraph = {
        "hyperedge_nodes": data_transformer.transform_hyperedge(hyperedge_node_dict.values()),
        # "entity_nodes": user_hgraph.entity_nodes,
        # "argument_nodes": user_hgraph.argument_nodes,
        # "candidate_entity_nodes": candidate_entity_nodes,
        # "links": user_hgraph.filter_links(user_hgraph.hyperedge_nodes + candidate_entity_nodes, user_hgraph.links),
        "clusters": clusters,
        "num_sub_clusters": user_hgraph.getSubClusterNumDict(clusters.keys()),
        "cluster_order": cluster_order,
        "update_cluster_order": update_cluster_order,   
    }
    return json.dumps(hgraph, default=vars)

@app.route("/static/search/", methods=["POST"])
def search():
    query = request.json['query']
    doc_id_relevance = embedding_searcher.search(query=query)
    # binary search to find the most appropriate threshold
    # suggested_threshold = GptUtils.binary_search_threshold(doc_id_relevance, query)
    suggested_threshold = 0.8

    doc_data = []
    for (doc_id, relevance, summary) in doc_id_relevance:
        doc_data.append({
            "doc_id": doc_id,
            "relevance": relevance,
            "summary": summary
        })

    # res = { doc_id: relatedness for doc_id, relatedness in docs }
    return json.dumps({"docs": doc_data, "suggested_threshold": suggested_threshold})
    

# @app.route("/data/cluster", methods=["POST"])
# def get_cluster():
#     level = request.json['level']
#     cluster_label = request.json['cluster_label']
#     print(level, cluster_label)
#     hyperedge_nodes, \
#     entity_nodes, \
#     argument_nodes, \
#     candidate_entity_nodes, \
#     links, \
#     connected_clusters = event_hgraph.getClusterDetail(level, cluster_label)

#     cluster = {
#         "hyperedge_nodes": data_transformer.transform_hyperedge(hyperedge_nodes),
#         # "entity_nodes": entity_nodes,
#         # "argument_nodes": argument_nodes,
#         "candidate_entity_nodes": candidate_entity_nodes,
#         "links": links,
#         # "connected_clusters": connected_clusters,
#     }
#     return json.dumps(cluster, default=vars)
