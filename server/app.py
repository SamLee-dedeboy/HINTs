import json
from flask import Flask, request
from flask_cors import CORS
import json
from datetime import datetime
from pprint import pprint
from EventHGraph import EventHGraph

app = Flask(__name__)
CORS(app)

event_hgraph =  EventHGraph(r'../preprocess/data/result/')
communities = event_hgraph.apply_filters(['L-0-4'], test=True)

@app.route("/data/communities", methods=["GET"])
def get_communities():
    return json.dumps(event_hgraph.communities)

@app.route("/data/hierarchy", methods=["GET"])
def get_hierarcy():
    return json.dumps(event_hgraph.hierarchy)

@app.route("/data/test/event_hgraph", methods=["POST"])
def get_event_network_filtered():
    hierarchies = request.json
    communities = event_hgraph.apply_filters(hierarchies, test=True)
    return json.dumps(communities, default=vars)

@app.route("/data/event_hgraph", methods=["POST"])
def get_event_network():
    filters = request.json
    # filtered_nodes, filtered_links, enabled_communities = event_hgraph.apply_filters(filters)
    # hgraph = {
    #     "nodes": filtered_nodes,
    #     "links": filtered_links,
    #     "communities": enabled_communities
    # }
    hgraph = {
        "nodes": event_hgraph.nodes,
        "links": event_hgraph.links,
        "communities": event_hgraph.ravasz_partitions[1]
    }
    return json.dumps(hgraph, default=vars)