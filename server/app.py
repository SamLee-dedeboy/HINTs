import json
from flask import Flask, request
from flask_cors import CORS
import requests
import json
from datetime import datetime
from pprint import pprint
from DataUtils import EventHGraph, DataTransformer, Utils, EmbeddingSearch

from collections import defaultdict
import sys
import os

app = Flask(__name__)
CORS(app)
openai_api_key = open("openai_api_key").read()

event_hgraph = EventHGraph(r'../preprocess/data/result/')
embedding_searcher = EmbeddingSearch(r'../preprocess/data/result/', openai_api_key)
data_transformer = DataTransformer()
example = json.load(open(r'../preprocess/data/result/AllTheNews/cluster_summary/example.json'))
# communities = event_hgraph.apply_filters(['L-0-4'], test=True)

# @app.route("/data/communities", methods=["GET"])
# def get_communities():
#     return json.dumps(event_hgraph.communities)
@app.route("/data/search", methods=["POST"])
def search():
    query = request.json['query']
    docs = embedding_searcher.search(query=query)
    # res = { doc_id: relatedness for doc_id, relatedness in docs }
    return json.dumps(docs)
    
@app.route("/data/hierarchy", methods=["GET"])
def get_hierarcy():
    return json.dumps(event_hgraph.hierarchy)

@app.route("/data/partition", methods=["POST"])
def get_partition():
    level = request.json['level']
    entity_node_num = request.json['entity_node_num']
    # get candidate entity nodes
    candidate_entity_nodes = event_hgraph.entity_nodes_sorted[:entity_node_num]

    # get clusters
    clusters = event_hgraph.binPartitions(level)
    sub_clusters = event_hgraph.binPartitions(level - 1) if int(level) > 0 else None

    # add cluster label to hyperedge nodes
    hyperedge_node_dict = Utils.addClusterLabel(event_hgraph.hyperedge_dict, clusters, sub_clusters)

    # generate cluster order
    cluster_order = Utils.generateClusterOrder(event_hgraph.hyperedge_nodes)
    update_cluster_order = Utils.generateUpdateClusterOrder(cluster_order, clusters.keys(), top_level=True)
    # add cluster order to hyperedge nodes
    hyperedge_node_dict = Utils.addClusterOrder(clusters, cluster_order, update_cluster_order, hyperedge_node_dict)

    # return result
    hgraph = {
        "hyperedge_nodes": data_transformer.transform_hyperedge(hyperedge_node_dict.values()),
        # "entity_nodes": event_hgraph.entity_nodes,
        # "argument_nodes": event_hgraph.argument_nodes,
        # "candidate_entity_nodes": candidate_entity_nodes,
        # "links": event_hgraph.filter_links(event_hgraph.hyperedge_nodes + candidate_entity_nodes, event_hgraph.links),
        "clusters": clusters,
        "num_sub_clusters": event_hgraph.getSubClusterNumDict(clusters.keys()),
        "cluster_order": cluster_order,
        "update_cluster_order": update_cluster_order,   
    }
    return json.dumps(hgraph, default=vars)

@app.route("/data/expand_cluster", methods=["POST"])
def expand_cluster():
    # retain original setups
    cluster_label = request.json['cluster_label']
    clusters = request.json['clusters']
    sub_clusters = event_hgraph.getSubClusters(clusters.keys(), isList=True)
    # cluster_level = int(cluster_label.split('-')[1])
    # clusters = event_hgraph.binPartitions(cluster_level)
    # sub_clusters = event_hgraph.binPartitions(cluster_level - 1)
    ###############
    # expand cluster
    # generate sub clusters of targeted cluster
    targeted_sub_clusters = event_hgraph.getSubClusters(cluster_label)
        # targeted_sub_cluster_labels = event_hgraph.getSubClusterLabels(cluster_label)
        # targeted_sub_clusters = {sub_cluster_label: sub_clusters[sub_cluster_label] for sub_cluster_label in targeted_sub_cluster_labels}
    # replace the targeted cluster with targeted_sub_clusters
    del clusters[cluster_label]
    for targeted_sub_cluster_label, targeted_sub_cluster_node_ids in targeted_sub_clusters.items():
        clusters[targeted_sub_cluster_label] = targeted_sub_cluster_node_ids
    # generate sub-clusters of sub_clusters
    # sub_cluster_level = cluster_level - 1
    # sub_sub_clusters_all = event_hgraph.binPartitions(sub_cluster_level - 1) if int(sub_cluster_level) > 0 else None
    # filter out targeted sub-sub-clusters
    targeted_sub_sub_clusters = event_hgraph.getSubClusters(targeted_sub_clusters.keys(), isList=True)
        # targeted_sub_sub_clusters = {sub_sub_cluster_label: sub_sub_clusters_all[sub_sub_cluster_label] for sub_sub_cluster_label in targeted_sub_sub_cluster_labels}
    # replace the sub-clusters of targeted cluster with its sub-sub-clusters
    for targeted_sub_cluster_key in targeted_sub_clusters.keys():
        del sub_clusters[targeted_sub_cluster_key]
    for sub_sub_cluster_label, sub_sub_cluster_node_ids in targeted_sub_sub_clusters.items():
        sub_clusters[sub_sub_cluster_label] = sub_sub_cluster_node_ids
    ###############
    ###############
    # post-process
    # add cluster label to hyperedge nodes
    hyperedge_node_dict = Utils.addClusterLabel(event_hgraph.hyperedge_dict, clusters, sub_clusters)

    # generate cluster order
    cluster_order = Utils.generateClusterOrder(event_hgraph.hyperedge_nodes)
    update_cluster_order = Utils.generateUpdateClusterOrder(cluster_order, targeted_sub_clusters.keys())
    # add cluster order to hyperedge nodes
    hyperedge_node_dict = Utils.addClusterOrder(clusters, cluster_order, update_cluster_order, hyperedge_node_dict)

    # return result
    hgraph = {
        "hyperedge_nodes": data_transformer.transform_hyperedge(hyperedge_node_dict.values()),
        # "entity_nodes": event_hgraph.entity_nodes,
        # "argument_nodes": event_hgraph.argument_nodes,
        # "candidate_entity_nodes": candidate_entity_nodes,
        # "links": event_hgraph.filter_links(event_hgraph.hyperedge_nodes + candidate_entity_nodes, event_hgraph.links),
        "clusters": clusters,
        "num_sub_clusters": event_hgraph.getSubClusterNumDict(clusters.keys()),
        "cluster_order": cluster_order,
        "update_cluster_order": update_cluster_order,   
    }
    return json.dumps(hgraph, default=vars)


