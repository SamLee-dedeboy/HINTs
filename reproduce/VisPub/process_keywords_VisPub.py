
from openai import OpenAI, RateLimitError, APITimeoutError
import json
from json import JSONDecodeError
from pprint import pprint
import tiktoken
from scipy.spatial import distance
from scipy.cluster.hierarchy import linkage, fcluster
from scipy import spatial
import numpy as np
import argparse
import time
import concurrent
from tqdm import tqdm

def distance_matrix(embeddings):
    return np.array(spatial.distance.cdist(embeddings, embeddings, metric='cosine'))

def save_json(data, filepath=r'new_data.json'):
    with open(filepath, 'w', encoding='utf-8') as fp:
        json.dump(data, fp, indent=4, ensure_ascii=False)

def multithread_prompts(client, prompts, model="gpt-3.5-turbo-0125", format=None):
    l = len(prompts)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=100)
        futures = [executor.submit(request_gpt, client, prompt, model, format) for prompt in prompts]
        for _ in concurrent.futures.as_completed(futures):
            pbar.update(1)
    concurrent.futures.wait(futures)
    return [future.result() for future in futures]

def multithread_embeddings(client, texts):
    l = len(texts)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=100)
        futures = [executor.submit(get_embedding, client, text) for text in texts]
        for _ in concurrent.futures.as_completed(futures):
            pbar.update(1)
    concurrent.futures.wait(futures)
    return [future.result() for future in futures]


def request_gpt(client, messages, model="gpt-3.5-turbo-0125", format=None):
    try:
        if format == "json":
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.5,
                response_format={ "type": "json_object" }
            )
            return json.loads(response.choices[0].message.content)
        else:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.5,
            )
            return response.choices[0].message.content
    except JSONDecodeError as e:
        print(e)
        time.sleep(5)
        return request_gpt(client, messages, model, format)
    except RateLimitError as e:
        print(e)
        time.sleep(5)
        return request_gpt(client, messages, model, format)
    except APITimeoutError as e:
        print(e)
        time.sleep(5)
        return request_gpt(client, messages, model, format)

def get_embedding(client, text, model="text-embedding-ada-002"):
    enc = tiktoken.encoding_for_model(model)
    while len(enc.encode(text)) > 8191:
        text = text[:-100]
    return client.embeddings.create(input = [text], model=model).data[0].embedding

def explain_keyword_prompts(keyword):
    messages = [
        { 
            'role': 'system',
            'content': 'You are a visualization research assistant. You explain visualization research-related keywords to a first-year phd student. Reply with a paragraph with no more than 100 words.'
        },
        {
            'role': 'user',
            "content": 'What does {} mean?'.format(keyword)
        }
    ]
    return messages

def extract_spans_gpt(text, keyword):
    messages = [
        {
            'role': 'system',
            'content': """You are a keyword extractor. You extract spans from a paragraph that matches the keywords.
                The user will provide you a paragraph and a keywords to be matched.
                Note that the keyword may not appear exactly matching the text, but it should be semantically the same.
                Also, the keyword may appear multiple times in the paragraph.
                Reply with the following JSON format:
                    { 
                        "text": (string) the user provided keyword,
                        "spans": [
                            [
                                (int) the start index of the span,
                                (int) the end index of the span,
                            ],
                            [
                                (int) the start index of the span,
                                (int) the end index of the span,
                            ],
                            [
                                ... (more spans)
                            ]
                        ]
                    }
            """
        },
        {
            'role': 'user',
            'content': f'Paragraph: {text}\nKeywords: {keyword}'
        }
    ]
    return messages
    # response = request_gpt(messages, format="json")
    # return response

def transform_vispub(articles):
    res = []
    for article in articles:
        res.append({
            "id": "vis_" + str(article['id']),
            "summary": article['Abstract'],
            "content": article['Abstract'],
            "title": article['Title'],
            "date": article['Year'],
            "publication": article['Conference'],
            "event": {
                "title": article['Title'],
                "type": "publication",
                "participants": [
                    {
                        "entity_id": keyword,
                        "entity_title": keyword,
                        "raw_mention": keyword,
                        "entity_type": None
                    }
                    for keyword in article['keywords']
                ]
            }
        })
    return res


