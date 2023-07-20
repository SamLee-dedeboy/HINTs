import json
from flask import Flask, request
from flask_cors import CORS
import requests
import json
from datetime import datetime
from pprint import pprint
from EventHGraph import EventHGraph
import sys
import os

app = Flask(__name__)
CORS(app)

event_hgraph =  EventHGraph(r'../preprocess/data/result/')
example = json.load(open(r'../preprocess/data/result/AllTheNews/cluster_summary/example.json'))
# communities = event_hgraph.apply_filters(['L-0-4'], test=True)

# @app.route("/data/communities", methods=["GET"])
# def get_communities():
#     return json.dumps(event_hgraph.communities)
@app.route("/data/hierarchy", methods=["GET"])
def get_hierarcy():
    return json.dumps(event_hgraph.hierarchy)

@app.route("/data/partition", methods=["POST"])
def get_partition():
    level = request.json
    hgraph = {
        "nodes": event_hgraph.hyperedge_nodes,
        # "links": event_hgraph.links,
        "partition": event_hgraph.binPartitions(level)
    }
    return json.dumps(hgraph, default=vars)

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