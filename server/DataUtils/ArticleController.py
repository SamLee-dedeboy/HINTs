import openai
import json
import numpy as np
from numpy.linalg import norm
from scipy import spatial
import requests
from openai import OpenAI

class ArticleController:
    def __init__(self, data_path, api_key) -> None:
        self.client = OpenAI(api_key=api_key, timeout=10)
        self.api_key = api_key
        self.embeddings_db = json.load(open(data_path + 'article_embeddings.json'))
        self.article_entity_dict = {}
        try:
            self.article_entity_dict = json.load(open(data_path + 'article_participant_spans.json'))
        except:
            self.article_entity_dict = {}
        if isinstance(self.embeddings_db, dict):
            self.embeddings_db = list(self.embeddings_db.values())
        content_lengths = [len(article['content'].split()) for article in self.embeddings_db]
        avg_content_length = np.mean(content_lengths)
        print(f"Average content length: {avg_content_length:.2f} words")
    # search function
    def search(
        self,
        query: str,
        base: list[str] = None,
        hyde: bool = False,
        relatedness_fn=lambda x, y: 1 - spatial.distance.cosine(x, y),
    ) -> tuple[list[str], list[float]]:
        """Returns a list of strings and relatednesses, sorted from most related to least."""
        if hyde:
            messages = [
                {
                    'role': "system",
                    "content": "You are a research assistant. You help a phd student answer research-related questions."
                },
                {
                    'role': "user",
                    "content": query
                }
            ]
            success = False
            while not success:
                try:
                    hyde_response = self.request_gpt4(messages)
                    success = True
                except:
                    continue
            query = hyde_response
            print(query)
        url = 'https://api.openai.com/v1/embeddings'
        headers = {
            'Content-Type': 'application/json',
            'Authorization': "Bearer {}".format(self.api_key)
        }
        data = {
            "input": query,
            "model": "text-embedding-ada-002"
        }
        res = requests.post(url, headers=headers, json=data)
        res = res.json()
        query_embedding = res["data"][0]["embedding"]

        if base is None:
            search_base = self.embeddings_db
        else:
            search_base = [doc for doc in self.embeddings_db if doc['doc_id'] in base]

        strings_and_relatednesses = [
            (doc_data["doc_id"], doc_data["title"], relatedness_fn(query_embedding, doc_data["embedding"]), doc_data['summary'])
            for doc_data in search_base
        ]
        strings_and_relatednesses.sort(key=lambda x: x[1], reverse=True)
        return strings_and_relatednesses

    def searchByID(self, query_ids: list[str], includeContent: bool = False):
        summaries = [
            {
                'id': doc['doc_id'],
                'title': doc['title'],
                'summary': doc['summary'],
                'content': doc['content'] if includeContent else None,
                'entity_spans': cleanSpans(self.article_entity_dict[doc['doc_id']]) if doc['doc_id'] in self.article_entity_dict else []
            }
            for doc in self.embeddings_db if str(doc['doc_id']) in query_ids
        ]
        return summaries

    def request_gpt4(self, messages):
        response = self.client.chat.completions.create(
            # model="gpt-4-1106-preview",
            model="gpt-3.5-turbo",
            messages=messages,
        )
        return response.choices[0].message.content

def cleanSpans(entities):
    all_spans = flatten([entity['spans'] for entity in entities])
    all_spans.sort(key=lambda x: x[0])
    cleaned_spans = []
    current_max_end = float('-inf')  # Initialize with negative infinity

    for span in all_spans:
        start, end, _ = span
        # If the span is not contained within the current range
        if start > current_max_end:
            cleaned_spans.append(span)
            current_max_end = end
        # If the span is contained, skip it
    return cleaned_spans

def flatten(l):
    return [item for sublist in l for item in sublist]
