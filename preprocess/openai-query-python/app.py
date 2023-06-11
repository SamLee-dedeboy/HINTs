import os

import openai
from flask import Flask, redirect, render_template, request, url_for
import json
app = Flask(__name__)

api_key = open("api_key").read()
openai.api_key = api_key


@app.route("/event_extraction", methods=(["POST"]))
def event_extraction():
    if request.method == "POST":
        messages = request.json['messages']
        response = openai.ChatCompletion.create(
            # model="text-davinci-003",
            # model="gpt-4",
            model="gpt-3.5-turbo-0301",
            messages=messages,
            temperature=0, # 0.6
            max_tokens=2048,
            stop=['{}']
        )
        print(response)
        return json.dumps(response, default=vars)

@app.route("/belief_elicitation", methods=(["POST"]))
def belief_elicitation():
    if request.method == "POST":
        messages = request.json['messages']
        response = openai.ChatCompletion.create(
            # model="text-davinci-003",
            # model="gpt-4",
            model="gpt-3.5-turbo-0301",
            messages=messages,
            temperature=0, # 0.6
            max_tokens=2048,
            stop=['{}']
        )
        print(response)
        return json.dumps(response, default=vars)


