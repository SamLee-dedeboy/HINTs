import os

import openai
from flask import Flask, redirect, render_template, request, url_for
import json
app = Flask(__name__)

api_key = open("api_key").read()
openai.api_key = api_key


@app.route("/event_extraction", methods=(["POST"]))
def original():
    if request.method == "POST":
        prompt = request.json['prompt']
        response = openai.Completion.create(
            model="text-davinci-003",
            prompt=prompt,
            temperature=0, # 0.6
            max_tokens=2048,
            stop=['{}']
        )
        print(response)
        return json.dumps(response, default=vars)

