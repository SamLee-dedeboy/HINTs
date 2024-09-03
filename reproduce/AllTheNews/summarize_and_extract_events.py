from openai import OpenAI, RateLimitError, APITimeoutError
import time
from json import JSONDecodeError
import json
import concurrent
from tqdm import tqdm
import tiktoken


def save_json(data, filepath=r"new_data.json"):
    with open(filepath, "w") as fp:
        json.dump(data, fp, indent=4, ensure_ascii=False)


def request_gpt(client, messages, model="gpt-3.5-turbo", format=None):
    try:
        if format == "json":
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.5,
                response_format={"type": "json_object"},
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


def multithread_prompts(
    client, prompts, model="gpt-3.5-turbo-0125", response_format=None
):
    l = len(prompts)
    with tqdm(total=l) as pbar:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=100)
        futures = [
            executor.submit(request_gpt, client, prompt, model, response_format)
            for prompt in prompts
        ]
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
        return client.embeddings.create(input=[text], model=model).data[0].embedding
    except Exception as e:
        print(text)
        print(e)


def extract_events_prompts_template(text):
    messages = [
        {
            "role": "system",
            "content": """
                You are an event extraction system. Please extract the event from user provided sentence.
                An 'event' should contain one or more 'participants', which are the major participants in the event,
                The events and participants should be human-readable.
                Reply with the following JSON format:
                    {{
                        "event": "event_name",
                        "participants": ["participant1", "participant2", ...]
                    }},
            """,
        },
        {"role": "user", "content": text},
    ]
    return messages
    # events = request_gpt(messages)
    # return events


def summarize_prompts_template(text):
    messages = [
        {
            "role": "system",
            "content": """You are an summarization system that summarizes the events that happened between the main characters of a news article.
            Describe the main events that happened around the main characters. 
            Try to summarize the article with no more than three sentences. """,
        },
        {"role": "user", "content": text},
    ]
    return messages


def explain_keyword_prompts(keyword):
    messages = [
        {
            "role": "system",
            "content": "You are an entity database for a journalist. You store all the descriptions of named entities, such as person/organization/location. The user will query the description of a named entity. Reply with a paragraph with no more than 100 words.",
        },
        {"role": "user", "content": "Give me a description of {}.".format(keyword)},
    ]
    return messages


def flatten(list_of_lists):
    return [item for sublist in list_of_lists for item in sublist]


