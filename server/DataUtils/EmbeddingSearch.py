import openai
import json
import numpy as np
from numpy.linalg import norm
from scipy import spatial

class EmbeddingSearch:
    def __init__(self, data_path, api_key) -> None:
        openai.api_key = api_key
        self.embeddings_db = json.load(open(data_path + 'AllTheNews/network/server/embeddings.json'))
    # search function
    def search(
        self,
        query: str,
        base: list[str],
        relatedness_fn=lambda x, y: 1 - spatial.distance.cosine(x, y),
    ) -> tuple[list[str], list[float]]:
        """Returns a list of strings and relatednesses, sorted from most related to least."""
        query_embedding_response = openai.Embedding.create(
            model="text-embedding-ada-002",
            input=query,
        )
        search_base = [doc for doc in self.embeddings_db if doc['doc_id'] in base]
        query_embedding = query_embedding_response["data"][0]["embedding"]
        strings_and_relatednesses = [
            (doc_data["doc_id"], relatedness_fn(query_embedding, doc_data["embedding"]), doc_data['summary'])
            for doc_data in search_base
        ]
        strings_and_relatednesses.sort(key=lambda x: x[1], reverse=True)
        # strings, relatednesses = zip(*strings_and_relatednesses)
        # return strings_and_relatednesses[:top_n]
        return strings_and_relatednesses