def main():
    start_time = time.time()
    api_key = open("../VisPub_api_key").read()
    client=OpenAI(api_key=api_key, timeout=30)
    parser = argparse.ArgumentParser(description='Disambiguate AuthorKeywords in VisPub dataset.')
    parser.add_argument("--spans", action="store_true", help="Also extract the mention spans in Abstract (optional)")
    args = vars(parser.parse_args())

    print("loading articles...")
    articles = json.load(open("data/raw/articles.json"))
    # articles = articles[:10]
    # collect keywords
    print("collecting keywords...")
    keywords = set()
    for article in articles:
        article_keywords = map(lambda k: k.strip().lower(), article['AuthorKeywords'].split(','))
        keywords.update(article_keywords)
    keywords = list(keywords)
    keyword_explanations = {}
    total = len(keywords)
    print("total keywords:", total)
    #
    # generate keyword explanations...
    #
    print("generating keyword explanations...")
    keyword_explanation_prompts = [explain_keyword_prompts(keyword) for keyword in keywords]
    keywords_explanations = multithread_prompts(client, keyword_explanation_prompts)
    keyword_explanation_done = time.time()
    keyword_explanation_time = keyword_explanation_done - start_time
    #
    # generate keyword embeddings...
    #
    print("generating keyword embeddings...")
    keyword_explanation_embeddings = multithread_embeddings(client, keywords_explanations)
    for index, keyword in enumerate(keywords):
        keyword_explanations[keyword] = {
            "keyword": keyword,
            "explanation": keywords_explanations[index],
            "embedding": keyword_explanation_embeddings[index]
        }
    print("saving keyword explanations to: data/result/server/keywords_explanations_embeddings.json")
    save_json(keyword_explanations, "data/result/server/keyword_explanations_embeddings.json")
    keyword_embeddings_done = time.time()
    keyword_embeddings_time = keyword_embeddings_done - keyword_explanation_done
    #
    # generate article embeddings...
    #
    print("generating article embeddings...")
    article_embeddings = {}
    article_contents = [article['Abstract'] for article in articles]
    article_content_embeddings = multithread_embeddings(client, article_contents)
    for index, article in enumerate(articles):
        article_embeddings[index] = {
            "doc_id": article['id'],
            "content": article['Abstract'],
            "embedding": article_content_embeddings[index]
        }
    print("saving article abstract embedding to: data/result/server/article_embeddings.json")
    save_json(article_embeddings, "data/result/server/article_embeddings.json")
    article_embeddings_done = time.time()
    article_embeddings_time = article_embeddings_done - keyword_embeddings_done

    #
    # disambiguate keywords
    #
    print("disambiguating keywords...")
    embeddings = [keyword['embedding'] for keyword in keyword_explanations.values()]
    print("calculating distance matrix...")
    D = distance_matrix(embeddings)
    print("clustering...")
    condensed_distances = D[np.triu_indices(len(D), k=1)]
    linkage_matrix = linkage(condensed_distances, method='single')
    threshold = 0.04
    clusters = fcluster(linkage_matrix, t=threshold, criterion='distance')
    result = {}
    for item, cluster in enumerate(clusters):
        if cluster not in result:
            result[cluster] = []
        result[cluster].append(item)
    final_result = list(result.values())
    print("formatting disambiguated keywords...")
    disambiguated_keywords = {}
    for index, group in enumerate(final_result):
        group_keywords = [keywords[index] for index in group]
        group_label = group_keywords[0]
        for keyword in group_keywords:
            disambiguated_keywords[keyword] = group_label
    print("saving disambiguated keywords to: data/result/keywords/disambiguated_keywords.json")
    save_json(disambiguated_keywords, 'data/result/keywords/disambiguated_keywords.json')
    disambiguation_done = time.time()
    disambiguation_time = disambiguation_done - article_embeddings_done

    #
    # save results
    #
    print("saving articles with disambiguated keywords...")
    keyword_disambiguation = json.load(open('data/result/keywords/disambiguated_keywords.json'))
    for article in articles:
        keywords = [keyword.lower().strip() for keyword in article['AuthorKeywords'].split(",")]
        disambiguated = [keyword_disambiguation[keyword] for keyword in keywords]
        article['keywords'] = disambiguated
    print("transforming data...")
    transformed = transform_vispub(articles)
    print("saving data... to data/result/linked/articles_w_keywords.json")
    save_json(transformed, 'data/result/linked/articles_w_keywords.json')

    # also extract spans using gpt
    if args['spans']:
        print("extracting spans...")
        articles_w_keywords = json.load(open("data/result/articles_w_keywords.json"))
        article_spans = {}
        extract_span_prompts = []
        span_ids = []
        for article in articles_w_keywords:
            keywords = article['keywords']
            abstract = article['Abstract']
            for keyword in keywords:
                extract_span_prompts.append(extract_spans_gpt(abstract, keyword))
                span_ids.append("vis_" + str(article['id']))
        spans = multithread_prompts(client, extract_span_prompts, format="json")
        for index, span in enumerate(spans):
            span['entity_id'] = span['text']
            span['entity_title'] = span['text']
            for mention in span['spans']:
                mention.append(span['text'])
            article_id = span_ids[index]
            if(article_id not in article_spans): article_spans[article_id] = []
            article_spans[article_id].append(span)
        print("saving spans to: data/result/server/article_participant_spans.json")
        save_json(article_spans, 'data/result/server/article_participant_spans.json')
                
    print("time taken:")
    print("keyword explanation:", keyword_explanation_time, " seconds")
    print("keyword embeddings:", keyword_embeddings_time, " seconds")
    print("article embeddings:", article_embeddings_time, " seconds")
    print("disambiguation:", disambiguation_time, " seconds")
    # 470.82923102378845  seconds
    # with rate limit error delay

if __name__ == "__main__":
    main()