def main():
    import os

    project_dir = os.path.dirname(os.path.abspath(__file__))
    relative_path = lambda x: os.path.join(project_dir, x)
    start_time = time.time()
    # api_key = open("../api_key").read()
    api_key = open(relative_path("../AllTheNews_api_key")).read()
    client = OpenAI(api_key=api_key, timeout=10)
    articles = json.load(open(relative_path("data/raw/articles.json")))
    keyword_descriptions = json.load(
        open(relative_path("data/result/keywords/keyword_explanations.json"))
    )
    keyword_descriptions = list(
        map(lambda k: (k["keyword"], k["explanation"]), keyword_descriptions.values())
    )
    # keyword_descriptions = keyword_descriptions[:10]
    keys = [k[0] for k in keyword_descriptions]
    explanations = [k[1] for k in keyword_descriptions]
    print("generating keyword embeddings...")
    keyword_explanation_embeddings = multithread_embeddings(client, explanations)
    keyword_description = {}
    for index, keyword in enumerate(keys):
        keyword_description[keyword] = {
            "keyword": keyword,
            "explanation": explanations[index],
            "embedding": keyword_explanation_embeddings[index],
        }
    print(
        "saving keyword explanations to: data/result/server/keyword_explanations_embeddings.json"
    )
    save_json(
        keyword_description,
        relative_path("data/result/server/keyword_explanations_embeddings.json"),
    )
    # articles = articles[:10]
    print("articles: ", len(articles))
    #
    # summarize
    #
    print("summarizing...")
    summarize_prompts = [
        summarize_prompts_template(article["content"]) for article in articles
    ]
    summaries = multithread_prompts(client, summarize_prompts)
    for i, article in enumerate(articles):
        article["summary"] = summaries[i]
    summarize_done = time.time()
    summarize_time = summarize_done - start_time
    save_json(articles, relative_path("data/result/summaries/articles.json"))
    #
    # extract keywords...
    #
    print("extracting keywords...")
    articles = json.load(open(relative_path("data/result/summaries/articles.json")))
    # articles = articles[:10]
    extract_events_prompts = [
        extract_events_prompts_template(article["summary"]) for article in articles
    ]
    events = multithread_prompts(client, extract_events_prompts, response_format="json")
    for i, article in enumerate(articles):
        article["events"] = events[i]
    save_json(articles, relative_path("data/result/keywords/articles.json"))
    # articles = json.load(open('data/result/keywords/articles.json'))
    # articles = articles[:10]
    participants = list(
        set(flatten([article["events"]["participants"] for article in articles]))
    )
    extract_keyword_done = time.time()
    extract_keyword_time = extract_keyword_done - summarize_done
    #
    # generate keyword explanations...
    #
    print("generating keyword explanations...")
    keyword_explanation_prompts = [
        explain_keyword_prompts(keyword) for keyword in participants
    ]
    keywords_explanations = multithread_prompts(client, keyword_explanation_prompts)
    keyword_description = {}
    for index, keyword in enumerate(participants):
        keyword_description[keyword] = {
            "keyword": keyword,
            "explanation": keywords_explanations[index],
        }
    save_json(
        keyword_description,
        relative_path("data/result/keywords/keyword_explanations.json"),
    )
    explain_keyword_done = time.time()
    explain_keyword_time = explain_keyword_done - extract_keyword_done
    #
    # generate keyword embeddings...
    #
    # keyword_descriptions = json.load(open('data/result/keywords/keyword_explanations.json'))
    keyword_descriptions = list(
        map(lambda k: (k["keyword"], k["explanation"]), keyword_descriptions.values())
    )
    # keyword_descriptions = keyword_descriptions[:10]
    keys = [k[0] for k in keyword_descriptions]
    explanations = [k[1] for k in keyword_descriptions]
    print("generating keyword embeddings...")
    keyword_explanation_embeddings = multithread_embeddings(client, explanations)
    keyword_description = {}
    for index, keyword in enumerate(keys):
        keyword_description[keyword] = {
            "keyword": keyword,
            "explanation": explanations[index],
            "embedding": keyword_explanation_embeddings[index],
        }
    print(
        "saving keyword explanations to: data/result/server/keyword_explanations_embeddings.json"
    )
    save_json(
        keyword_description,
        relative_path("data/result/server/keyword_explanations_embeddings.json"),
    )
    #
    # generate article embeddings...
    #
    print("generating article embeddings...")
    article_embeddings = {}
    article_contents = [article["summary"] for article in articles]
    article_content_embeddings = multithread_embeddings(client, article_contents)
    for index, article in enumerate(articles):
        article_embeddings[article["id"]] = {
            "doc_id": article["id"],
            "content": article["content"],
            "embedding": article_content_embeddings[index],
        }
    print(
        "saving article content embedding to: data/result/server/article_embeddings.json"
    )
    save_json(
        article_embeddings, relative_path("data/result/server/article_embeddings.json")
    )
    embedding_done = time.time()
    embedding_time = embedding_done - explain_keyword_done
    with open("log.txt", "w") as f:
        print("total articles: ", len(articles), file=f)
        print("total keywords:", len(participants), file=f)
        print("summarize time: ", summarize_time, file=f)
        print("extract keyword time: ", extract_keyword_time, file=f)
        print("explain keyword time: ", explain_keyword_time, file=f)
        print("embedding time: ", embedding_time, file=f)


if __name__ == "__main__":
    main()
