import json
from flask import Flask, request
from flask_cors import CORS
import json
from datetime import datetime
from pprint import pprint

app = Flask(__name__)
CORS(app)

@app.route("/data/event_network")
def get_event_network():
    graph = {
        "nodes": data_manager.event_network.nodes,
        "links": data_manager.event_network.links,
    }
    return json.dumps(graph, default=vars)