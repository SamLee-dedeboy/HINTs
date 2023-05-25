import json
from flask import Flask, request
from flask_cors import CORS
import json
from datetime import datetime
from pprint import pprint
import EventNetwork

app = Flask(__name__)
CORS(app)

event_network =  EventNetwork(r'../preprocess/data/result/event_hgraph/')
@app.route("/data/event_network")
def get_event_network():
    graph = {
        "nodes": event_network.nodes,
        "links": event_network.links,
    }
    return json.dumps(graph, default=vars)