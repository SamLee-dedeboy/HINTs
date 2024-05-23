
from openai import OpenAI, RateLimitError, APITimeoutError
import time
from json import JSONDecodeError
import json
import concurrent
from tqdm import tqdm
import tiktoken


def save_json(data, filepath=r'new_data.json'):
    with open(filepath, 'w') as fp:
        json.dump(data, fp, indent=4, ensure_ascii=False)

def request_gpt(client, messages, model="gpt-3.5-turbo", format=None):
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
        # print(e)
        print("RateLimitError, waiting for 5 seconds...")
        time.sleep(5)
        return request_gpt(client, messages, model, format)
    except APITimeoutError as e:
        print(e)
        time.sleep(5)
        return request_gpt(client, messages, model, format)

def multithread_prompts(client, prompts, model="gpt-3.5-turbo-0125", response_format=None):
    l = len(prompts)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=100)
        futures = [executor.submit(request_gpt, client, prompt, model, response_format) for prompt in prompts]
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

def get_embedding(client, text, model="text-embedding-ada-002"):
    try:
        enc = tiktoken.encoding_for_model(model)
        while len(enc.encode(text)) > 8191:
            text = text[:-100]
        return client.embeddings.create(input = [text], model=model).data[0].embedding
    except Exception as e:
        print(text)
        print(e)
        return get_embedding(client, text, model)

def explain_keyword_prompts(keyword):
    if keyword == "": keyword = "null"
    messages = [
        { 
            'role': 'system',
            'content': 'You are an entity database for a journalist. You store all the descriptions of named entities, such as person/organization/location. The user will query the description of a named entity. Reply with a paragraph with no more than 100 words.'
        },
        {
            'role': 'user',
            "content": 'Give me a description of {}.'.format(keyword)
        }
    ]
    return messages

def flatten(list_of_lists):
    return [item for sublist in list_of_lists for item in sublist]

    # keyword_explanations = json.load(open("data/result/keywords/keyword_explanations.json"))
    # keyword_embeddings = json.load(open("data/result/server/keyword_explanations_embeddings.json"))
    # disambiguated_keywords = json.load(open("data/result/keywords/disambiguated_keywords.json"))
    # for keyword in keyword_explanations.keys():
    #     keyword = disambiguated_keywords[keyword] if keyword in disambiguated_keywords else keyword
    #     if keyword not in keyword_embeddings:
    #         print(keyword)
    # return

def generate_disambiguation(participants):
    disambiguation = {}
    for participant in participants.values():
        keyword_id = participant['id']
        keyword_title = participant['title']
        if keyword_id != keyword_title:
            disambiguation[keyword_title] = keyword_id
    return disambiguation
def main():
    start_time = time.time()
    # api_key = open("../api_key").read()
    api_key = open("../AllTheNews_api_key").read()
    client=OpenAI(api_key=api_key, timeout=10)
    # articles = json.load(open('data/result/linked/articles_w_keywords.json'))
    # participants = list(set(flatten([list(map(lambda p: p['entity_title'] if 'entity_title' in p else p['entity_word'], article['events']['participants'])) for article in articles ])))
    participants = json.load(open('data/result/network/entities.json'))
    disambiguated_keywords = generate_disambiguation(participants)
    # participants = [participant['title'] for participant in participants.values()]
    #
    # generate keyword explanations...
    #
    # print("generating keyword explanations...")
    # keyword_explanation_prompts = [explain_keyword_prompts(keyword) for keyword in participants]
    # keywords_explanations = multithread_prompts(client, keyword_explanation_prompts)
    # keyword_descriptions = {}
    # for index, keyword in enumerate(participants):
    #     keyword_descriptions[keyword] = {
    #         "keyword": keyword,
    #         "explanation": keywords_explanations[index],
    #     }
    # save_json(keyword_descriptions, "data/result/keywords/keyword_explanations.json")
    # return
    explain_keyword_done = time.time()
    explain_keyword_time = explain_keyword_done - start_time
    #
    # generate keyword embeddings...
    #
    keyword_descriptions = json.load(open('data/result/keywords/keyword_explanations.json'))
    keyword_descriptions = list(map(lambda k: (k['keyword'], k['explanation']), keyword_descriptions.values()))
    # keyword_descriptions = keyword_descriptions[:10]
    keys = [k[0] for k in keyword_descriptions]
    explanations = [k[1] for k in keyword_descriptions]
    print("generating keyword embeddings...")
    keyword_explanation_embeddings = multithread_embeddings(client, explanations)
    # disambiguated_keywords = json.load(open('data/result/keywords/disambiguated_keywords.json'))
    keyword_description = {}
    for index, keyword in enumerate(keys):
        keyword_id = disambiguated_keywords[keyword] if keyword in disambiguated_keywords else keyword
        keyword_description[keyword_id] = {
            "keyword": keyword,
            "explanation": explanations[index],
            "embedding": keyword_explanation_embeddings[index]
        }
    print("saving keyword explanations to: data/result/server/keyword_explanations_embeddings.json")
    save_json(keyword_description, "data/result/server/keyword_explanations_embeddings.json")
    return
    #
    # generate article embeddings...
    #
    print("generating article embeddings...")
    article_embeddings = {}
    article_list = list(articles.values())
    article_contents = [article['summary'] for article in article_list]
    article_content_embeddings = multithread_embeddings(client, article_contents)
    for index, article in enumerate(article_list):
        articles[article['id']]['embedding'] = article_content_embeddings[index]
    print("saving article content embedding to: data/result/server/article_embeddings.json")
    save_json(article_embeddings, "data/result/server/article_embeddings.json")
    embedding_done = time.time()
    embedding_time = embedding_done - explain_keyword_done
    with open('log.txt', 'w') as f:
        print("total articles: ", len(articles), file=f)
        print("total keywords:", len(participants), file=f)
        print("explain keyword time: ", explain_keyword_time, file=f)
        print("embedding time: ", embedding_time, file=f)

if __name__ == "__main__":
    main()