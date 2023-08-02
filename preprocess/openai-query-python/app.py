import os

import openai
import tiktoken
from flask import Flask, redirect, render_template, request, url_for
import json
app = Flask(__name__)

api_key = open("api_key").read()
openai.api_key = api_key


@app.route("/citation_event_hgraph", methods=(["POST"]))
def citation_events():
    return request_gpt3_5()

@app.route("/event_hgraph", methods=(["POST"]))
def event_extraction():
    return request_gpt3_5()

def request_gpt3_5():
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
                max_tokens=4096,
                stop=['{}']
            )
        else:
            response = openai.ChatCompletion.create(
                # model="text-davinci-003",
                # model="gpt-4",
                model="gpt-3.5-turbo-16k-0613",
                messages=messages,
            )
            # except openai.InvalidRequestError:
            #     # enc = tiktoken.encoding_for_model("gpt-3.5-turbo-0613")
            #     # enc.encode(messages)
            #     # if len(messages) > 2048:

            #     # messages = trim_messages(messages)
            #     response = openai.Completion.create(
            #         model="gpt-3.5-turbo-0613",
            #         messages=messages,
            #         temperature=0, # 0.6
            #         max_tokens=4096,
            #         stop=['{}']
            #     )
        print(response)
        return json.dumps(response, default=vars)



def trim_messages(messages):
    # Check if the total_tokens exceeds the limit
    if messages > 4096:
        # Calculate the number of tokens to discard
        tokens_to_discard = total_tokens - 4096

        # Get the generated text and discard the exceeding tokens
        generated_text = response['choices'][0]['text']
        trimmed_text = generated_text[:len(generated_text) - tokens_to_discard]
        
        # Use the trimmed text for further processing
        print(trimmed_text)
    else:
        # No token limit exceeded, use the generated text as is
        generated_text = response['choices'][0]['text']
        print(generated_text)