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
        print(messages)
        if 'functions' in request.json:
            functions = request.json['functions']
            response = openai.ChatCompletion.create(
                # model="text-davinci-003",
                # model="gpt-4",
                model="gpt-3.5-turbo-0613",
                messages=messages,
                functions=functions,
                temperature=0, # 0.6
                max_tokens=2048,
                stop=['{}']
            )
        else:
            response = openai.ChatCompletion.create(
                # model="text-davinci-003",
                # model="gpt-4",
                model="gpt-3.5-turbo-0613",
                messages=messages,
                temperature=0, # 0.6
                max_tokens=2048,
                stop=['{}']
            )
        print(response)
        return json.dumps(response, default=vars)
