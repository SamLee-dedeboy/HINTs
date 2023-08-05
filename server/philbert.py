from flask import Flask, request
import json
from flask_cors import CORS
from DataUtils import GraphController, EventHGraph, DataTransformer, Utils, EmbeddingSearch, GptUtils, pHilbert

app = Flask(__name__)
CORS(app)

@app.route("/static/p_hilbert/", methods=["POST"])
def peripheral_hilbert():
    width = request.json['width']
    height = request.json['height']
    p_hilbert = pHilbert.peripheral_hilbert(width, height)
    return json.dumps(p_hilbert)