@app.route("/data/cluster", methods=["POST"])
def get_cluster():
    level = request.json['level']
    cluster_label = request.json['cluster_label']
    print(level, cluster_label)
    hyperedge_nodes, \
    entity_nodes, \
    argument_nodes, \
    candidate_entity_nodes, \
    links, \
    connected_clusters = event_hgraph.getClusterDetail(level, cluster_label)

    cluster = {
        "hyperedge_nodes": data_transformer.transform_hyperedge(hyperedge_nodes),
        # "entity_nodes": entity_nodes,
        # "argument_nodes": argument_nodes,
        "candidate_entity_nodes": candidate_entity_nodes,
        "links": links,
        # "connected_clusters": connected_clusters,
    }
    return json.dumps(cluster, default=vars)


@app.route("/data/event_hgraph", methods=["POST"])
def get_event_network_filtered():
    hierarchies = request.json
    hgraph = event_hgraph.apply_filters(hierarchies, test=True)
    return json.dumps(hgraph, default=vars)
    
@app.route("/topic", methods=["POST"])
def generate_topic():
    hyperedge_ids = request.json
    messages = generate_summary_message(hyperedge_ids, event_hgraph.hyperedge_dict)
    example_summaries = example['summaries']
    example_topic = example['topic']
    topic = explain_articles(hyperedge_ids, event_hgraph.hyperedge_dict, example_summaries, example_topic)
    return json.dumps(topic, default=vars)

def generate_summary_message(target_hyperedges, hyperedges):
    summaries = [hyperedges[hyperedge_id]['summary'] for hyperedge_id in target_hyperedges]
    summaries_message = ""
    for index, summary in enumerate(summaries):
        summaries_message += "Article {}: \n".format(index+1)
        summaries_message += summary + '\n\n\n'
    return summaries_message

def explain_articles(target_hyperedge_ids, hyperedges_dict, example_summaries, example_noun_phrase):
    summaries = [hyperedges_dict[hyperedge_id]['summary'] for hyperedge_id in target_hyperedge_ids]
    summaries_message = ""
    for index, summary in enumerate(summaries):
        summaries_message += "Article {}: \n".format(index+1)
        summaries_message += summary + '\n\n\n'
    messages = [
        { 
            "role": "system", 
            "content": """
                You are a news article summarization system. 
                The user will provide you with a set of summarized news articles, your job is to further summarize them into one noun phrase.
                Use words that are already in the articles, and try to use as few words as possible.
            """
        },
        { "role": "system", "name": "example_user", "content": example_summaries},
        { "role": "system", "name": "example_system", "content": example_noun_phrase},
        { "role": "user", "content": summaries_message}
    ]
    topic = request_chatgpt_gpt4(messages)
    return topic


# @app.route("/data/event_hgraph", methods=["POST"])
# def get_event_network():
#     filters = request.json
#     # filtered_nodes, filtered_links, enabled_communities = event_hgraph.apply_filters(filters)
#     # hgraph = {
#     #     "nodes": filtered_nodes,
#     #     "links": filtered_links,
#     #     "communities": enabled_communities
#     # }
#     hgraph = {
#         "nodes": event_hgraph.nodes,
#         "links": event_hgraph.links,
#         "communities": event_hgraph.ravasz_partitions[1]
#     }
#     return json.dumps(hgraph, default=vars)
def request_chatgpt_gpt4(messages):
    url = "http://127.0.0.1:5000/event_hgraph"
    body = {"messages": messages}
    response = requests.post(url, json=body).json()
    gpt_response = response['choices'][0]['message']['content'].strip()
    return gpt_response