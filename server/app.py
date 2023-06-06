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
@app.route("/data/communities", methods=["GET"])
def get_communities():
    return json.dumps(event_hgraph.communities)

@app.route("/data/event_hgraph", methods=["POST"])
def get_event_network():
    filters = request.json
    filtered_nodes, filtered_links, enabled_communities = event_hgraph.apply_filters(filters)
    hgraph = {
        "nodes": filtered_nodes,
        "links": filtered_links,
        "communities": enabled_communities
    }
    return json.dumps(hgraph, default=vars)